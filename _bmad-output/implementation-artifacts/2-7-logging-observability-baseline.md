# Story 2.7: Logging & Observability Baseline

Status: review

## Story

As a Developer,  
I want structured logging and basic observability for the data engine,  
so that rate limiting, polling, and adapters can be monitored and debugged.

## Acceptance Criteria

1. Main process logging is centralized behind a small helper (for example `src/main/services/logger.ts`) that wraps `electron-log` and emits structured entries with at least: `timestamp`, `level`, `context`, `operation`, `providerId`, `correlationId`, `durationMs`, and `errorCategory` (aligned with `_bmad-output/architecture.md#Error Handling, Logging, and Observability`); adapters, poller, and calculator all use this helper rather than calling `electron-log` directly.
2. Every external adapter call (`src/main/adapters/odds-api-io.ts`, `src/main/adapters/the-odds-api.ts`) and every poller tick (`src/main/services/poller.ts`) produces a single log entry per call/tick capturing success/failure, HTTP status (for adapters), durationMs, number of opportunities returned (where applicable), and relevant identifiers (providerId, correlationId).
3. The poller emits a lightweight heartbeat at a fixed interval (for example once per polling cycle) that records last successful fetch time, per-provider status summary, and overall system status in a structured log entry, suitable for driving the `SystemStatus` / `ProviderStatus` model described in `_bmad-output/architecture.md#Error Handling, Logging, and Observability`.
4. Logging utilities implement redaction for any value tagged or passed as `secret` (API keys, tokens, credentials) and a test or log-scrubbing check (for example `tests/2.7-logging-observability-baseline.test.cjs`) asserts that API keys and other secrets never appear in captured logs under normal operation, satisfying risk R-003 in `_bmad-output/test-design-system.md`.

## Tasks / Subtasks

- [x] Introduce a main-process logging helper wrapping `electron-log` (AC: #1, #4).  
  - [x] Implement `src/main/services/logger.ts` (or equivalent) with typed helpers such as `logInfo`, `logError`, and `logHeartbeat` that accept a structured payload including `context`, `operation`, `providerId`, `correlationId`, `durationMs`, and optional `errorCategory` (AC: #1).  
  - [x] Ensure the helper is the primary module that imports `electron-log` directly in the main process for data-engine logging (AC: #1, #4).
- [x] Instrument adapters with structured logging for external calls (AC: #1, #2).  
  - [x] Update `src/main/adapters/odds-api-io.ts` to log a single structured entry per provider call including request context, outcome (success/failure), HTTP status, durationMs, and number of opportunities mapped into `ArbitrageOpportunity[]` (AC: #2).  
  - [x] Update `src/main/adapters/the-odds-api.ts` to follow the same logging contract and reuse correlationIds propagated from the poller where available (AC: #2).
- [x] Instrument the poller with tick and heartbeat logging (AC: #2, #3).  
  - [x] Update `src/main/services/poller.ts` to log each polling tick with per-provider call counts, success/failure summary, durationMs, and derived `SystemStatus` / `ProviderStatus` where available (AC: #2, #3).  
  - [x] Emit a heartbeat log entry at a fixed interval that records last successful fetch time per provider and overall system health in the format described in `_bmad-output/architecture.md#Error Handling, Logging, and Observability` (AC: #3).
- [x] Implement log hygiene and tests for secret redaction (AC: #4).  
  - [x] Extend the logging helper with a simple redaction mechanism (for example marking fields as `secret` and masking them before writing the log line), ensuring API keys and other credentials never reach disk (AC: #4).  
  - [x] Add a log-scrubbing or snapshot-based test (for example `tests/2.7-logging-observability-baseline.test.cjs`) that exercises adapter and poller logging paths under representative scenarios and fails if any captured log output contains obvious secret patterns (API keys, tokens) (AC: #4).  
  - [x] Document log file location(s) and any basic troubleshooting steps in `_bmad-output/backlog.md` or an appropriate operations note, referencing the structured fields and heartbeat format (AC: #1, #3, #4).

## Dev Notes

- Logging must follow the structured fields and error-category model defined in `_bmad-output/architecture.md#Error Handling, Logging, and Observability`, using `context` values such as `"adapter:odds-api-io"`, `"adapter:the-odds-api"`, `"service:poller"`, and `"service:calculator"` so that events from the data engine can be filtered reliably.  
- Adapter and poller logs should capture metadata (providerId, correlationId, counts, durations) rather than full response payloads; odds data and arbitrage results should remain in memory and tests, not in logs, to keep files small and avoid leaking business-sensitive information.  
- Heartbeat entries from `poller.ts` should be shaped so they can later feed the `SystemStatus` / `ProviderStatus` state model used by the dashboard (see `_bmad-output/architecture.md#UX Error and Degraded States`), but this story focuses on getting the logging foundation in place rather than wiring the full UI.  
- Log hygiene must align with security guidance in `_bmad-output/prd.md` (NFR4 �?" Data Privacy) and with risk R-003 in `_bmad-output/test-design-system.md`, ensuring that API keys and credentials are never written to disk and that tests will fail if log output contains secrets.

### Project Structure Notes

- Main-process logging utilities should live under `src/main/services/` and follow the naming patterns in `_bmad-output/architecture.md#Implementation Patterns` (for example `logger.ts`), keeping adapter files (`src/main/adapters/*.ts`) focused on provider-specific logic.  
- Any new tests added for this story should live alongside existing Epic 2 tests under `tests/` and use the same `node --test` runner setup described in `_bmad-output/test-design-system.md`, avoiding new test frameworks or runners.  
- Future UI work that surfaces log or heartbeat information should live under `renderer/src/features/dashboard/**` and reuse existing Zustand stores and status types rather than introducing parallel state.

### Learnings from Previous Story (2.6 �?" Golden Dataset & Arbitrage Correctness Tests)

- Story 2.6 introduced the `GoldenOddsSnapshot` model and `calculateArbitrageFromSnapshots` pure entry point in `src/main/services/calculator.ts`, together with golden fixtures and P0/P1 tests that enforce R-002 invariants (`roi >= 0`, distinct bookmakers, implied probability bounds) [Source: _bmad-output/implementation-artifacts/2-6-golden-dataset-arbitrage-correctness-tests.md]. For this story, any logging added around calculator functions must treat them as pure, test-focused units and avoid coupling log formatting to internal calculation details that are already validated via tests.  
- The previous story's Dev Agent Record emphasizes reusing golden fixtures and shared helpers across adapter tests instead of duplicating inline odds samples [Source: _bmad-output/test-design-system.md#R-002: Arbitrage Calculation Correctness]. When instrumenting adapters and the poller with logging in this story, prefer logging high-level metrics (counts, durations, providerIds) while continuing to rely on the existing golden dataset tests for detailed numerical correctness.  
- Story 2.6 noted potential future value in surfacing provider-level metrics and invariants for operational visibility. The structured logging and heartbeat work in this story should lay the groundwork for that by ensuring that per-provider status, counts, and timing information are consistently recorded in logs and can later be consumed by dashboards or external tooling without changing calculator or adapter interfaces.

## Dev Agent Record

### Context Reference

- _bmad-output/implementation-artifacts/2-7-logging-observability-baseline.context.xml

### Agent Model Used

BMAD Scrum Master (*create-story* workflow via Codex CLI / GPT-5.1)

### Debug Log References

- [x] `npm test` (node --test) with new logging tests: `tests/2.7-logging-observability-baseline.test.cjs` (AC: #4).  
- [ ] One unrelated integration test currently failing: `tests/1.3-int-provider-settings.test.cjs` ([P1][1.3-INT-002]) due to active provider default mismatch; left as known issue outside Story 2.7 scope.

### Completion Notes List

- Implemented `src/main/services/logger.ts` to centralize main-process structured logging for the data engine, with helpers (`logInfo`, `logWarn`, `logError`, `logHeartbeat`) emitting fields aligned to `_bmad-output/architecture.md#Error Handling, Logging, and Observability` (timestamp, level, context, operation, providerId, correlationId, durationMs, errorCategory) (AC: #1).  
- Updated `src/main/adapters/odds-api-io.ts` and `src/main/adapters/the-odds-api.ts` to log one structured `adapter.call` event per external HTTP request, capturing success/failure, HTTP status, durationMs, opportunitiesCount, providerId, and correlationId (propagated from the poller when available) while avoiding logging full URLs with API keys (AC: #1, #2, #4).  
- Extended `src/main/services/poller.ts` to log `poller.heartbeat` entries on each polling tick, including per-provider quota status, lastSuccessfulFetchTimestamps, derived SystemStatus (`OK` / `Degraded` / `Error` / `Stale`), and tick durations, forming the basis for future `SystemStatus` / `ProviderStatus` surfaces in the dashboard (AC: #2, #3).  
- Added secret-redaction logic to the logger (field-name based redaction plus explicit `secret(...)` tagging) and a dedicated log-scrubbing test (`tests/2.7-logging-observability-baseline.test.cjs`) that asserts API keys never appear in captured logs under normal operation for either provider (AC: #4, R-003).  
- Documented log locations and troubleshooting pointers in `_bmad-output/backlog.md` backlog entry for Story 2.7, referencing structured fields and heartbeat patterns for operational follow-up (AC: #1, #3, #4).  
 - Aligned the rate-limit calibration harness (`src/main/services/calibration.ts`) with the central structured logger, ensuring calibration metrics and errors use the same `context`/`operation` schema and that request error logs avoid emitting raw upstream HTTP bodies or secrets (AC: #1, #4, supports Story 2.3).

### File List

- src/main/services/logger.ts  
- src/main/services/poller.ts  
- src/main/adapters/base.ts  
- src/main/adapters/odds-api-io.ts  
- src/main/adapters/the-odds-api.ts  
- src/main/services/calibration.ts  
- tests/2.7-logging-observability-baseline.test.cjs  
- _bmad-output/backlog.md  
- _bmad-output/implementation-artifacts/2-7-logging-observability-baseline.md  

## Change Log

- Initial draft of Story 2.7 created by BMAD *create-story* workflow (Status: drafted, Date: 2025-11-21).
- Story context XML generated for Story 2.7 and status moved to ready-for-dev by BMAD *story-context* workflow (Date: 2025-11-21).
- Implemented structured logging helper, adapter and poller instrumentation, and log-scrubbing tests for Story 2.7, preparing logging and heartbeat data for future dashboard consumption (Status: review, Date: 2025-11-21).
- Updated calibration harness logging to route through the structured logger and emit status-based error messages, eliminating direct `electron-log` usage and reducing risk of leaking upstream error bodies in main-process logs (Status: review, Date: 2025-11-21).

## Senior Developer Review (AI)

- Outcome: Approved with follow-up applied. Calibration harness now uses the same structured logging helper as adapters and poller, and request error logs are normalised to status-based messages, aligning with AC #1/#4 and reducing the chance of secret leakage from upstream providers.
- Evidence:
  - Central logger import ownership: `src/main/services/logger.ts` is the only main-process module that imports `electron-log` for the data engine; calibration now depends on `logInfo`/`logWarn`/`logError` instead (`src/main/services/calibration.ts`).
  - Secret hygiene: `tests/2.7-logging-observability-baseline.test.cjs` verifies that adapter and poller logs never include API keys, and calibration error messages no longer incorporate raw upstream bodies.
  - Structured observability: `src/main/services/poller.ts` `poller.heartbeat` payloads and calibration `calibration.metrics` logs share the same field conventions (`context`, `operation`, `providerId`, `correlationId`, `durationMs`, `errorCategory`), ready to back future `SystemStatus`/`ProviderStatus` UI work.
