"""
ChatConsumer — AsyncWebSocketConsumer
=====================================
The primary real-time interface for the SmartMove Conversational AI.

Lifecycle:
    1. ``connect``  — Reads the pre-authenticated user from ``scope['user']``
                      (set by ``CookieJWTAuthMiddleware``), checks quota.
    2. ``receive``  — Accepts JSON or binary (audio) frames, orchestrates the
                      agent pipeline, and streams structured JSON back.
    3. ``disconnect`` — Cleans up channel-layer groups.

Security:
    • JWT is extracted from the ``access_token`` HttpOnly cookie by the
      ``CookieJWTAuthMiddleware`` in the ASGI stack — no query-string needed.
    • Prompt-injection filters run before the agent sees the input.
    • Every turn is audit-logged to ``ConversationAuditLog``.
"""

import json
import logging
import time
import uuid

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.conf import settings  # type: ignore[import-untyped]

from apps.users.models import User

from .models import ConversationAuditLog, UserQuota
from .security.prompt_injection import sanitize_input
from .services.react_agent import run_agent
from .services.semantic_cache import check_semantic_cache, store_in_cache

logger = logging.getLogger(__name__)


# Channel-layer group name for broadcasting system alerts to all admins.
# Used by the Currency Oracle, SOC runbooks, and the upload pipeline to
# push real-time "Red Toast" notifications to the frontend.
ADMIN_BROADCAST_GROUP = 'group_ADMIN'


class ChatConsumer(AsyncWebsocketConsumer):
    """
    Async WebSocket consumer for the SmartMove chatbot.

    Accepts:
        • JSON text frames:  ``{"message": "...", "type": "text"}``
        • Binary frames:     raw audio bytes (routed to Whisper for transcription)

    Sends:
        Structured JSON payloads streamed back to the client::

            {
                "type": "chat_response",
                "data": {
                    "text": "...",
                    "charts": [...],
                    "follow_up_chips": [...],
                    "model_used": "gemini-2.0-flash",
                    "tokens": {"prompt": 120, "completion": 84, "total": 204},
                    "cache_hit": false,
                    "session_id": "..."
                }
            }
    """

    # ── Connection Lifecycle ──────────────────────────────────────────────

    async def connect(self):
        """Authenticate via cookie-based JWT (injected by CookieJWTAuthMiddleware)."""
        self.session_id = str(uuid.uuid4())
        self.user = None
        self._in_admin_group = False

        # The CookieJWTAuthMiddleware already parsed the HttpOnly cookie and
        # attached the authenticated user (or AnonymousUser) to scope['user'].
        user = self.scope.get('user')

        if user is None or user.is_anonymous:
            logger.warning(
                'WebSocket connection rejected: unauthenticated (no valid cookie)',
                extra={'event': 'ws_auth_fail'},
            )
            await self.close(code=4001)
            return

        self.user = user
        self.user_role = user.role
        self.currency_preference = user.currency_preference_id or 'USD'

        await self.accept()

        # ── Join user-specific group for targeted events ──────────────────
        if self.channel_layer is not None:
            await self.channel_layer.group_add(  # type: ignore[union-attr]
                f'user_{self.user.pk}',
                self.channel_name,
            )

        # ── Join admin broadcast group if applicable ──────────────────────
        if self.user_role == 'ADMIN' and self.channel_layer is not None:
            await self.channel_layer.group_add(  # type: ignore[union-attr]
                ADMIN_BROADCAST_GROUP,
                self.channel_name,
            )
            self._in_admin_group = True
            logger.info(
                'Admin user joined broadcast group',
                extra={
                    'event': 'ws_admin_group_join',
                    'user_id': self.user.pk,
                    'group': ADMIN_BROADCAST_GROUP,
                },
            )

        # Send a welcome payload with quota info
        quota = await self._get_quota()
        remaining = max(
            0, quota.max_queries_per_day - quota.queries_used_today  # type: ignore[operator]
        )
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'data': {
                'session_id': self.session_id,
                'user_email': self.user.email,
                'role': self.user_role,
                'quota_remaining': remaining,
            },
        }))

        logger.info(
            f'WebSocket connected: {self.user.email}',
            extra={
                'event': 'ws_connected',
                'user_id': self.user.pk,
                'session_id': self.session_id,
            },
        )

    async def disconnect(self, code):
        """Leave admin broadcast group (if joined) and log disconnection."""
        # ── Leave user-specific group ─────────────────────────────────────
        if self.user and self.channel_layer is not None:
            await self.channel_layer.group_discard(  # type: ignore[union-attr]
                f'user_{self.user.pk}',
                self.channel_name,
            )

        # ── Leave admin broadcast group ───────────────────────────────────
        if self._in_admin_group and self.channel_layer is not None:
            await self.channel_layer.group_discard(  # type: ignore[union-attr]
                ADMIN_BROADCAST_GROUP,
                self.channel_name,
            )
            logger.debug(
                'Admin user left broadcast group',
                extra={
                    'event': 'ws_admin_group_leave',
                    'group': ADMIN_BROADCAST_GROUP,
                },
            )

        user_label = self.user.email if self.user else 'anonymous'
        logger.info(
            f'WebSocket disconnected: {user_label} (code={code})',
            extra={
                'event': 'ws_disconnected',
                'session_id': self.session_id,
                'close_code': code,
            },
        )

    # ── Message Handling ──────────────────────────────────────────────────

    async def receive(self, text_data=None, bytes_data=None):
        """
        Route incoming frames:
            • Binary → Save to Redis and queue Celery task for Whisper transcription
            • JSON text → agent pipeline directly
        """
        start_time = time.perf_counter()

        # ── 1. Handle binary (audio) frames ───────────────────────────────
        if bytes_data:
            import uuid
            from django.core.cache import cache
            from .tasks import process_audio_transcription
            
            try:
                cache_key = f"audio_bytes:{self.session_id}:{uuid.uuid4()}"
                # Save binary data to Redis
                await database_sync_to_async(cache.set)(cache_key, bytes_data, 3600)
                
                # Dispatch Celery task
                from asgiref.sync import sync_to_async
                def _dispatch():
                    process_audio_transcription.delay(  # type: ignore
                        cache_key=cache_key,
                        user_id=self.user.pk if self.user else None,
                        session_id=self.session_id,
                    )
                await sync_to_async(_dispatch)()
                
                # Notify the user
                await self.send(text_data=json.dumps({
                    'type': 'system_alert',
                    'data': {'message': 'Audio received. Transcription queued due to strict rate limits. Please wait...'},
                }))
                return
            except Exception as exc:
                logger.exception('Audio queueing failed')
                await self._send_error(f'Audio error: {exc}')
                return
        else:
            # ── 2. Parse JSON text frame ──────────────────────────────────
            if text_data is None:
                await self._send_error('No data received.')
                return
            try:
                payload = json.loads(text_data)
                user_message = payload.get('message', '').strip()
            except (json.JSONDecodeError, AttributeError):
                await self._send_error('Invalid JSON payload.')
                return

        await self.process_message(user_message, start_time)

    async def audio_transcription_ready(self, event: dict):
        """
        Invoked by the Celery worker when transcription completes.
        Resumes the standard agent pipeline with the transcribed text.
        """
        transcript = event.get('transcript')
        error = event.get('error')
        
        if error:
            await self._send_error(f'Transcription failed: {error}')
            return
            
        if not transcript:
            await self._send_error('Audio transcription returned empty.')
            return
            
        await self.process_message(transcript, time.perf_counter())

    async def process_message(self, user_message: str, start_time: float):
        """Core agent pipeline: Quota -> Sanitization -> Cache -> ReAct Agent."""
        if not user_message:
            await self._send_error('Empty message received.')
            return

        # ── 3. Quota gate ─────────────────────────────────────────────────
        # 3a. Redis-based Role Rate Limiting
        is_allowed, queries_used = await self._check_redis_rate_limit()
        if not is_allowed:
            await self.send(text_data=json.dumps({
                'type': 'quota_exceeded',
                'data': {
                    'message': 'You have reached your daily limit of 5 queries.',
                    'queries_used': queries_used,
                    'max_queries': 5,
                },
            }))
            return

        # 3b. DB-based Quota
        quota = await self._get_quota()
        has_remaining = await database_sync_to_async(quota.has_remaining)()
        if not has_remaining:
            await self.send(text_data=json.dumps({
                'type': 'quota_exceeded',
                'data': {
                    'message': (
                        'You have reached your daily query limit. '
                        'Please try again tomorrow or upgrade your plan.'
                    ),
                    'queries_used': quota.queries_used_today,
                    'max_queries': quota.max_queries_per_day,
                },
            }))
            return

        # ── 4. Prompt-injection sanitization ──────────────────────────────
        sanitized_message = sanitize_input(user_message)
        if sanitized_message is None:
            await self.send(text_data=json.dumps({
                'type': 'security_block',
                'data': {
                    'message': (
                        'Your message was flagged by our security system. '
                        'Please rephrase your question.'
                    ),
                },
            }))
            logger.warning(
                'Prompt injection blocked',
                extra={
                    'event': 'prompt_injection_blocked',
                    'user_id': self.user.pk if self.user else None,
                    'raw_input': user_message[:200],
                },
            )
            return

        # ── 5. Semantic cache check ───────────────────────────────────────
        from asgiref.sync import sync_to_async
        cached_response = await sync_to_async(check_semantic_cache)(sanitized_message)
        if cached_response:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            await self._send_response(
                text=cached_response['text'],
                charts=cached_response.get('charts', []),
                chips=cached_response.get('follow_up_chips', []),
                model_used='cache',
                tokens={'prompt': 0, 'completion': 0, 'total': 0},
                cache_hit=True,
                response_time_ms=elapsed_ms,
            )
            # Audit log (cache hit still counts as a query)
            await self._log_conversation(
                prompt=sanitized_message,
                response=cached_response['text'],
                model_used='cache',
                tokens={'prompt': 0, 'completion': 0, 'total': 0},
                response_time_ms=elapsed_ms,
                tools_invoked=[],
                cache_hit=True,
            )
            await database_sync_to_async(quota.increment)()
            return

        # ── 6. Run the ReAct agent ────────────────────────────────────────
        try:
            result = await run_agent(
                user_message=sanitized_message,
                user_role=self.user_role,
                currency=self.currency_preference,
                session_id=self.session_id,
                user_id=self.user.pk if self.user else None,
            )
        except Exception as exc:
            logger.exception('Agent execution failed')
            await self._send_error(f'Agent error: {exc}')
            return

        elapsed_ms = int((time.perf_counter() - start_time) * 1000)

        # ── 7. Stream response back to client ─────────────────────────────
        await self._send_response(
            text=result.get('text', ''),
            charts=result.get('charts', []),
            chips=result.get('follow_up_chips', []),
            model_used=result.get('model_used', 'unknown'),
            tokens=result.get('tokens', {}),
            cache_hit=False,
            response_time_ms=elapsed_ms,
        )

        # ── 8. Audit log & quota increment ────────────────────────────────
        await self._log_conversation(
            prompt=sanitized_message,
            response=result.get('text', ''),
            model_used=result.get('model_used', 'unknown'),
            tokens=result.get('tokens', {}),
            response_time_ms=elapsed_ms,
            tools_invoked=result.get('tools_invoked', []),
            cache_hit=False,
        )
        await database_sync_to_async(quota.increment)()
        
        # ── 9. Store in Semantic Cache ────────────────────────────────────
        # Only store successful queries to avoid poisoning the cache with errors
        if not result.get('text', '').startswith('Agent error:'):
            await sync_to_async(store_in_cache)(sanitized_message, result)

    # ── Private Helpers ───────────────────────────────────────────────────

    async def _send_response(
        self, *, text, charts, chips, model_used, tokens, cache_hit, response_time_ms
    ):
        """Send the structured chat response payload."""
        await self.send(text_data=json.dumps({
            'type': 'chat_response',
            'data': {
                'text': text,
                'charts': charts,
                'follow_up_chips': chips,
                'model_used': model_used,
                'tokens': tokens,
                'cache_hit': cache_hit,
                'response_time_ms': response_time_ms,
                'session_id': self.session_id,
            },
        }))

    async def _send_error(self, message: str):
        """Send an error frame to the client."""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'data': {'message': message},
        }))

    # ── Channel-Layer Group Handlers ──────────────────────────────────────

    async def force_disconnect(self, event: dict):
        """
        Receive a system-level broadcast from a signal to force disconnect this user.
        """
        await self.send(text_data=json.dumps({
            'type': 'system_alert',
            'data': {'message': 'Your session has been terminated or your permissions have changed.'},
        }))
        await self.close(code=4003)

    async def admin_notification(self, event: dict):
        """
        Receive a system-level broadcast from ``group_ADMIN`` and forward
        it to this admin's WebSocket as a ``system_alert`` frame.

        Expected event shape (sent via ``channel_layer.group_send``)::

            {
                "type": "admin.notification",
                "data": {
                    "level": "critical",
                    "title": "Import Failed",
                    "message": "...",
                },
            }
        """
        await self.send(text_data=json.dumps({
            'type': 'system_alert',
            'data': event.get('data', {}),
        }))

    @database_sync_to_async
    def _check_redis_rate_limit(self) -> tuple[bool, int]:
        """
        Check if a USER has exceeded their 5-queries-per-day Redis limit.
        Bypassed for DATA_ANALYST and ADMIN.
        Returns (is_allowed, queries_used_today).
        """
        if not self.user:
            return False, 0
            
        if self.user_role in ['DATA_ANALYST', 'ADMIN']:
            return True, 0
            
        from django.core.cache import cache
        import datetime
        today_str = datetime.date.today().isoformat()
        redis_key = f"chatbot_queries:{self.user.pk}:{today_str}"
        
        try:
            queries_today = cache.incr(redis_key)
        except ValueError:
            # Key doesn't exist yet
            cache.set(redis_key, 1, timeout=86400)
            queries_today = 1
            
        return queries_today <= 5, queries_today

    @database_sync_to_async
    def _get_quota(self) -> UserQuota:
        """Fetch or create the quota row for the current user."""
        return UserQuota.get_or_create_for_user(self.user)

    @database_sync_to_async
    def _log_conversation(
        self, *, prompt, response, model_used, tokens, response_time_ms,
        tools_invoked, cache_hit,
    ):
        """Persist an audit record for this turn."""
        ConversationAuditLog.objects.create(  # type: ignore[attr-defined]
            user=self.user,
            session_id=self.session_id,
            prompt=prompt,
            response=response,
            model_used=model_used,
            prompt_tokens=tokens.get('prompt', 0),
            completion_tokens=tokens.get('completion', 0),
            total_tokens=tokens.get('total', 0),
            response_time_ms=response_time_ms,
            tools_invoked=tools_invoked,
            cache_hit=cache_hit,
        )
