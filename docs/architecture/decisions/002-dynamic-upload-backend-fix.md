# 002 - Dynamic Upload Backend Fixes

Date: 2026-05-18

## Goal
Enable SmartMove Cloud/Admin dynamic uploads to work with the existing frontend payloads while keeping authentication intact.

## Changes Made

### 1) Upload endpoints allow cookie auth without CSRF enforcement
- File: backend/apps/authentication/authenticate.py
- Added: `CookieJWTAuthenticationNoCSRF`
- Purpose: The upload endpoints currently use cookie-based JWT and the frontend does not send an `X-CSRFToken` header. This variant keeps JWT auth but skips CSRF enforcement for those endpoints only.

### 2) Upload SAS token request accepts `file_name` or `filename`
- File: backend/apps/upload/serializers.py
- Added: optional `file_name` and validation to normalize to `filename`
- Purpose: Frontend sends `file_name`, backend previously required `filename`.

### 3) Register upload accepts `blob_url` or `blob_name`
- File: backend/apps/upload/views.py
- Added: `blob_name` and `file_name` fallbacks
- Purpose: Frontend sends `blob_name` + `file_name`, backend previously required `blob_url`.

### 4) Upload endpoints use the no-CSRF cookie auth
- File: backend/apps/upload/views.py
- Updated: `GenerateSASTokenView` and `RegisterUploadView` to use `authentication_classes = [CookieJWTAuthenticationNoCSRF]`
- Purpose: Avoid CSRF failures for these endpoints while still requiring authenticated users.

### 5) CSRF bootstrap endpoint added
- File: backend/apps/authentication/views.py
- File: backend/apps/authentication/urls.py
- Added: `CsrfCookieView` at `/api/auth/csrf/`
- Purpose: Set the `csrftoken` cookie so frontend POST requests can pass CSRF checks.

### 6) AI Analysis Workspace Synthesis & Telemetry APIs
- File: backend/apps/analytics_pro_engine/views.py
- File: backend/apps/analytics_pro_engine/urls.py
- File: backend/config/urls.py
- Added: `AnalyzeWorkspaceView` POST endpoint (`/api/engine/analyze/`), `AnalyzeStatusView` GET endpoint (`/api/engine/analyze/status/<uuid:workspace_id>/`), and configuration route wiring `/api/engine/`.
- Purpose: Group selected database upload file nodes into an `AnalysisWorkspace` record, invoke the background Celery task `generate_ai_dashboard` to synthesize predictions, and generate highly-secure presigned S3/MinIO URLs for high-performance dashboard JSON retrieval.

### 7) Chatbot WebSocket Cookie Authentication & Host Match
- File: frontend/components/chatbot/ChatbotWidget.tsx
- Updated: `getWsBaseUrl()` to preserve the domain host (e.g. `localhost` vs `127.0.0.1`) exactly as defined in `API_BASE_URL`.
- Purpose: Prevent domain cross-origin cookie-blocking. Without this, the browser was trying to send a cookie registered under `localhost` to a WebSocket url at `127.0.0.1`, which caused the browser to strip the cookie header and resulted in unauthenticated WebSocket upgrade attempts.

### 8) Chatbot Async Database Query Operation Fixed
- File: backend/apps/chatbot/consumers.py
- Updated: Accessing `user.currency_preference_id` instead of `user.currency_preference`.
- Purpose: Prevent `SynchronousOnlyOperation` exception inside the async connect lifecycle by resolving the foreign key locally using the preloaded database column rather than triggering a new synchronous database connection.

## Security Notes
- CSRF is intentionally skipped only for `/api/upload/sas-token/` and `/api/upload/register/`.
- These endpoints still require authentication and role-based authorization (`IsSmartMoveAdmin`).
- If the frontend is updated to send CSRF tokens, these endpoints can be switched back to `CookieJWTAuthentication`.
- AI analysis triggers and telemetry check-ins are secured with strict user authentication checks (`permission_classes = [IsAuthenticated]`) to restrict workspace access exclusively to the owning user.
- Chatbot WebSocket channels are secured via HttpOnly cookie parsing in `CookieJWTAuthMiddleware` ensuring that session tokens are never exposed to client-side scripts.

## Follow-ups (Optional)
- Ensure the frontend calls `/api/auth/csrf/` before POST requests in new flows.
- Consider logging the request payload shape for upload flows for easier support.
- Maintain real-time monitoring of Celery background worker tasks for dataset synthesis analytics.
