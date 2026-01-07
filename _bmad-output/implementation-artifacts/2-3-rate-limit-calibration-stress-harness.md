# Story 2.3: Rate Limit Calibration & Stress Harness

Status: done

## Story

As a Developer,
I want a calibration/stress mode for the poller and adapters,
so that we can tune Bottleneck settings and verify quotas are respected under load.

## Acceptance Criteria

1. A dedicated calibration command (for example `npm run calibrate:providers`) runs a bounded-duration polling loop that reuses the existing poller and provider adapters against non-production/test providers, without requiring code changes or manual reconfiguration, in line with the calibration patterns described in `_bmad-output/architecture.md` ("Rate Limiting (R-001, NFR1)", calibration mode).
2. For each provider, calibration runs emit structured metrics via `electron-log` (or equivalent): total request count, 2xx/4xx/5xx/429 counts, average and percentile latency, and backoff/cooldown events, so that limiter behavior can be understood and tuned from logs as described in `_bmad-output/prd.md` (FR8, NFR1) and `_bmad-output/architecture.md` (rate limiting and observability).
3. Under calibration runs configured with the current `RateLimiterConfig`, no provider exceeds its documented quota from `_bmad-output/prd.md` (FR8/NFR1, 5,000 req/hour); violations are detected by assertions or test failures, and calibration output clearly reports any configuration that risks quota breaches.
4. The calibration harness can be invoked from CI (for example via a `npm test:calibrate` or similar scripted entrypoint) and returns a clear pass/fail result based on quotas and metrics, so it can be wired into automated checks without flakiness or manual log inspection.
5. Behavior around HTTP 429 and related rate-limit responses during calibration runs matches the error contract and backoff semantics from Story 2.2: adapters surface 429 as errors with status metadata, the poller applies backoff and `ProviderQuotaStatus` updates, and the Epic 2 backlog items dated 2025-11-21 for Story 2.2 (TechDebt/Test in `_bmad-output/backlog.md`) are addressed as part of this story.

## Tasks / Subtasks

- [x] Design the calibration harness flow and configuration (AC: #1).
  - [x] Decide how calibration mode is invoked (CLI script, Node test, or both) and how to pass provider selection, duration, and intensity parameters without duplicating configuration logic (AC: #1, #4).
  - [x] Ensure calibration mode reuses the existing poller, adapters, and `RateLimiterConfig` instead of creating a separate ad-hoc limiter path (AC: #1, #3).
- [x] Implement the calibration loop and metrics collection (AC: #1, #2).
  - [x] Add a bounded-duration polling loop that drives the poller against test/safe providers and records per-provider request/response events (AC: #1, #2).
  - [x] Capture structured metrics per provider (request counts, 2xx/4xx/5xx/429 counts, latency distribution, backoff events) and log them in a format suitable for both human and automated analysis (AC: #2).
- [x] Enforce quota invariants and rate-limit contracts (AC: #3, #5).
  - [x] Implement checks that ensure no provider exceeds the documented 5,000 req/hour quota under calibration scenarios derived from `_bmad-output/prd.md` and R-001 (AC: #3).
  - [x] Document and, where feasible, enforce the contract that provider adapters surface HTTP 429 responses as thrown errors with status metadata so poller backoff and `ProviderQuotaStatus` handling are consistently exercised (AC: #5; closes TechDebt item for Story 2.2 in `_bmad-output/backlog.md`).
- [x] Wire calibration into CI and automated tests (AC: #4, #5).
  - [x] Provide a CI-friendly entrypoint (script or test) that runs calibration in a bounded, deterministic way and fails when quotas or 429-handling expectations are violated (AC: #3, #4, #5).
  - [x] Extend rate limiter tests or the calibration harness itself to run sustained synthetic polling per provider and assert zero unexpected 429 responses under the configured quotas, aligning with the Test backlog item for Story 2.2 and `_bmad-output/test-design-system.md` (AC: #3, #5).

## Dev Notes

- This story introduces the calibration/stress harness described in `_bmad-output/epics.md` (Epic 2, Story 2.3) and `_bmad-output/architecture.md` ("Rate Limiting (R-001, NFR1)", calibration and stress patterns), using the existing centralized `RateLimiterConfig` in `src/main/services/poller.ts` rather than adding new ad-hoc throttle logic.
- Calibration runs must operate against safe/test providers or controlled environments, using configuration that makes it impossible to accidentally execute high-volume traffic against production-only endpoints.
- Metrics and logs produced by calibration runs should be sufficient for a developer to tune limiter settings (e.g. `minTime`, `maxConcurrent`, reservoir size) without modifying core limiter code, and should directly support the PRD goal of "Zero 429 errors under normal use" (FR8, NFR1).
- Calibration behavior must respect the architectural separation between polling/limiting and pure calculation: `poller.ts` remains the owner of rate limiting and scheduling, while `calculator.ts` and the `ArbitrageOpportunity` model remain purely computational.
- Where possible, this story should close or reduce Epic 2 backlog items related to rate limiting and calibration, especially those capturing TechDebt and Test follow-ups from Story 2.2.

### Learnings from Previous Story (2.2 -- Rate Limiter Implementation)

- Story 2.2 centralized `bottleneck` configuration and rate limiting in `src/main/services/poller.ts` and established `ProviderQuotaStatus` as the mechanism for signaling quota-related states; calibration must treat the poller and adapters as the single gateway for rate-limited I/O and avoid introducing alternate HTTP paths.
- The previous story introduced structured logging and backoff handling for 429 responses; calibration runs should generate scenarios that exercise these code paths and confirm that backoff, queue flushing, and status updates behave as expected under sustained load.
- Action items from Story 2.2 (`_bmad-output/backlog.md`, dated 2025-11-21) identify the need to formalize the 429 error contract and extend tests for longer-duration, quota-respecting polling; this calibration harness is the natural place to implement those follow-ups.
- Dev Notes and change logs from Stories 2.1 and 2.2 emphasize keeping adapters under `src/main/adapters/**` and rate limiting in `src/main/services/poller.ts`; calibration should build on that structure, not modify adapter responsibilities or the `ArbitrageOpportunity` data model.
- [Source: _bmad-output/implementation-artifacts/2-2-rate-limiter-implementation.md#Dev-Notes]

### Project Structure Notes

- Keep calibration-related orchestration close to the existing poller and limiter logic (for example in `src/main/services/poller.ts` or a dedicated `src/main/services/calibration.ts`) so rate-limiting behavior remains centralized and discoverable.
- Any new commands or scripts for calibration (e.g. `npm run calibrate:providers`, `npm test:calibrate`) should be added to `package.json` with clear naming and documentation, and should avoid hard-coding provider IDs or secrets.
- Tests and harness code for calibration should live under `tests/` using a clear naming convention (for example `2.3-rate-limit-calibration-stress-harness.test.cjs` or `.test.ts`), alongside existing Epic 2 tests to keep high-risk rate-limiting behavior easy to verify.

### References

- PRD: `_bmad-output/prd.md` (FR8 "API rate limiting", NFR1 performance constraints, request quota details).
- Architecture: `_bmad-output/architecture.md` ("Rate Limiting (R-001, NFR1)", calibration and stress patterns, "UX Error and Degraded States").
- Epics: `_bmad-output/epics.md` (Epic 2, Story 2.3 -- Rate Limit Calibration & Stress Harness).
- Test Design: `_bmad-output/test-design-system.md` (Risk R-001 scenarios around rate limiting and stress behavior).
- Backlog: `_bmad-output/backlog.md` entries for Story 2.2 (TechDebt and Test follow-ups dated 2025-11-21, targeted for closure by this calibration harness).
- Prior Stories: `_bmad-output/implementation-artifacts/2-1-adapter-pattern-shared-types.md`, `_bmad-output/implementation-artifacts/2-2-rate-limiter-implementation.md` (adapter contract, centralized rate limiter, and existing test patterns).

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->
- _bmad-output/implementation-artifacts/2-3-rate-limit-calibration-stress-harness.context.xml

### Agent Model Used

BMAD Scrum Master (*create-story* workflow via Codex)

### Debug Log References

- `src/main/services/calibration.ts`: `runCalibration`/CLI entrypoint uses `poller.ts` + Bottleneck to drive bounded-duration calibration loops per provider (AC: #1, #2, #3).
- `tests/2.3-rate-limit-calibration-stress-harness.test.cjs`: P0 calibration and quota tests exercise the harness, central limiter, and adapter 429 contract (AC: #2, #3, #4, #5).
- `package.json`: `calibrate:providers` and `test:calibrate` scripts wire calibration into local runs and CI-friendly checks (AC: #1, #4).

### Completion Notes List

- Implemented a centralized calibration harness that reuses `src/main/services/poller.ts` and the existing provider adapters, exposes a CLI entrypoint (`npm run calibrate:providers`), emits structured per-provider metrics via `electron-log`, enforces PRD FR8/NFR1 quota invariants using `RateLimiterConfig`, and adds P0 calibration/429 contract tests plus backlog closures for Story 2.2 (AC: #1, #2, #3, #4, #5).

### File List

- Implementation:
  - `src/main/services/calibration.ts`
  - `src/main/services/poller.ts`
  - `src/main/adapters/base.ts`
- Tests:
  - `tests/2.3-rate-limit-calibration-stress-harness.test.cjs`
  - `tests/2.2-rate-limiter-implementation.test.cjs`
- Configuration / wiring:
  - `package.json` (adds `calibrate:providers` and `test:calibrate` scripts)
  - `_bmad-output/backlog.md` (closes 2.2 TechDebt/Test backlog items tied to 429 contract and quota calibration)

## Change Log

- Initial draft created from PRD, architecture, test design, epics, and backlog inputs for Epic 2, Story 2.3 (Rate Limit Calibration & Stress Harness); no implementation work had been performed yet.
- Implemented calibration harness service, CLI entrypoints, and P0 calibration/429-contract tests, and closed the Story 2.2 backlog items for 429 error contracts and quota-focused calibration tests (2025-11-21).

## Senior Developer Review (AI)

- Outcome: Approve (story meets AC #1–#5; status set to `done`).
- AC #1 (bounded calibration command reusing poller/adapters): `package.json:8-15` (`calibrate:providers`/`test:calibrate`), `src/main/services/calibration.ts:62-65,190-214` ensure a bounded-duration loop that reuses central poller/adapters without ad-hoc limiter logic.
- AC #2 (structured metrics and logging per provider): `src/main/services/calibration.ts:31-42,116-133,171-178,209-215,230-239` capture per-provider counts, latency samples, backoff events, and emit `calibration.metrics`/`calibration.request.error` entries via `electron-log`.
- AC #3 (quota invariants and detection of unsafe configs): `src/main/services/calibration.ts:84-103,244-263` compute `theoreticalRequestsPerHour` and `quotaSafe` from `RateLimiterConfig`, with failing configurations driving `overallPass=false`; `tests/2.3-rate-limit-calibration-stress-harness.test.cjs:66-103` asserts unsafe configs are flagged.
- AC #4 (CI-friendly harness and clear pass/fail): `package.json:8-15` defines `calibrate:providers` and `test:calibrate`; `src/main/services/calibration.ts:266-305` wires `--ci`/`CALIBRATION_MODE=ci` to bounded runs and sets `process.exitCode` on failure for CI integration.
- AC #5 (429 contract and backoff semantics): `src/main/adapters/base.ts:1-19` routes all adapter calls through `scheduleProviderRequest`; `src/main/services/poller.ts:32-38,96-137,139-237` enforce rate-limit detection/backoff and `ProviderQuotaStatus` updates; `tests/2.3-rate-limit-calibration-stress-harness.test.cjs:105-143` and `tests/2.2-rate-limiter-implementation.test.cjs:1-103` exercise 429 propagation, backoff, and recovery behavior.
- Tasks/Subtasks: All checked items under "Tasks / Subtasks" are validated against the implemented calibration harness, tests, and scripts listed above; no falsely completed tasks were found.
- Action items: None identified that block approval; future hardening can focus on documenting safe/test-provider usage for calibration runs and extending scenarios as additional providers are introduced.
