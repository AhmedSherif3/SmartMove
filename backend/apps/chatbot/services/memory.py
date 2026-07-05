"""
Redis-backed Conversation Memory (5-turn window)
=================================================
Stores the last 5 human/AI message pairs per session in Redis,
providing short-term context to the LangChain agent without
bloating the LLM context window.
"""

import json
import logging

from django.core.cache import cache
from langchain_core.messages import AIMessage, HumanMessage

logger = logging.getLogger(__name__)

MEMORY_TTL_SECONDS = 3600  # 1 hour
MAX_TURNS = 5
CACHE_KEY_PREFIX = 'chatbot:memory:'


def _cache_key(session_id: str) -> str:
    return f'{CACHE_KEY_PREFIX}{session_id}'


def get_chat_history(session_id: str) -> list:
    """
    Retrieve the conversation history as LangChain message objects.

    Returns:
        List of ``HumanMessage`` / ``AIMessage`` objects (max 10 messages = 5 turns).
    """
    raw = cache.get(_cache_key(session_id))
    if not raw:
        return []

    try:
        turns = json.loads(raw) if isinstance(raw, str) else raw
    except (json.JSONDecodeError, TypeError):
        logger.warning(f'Corrupt memory for session {session_id}, resetting')
        cache.delete(_cache_key(session_id))
        return []

    messages = []
    for turn in turns:
        messages.append(HumanMessage(content=turn.get('human', '')))
        messages.append(AIMessage(content=turn.get('ai', '')))
    return messages


def save_turn(session_id: str, human_msg: str, ai_msg: str) -> None:
    """
    Append a human/AI turn to the session memory, enforcing the 5-turn window.
    """
    raw = cache.get(_cache_key(session_id))
    try:
        turns = json.loads(raw) if isinstance(raw, str) else (raw or [])
    except (json.JSONDecodeError, TypeError):
        turns = []

    turns.append({'human': human_msg, 'ai': ai_msg})

    # Enforce sliding window
    if len(turns) > MAX_TURNS:
        turns = turns[-MAX_TURNS:]

    cache.set(_cache_key(session_id), json.dumps(turns), timeout=MEMORY_TTL_SECONDS)


def clear_memory(session_id: str) -> None:
    """Explicitly delete the memory for a session."""
    cache.delete(_cache_key(session_id))
