# SmartMove Backend: State of the Union & Architecture Audit

This document provides a comprehensive, component-by-component security and technical audit of the SmartMove monorepo backend, evaluating it against the Master Technical Specification for enterprise-grade production readiness.

## 1. Executive Summary

The SmartMove backend architecture demonstrates a high degree of maturity, with robust implementations of core services including JWT cookie-based authentication, highly optimized chunked data processing, distributed FinOps/Currency locking, and a well-structured SOC/Monitoring suite. Type-safety via Pyright is strictly adhered to using explicit type annotations and targeted ignore pragmas. 

However, critical gaps remain in the WebSocket routing infrastructure, observability middleware configuration, and some ML pipeline deployment stubs that prevent the platform from achieving immediate cloud-readiness.

**Overall Completion Assessment: 85% Cloud-Ready**

---

## 2. Component-by-Component Audit

### Part 1: Authentication & Users (Apps: `authentication`, `users`)
- **Status:** **Secure & Stable**
- **Architecture:** `CustomUser` correctly drops `username` for `email` as the PK. Roles (USER, DATA_ANALYST, ADMIN) and Regions are properly enforced.
- **Security:** `CookieJWTAuthentication` implements conditional CSRF validation effectively—bypassing for auth headers but strictly enforcing for `HttpOnly` cookies. OTP logic is robust. Audit logging tracks login actions properly.
- **Permissions:** Unauthenticated requests are correctly handled by custom permission classes (`IsSmartMoveAdmin`, `IsAnalystOrAbove`), returning `False` instead of erroring, preventing unauthorized data leakage.

### Part 2: Integrations & Uploads (Apps: `integrations`, `upload`)
- **Status:** **Robustly Optimized**
- **Architecture:** The Celery-based data pipeline (`process_data_import` task) efficiently streams large Azure blobs directly to memory using chunked reads, avoiding RAM saturation. Heartbeat maintenance checks and zombie sweepers (`sweep_zombie_imports`) operate correctly.
- **Security:** Scoped, write-only SAS tokens are restricted to 15-minute windows and tied strictly to regional containers, minimizing attack surface. The Dead Letter Queue (DLQ) efficiently captures malformed rows without crashing the pipeline.

### Part 3: Security Observability Command Center (SOC) (App: `monitoring`)
- **Status:** **Implemented but Configuration Pending**
- **Architecture:** Alertmanager webhook receivers successfully parse payloads and dispatch runbooks dynamically from `RUNBOOK_REGISTRY`. Self-healing actions are fully tracked via `SelfHealingLog` (immutable audit). 
- **Security:** Custom Prometheus metrics (`openai_tokens_total`, `self_healing_actions_total`) are correctly registered. However, the Webhook receiver operates with `AllowAny` permission—relies on IP-whitelisting (via Docker networking or reverse proxy) which needs to be explicitly configured in the production deployment infrastructure.

### Part 4: Conversational AI (App: `chatbot`)
- **Status:** **Strong Guardrails, WebSocket Config Gap**
- **Architecture:** Multi-model ReAct agent properly wired. Security guardrails (Prompt Injection sanitization, Regex-based SQL filtering blocking DDL/DML) are correctly applied to `sql_query_tool`. 
- **Security:** Quotas are robustly managed. However, a potential gap exists in the broadcast mechanics. While `group_ADMIN` is intended to broadcast system alerts to the Red Toast notification on the frontend, there is no explicit `group_add` for admins in `ChatConsumer.connect()`. The consumer parses JWTs from the query string (as expected for WS), but fails to place admin users into a broadcast group to receive system-wide notifications.

### Part 5: Currency Engine (App: `currency`)
- **Status:** **Enterprise-Grade**
- **Architecture:** Implements high-precision `Decimal` calculations to prevent float drift. The Celery Consensus Oracle fetches from 3 providers, filters poisoned data (>2% deviation), detects anomalies (>5% shift), and caches to Redis with a 48h TTL. Distributed locks (`lock:currency_oracle`) successfully prevent concurrent execution.
- **Security:** Graceful fallbacks applied throughout. Database operations are atomic.

### Part 6: Predictions & ML Pipeline (App: `predictions`, `pipeline/ml`)
- **Status:** **Architecturally Sound, Live Inference Pending**
- **Architecture:** Unmanaged Django models map cleanly to the Airflow-owned `fact_forecasts` table. Role-Based Access Control (RBAC) is properly implemented in `ForecastAPIView` to restrict horizon visibility (36 months for Users, 120 for Analysts/Admins). 
- **Security:** ML models correctly incorporate `exchange_rate` regressors. However, the `run_live_what_if_scenario` service in `apps/predictions/services/inference.py` is currently a mocked stub.

---

## 3. Prioritized Vulnerabilities & Logic Gaps

> [!WARNING]
> **1. WebSocket Admin Broadcast Group Missing**
> The frontend relies on real-time "Red Toast" notifications broadcasted to the `group_ADMIN` channel layer group. The `ChatConsumer` authenticates admins but never adds them to this group via `self.channel_layer.group_add('group_ADMIN', self.channel_name)`. System alerts currently have no active listeners.

> [!IMPORTANT]
> **2. OpenTelemetry Configuration Drift**
> `base.py` implements OpenTelemetry tracing, but depends on an environment variable `OTEL_EXPORTER_OTLP_ENDPOINT` pointing to a `<COMMAND_CENTER_IP>`. If this network route drops, synchronous export could block requests if `BatchSpanProcessor` timeouts aren't tuned correctly for production.

> [!CAUTION]
> **3. Alertmanager Webhook Security**
> The `/api/monitoring/webhook/alertmanager/` endpoint runs with `AllowAny`. While designed for machine-to-machine communication, a bad actor could trigger self-healing runbooks (like cache flushes or pod restarts) if the endpoint is exposed to the public internet.

---

## 4. Top-3 Immediate Action Plan

To finalize cloud-readiness and close the identified gaps, the following actions must be taken immediately:

1. **Fix WebSocket Routing:** Update `ChatConsumer.connect()` to detect the `ADMIN` role and explicitly add the `self.channel_name` to the `group_ADMIN` channel layer group to restore the notification pipeline.
2. **Secure the SOC Webhook:** Implement a Shared Secret Token header requirement for the Alertmanager Webhook Receiver to ensure only authorized Prometheus/Alertmanager instances can trigger runbooks, closing the `AllowAny` vulnerability.
3. **Implement Live Model Inference:** Replace the mocked stub in `apps/predictions/services/inference.py` with the actual Azure Blob download and Prophet inference logic, leveraging the correctly scaffolded `_build_future_df` logic from the data pipeline.
