# Test Design: System-Level Testability Review

**System:** Arbitrage Finder App  
**Date:** 2025-11-20  
**Author:** stefano  
**Status:** Draft

---

## Executive Summary

**Scope:** Full system-level test design for the Arbitrage Finder App across:

- Electron Main process (adapters, poller, calculator, router)
- Preload bridge (typed IPC contracts)
- Renderer (React dashboard and workflows)
- External odds providers (Production: pre-calculated arbs, Test: raw odds)

This document translates the architecture and PRD into a risk-based test strategy before any detailed test automation
is implemented.

**Risk Summary:**

- Total risks identified: 6
- High-priority risks (≥6): 2
- Critical categories: PERF, DATA, SEC

**Coverage Summary (Planned):**

- P0 scenarios: 10 (20 hours)
- P1 scenarios: 18 (18 hours)
- P2 scenarios: 20 (10 hours)
- P3 scenarios: 8 (2 hours)
- **Total effort**: 50 hours (~6–7 days)

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description                                                                 | Probability | Impact | Score | Mitigation                                                                                                      | Owner        | Timeline   |
| ------- | -------- | --------------------------------------------------------------------------- | ----------- | ------ | ----- | ---------------------------------------------------------------------------------------------------------------- | ------------ | ---------- |
| R-001   | PERF     | Rate limiter misconfiguration causes API bans or stale data (NFR1, FR8).   | 2           | 3      | 6     | Centralize Bottleneck config, add contract tests around minTime / concurrency, add synthetic load checks in CI. | Tech Lead    | Pre-GA     |
| R-002   | DATA     | Incorrect arbitrage calculation or mapping yields false positives/negatives | 2           | 3      | 6     | Golden dataset for both providers, property-based tests around arb formula, cross-check against reference tool. | Quant/Tester | Pre-GA     |

### Medium-Priority Risks (Score 3–4)

| Risk ID | Category | Description                                                                                 | Probability | Impact | Score | Mitigation                                                                                              | Owner      |
| ------- | -------- | ------------------------------------------------------------------------------------------- | ----------- | ------ | ----- | -------------------------------------------------------------------------------------------------------- | ---------- |
| R-003   | SEC      | API keys stored or logged insecurely (NFR4, FR2).                                          | 2           | 2      | 4     | Tests around safeStorage usage, log-scrubbing checks, IPC contract tests ensuring keys never cross UI. | Security   |
| R-004   | TECH     | IPC/contract drift between main, preload, and renderer breaks surebet pipeline (FR5–FR7).  | 2           | 2      | 4     | Shared TypeScript contracts, schema-validation tests, adapter-level integration tests.                  | Tech Lead  |
| R-005   | OPS      | Poller or calculator silently fail; dashboard shows frozen/stale data (NFR2, FR3–FR4, FR9). | 2           | 2      | 4     | Health endpoint / heartbeat, UI staleness indicators, watchdog tests that assert freshness thresholds. | Dev/QA     |
| R-006   | BUS      | Filters/ROI thresholds hide profitable surebets or show irrelevant ones (FR1, FR3–FR4, FR10)| 2           | 2      | 4     | End-to-end tests around filter combinations, ROI threshold boundaries, region/sport toggles.           | Product/QA |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description                                             | Probability | Impact | Score | Action  |
| ------- | -------- | ------------------------------------------------------- | ----------- | ------ | ----- | ------- |
| R-007   | OPS      | Windows installer / update flow has rough edges.       | 1           | 2      | 2     | Monitor |
| R-008   | BUS      | Minor UI polish issues reduce perceived professionalism | 1           | 1      | 1     | Monitor |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## Test Coverage Plan

### P0 (Critical) – Run on every commit

**Criteria:** Blocks core journey + High risk (score ≥6) + No reasonable workaround.

| Requirement                               | Test Level | Risk Link     | Test Count | Owner | Notes                                                                                       |
| ----------------------------------------- | ---------- | ------------- | ---------- | ----- | ------------------------------------------------------------------------------------------- |
| NFR1 – Rate limiting (no 429s)           | API        | R-001         | 4          | QA    | Stress tests around Bottleneck config, per-provider quotas, and backoff behaviour.         |
| FR5/FR6/FR7 – Arb detection & normalization | API        | R-002, R-004 | 4          | QA    | Golden dataset and property-based tests for arb formula + mapping into ArbitrageOpportunity|
| FR9/FR10 – Dashboard displays surebets   | E2E        | R-001, R-002  | 2          | QA    | Playwright E2E flow from provider selection → scan → grid + ROI threshold behaviour.       |

**Total P0:** 10 tests, ~20 hours (initial implementation)

### P1 (High) – Run on PR to main

**Criteria:** Important features + Medium risk (score 3–4) + Common workflows.

| Requirement                                              | Test Level  | Risk Link       | Test Count | Owner | Notes                                                                                   |
| -------------------------------------------------------- | ---------- | --------------- | ---------- | ----- | --------------------------------------------------------------------------------------- |
| FR1/FR2 – Provider selection + API key management        | Component  | R-003, R-006    | 4          | Dev   | React component tests + IPC contract tests for key save/load flows.                   |
| FR3/FR4 – Region/sport filters                           | Component  | R-005, R-006    | 4          | Dev   | Filter logic and persistence tests, including edge combinations.                       |
| NFR2 – UI responsiveness under scan                      | E2E/API    | R-001, R-005    | 4          | QA    | E2E checks on responsiveness + API-level metrics on scan duration.                     |
| Epics 2–3 – Poller, calculator, and dashboard cohesion   | Integration| R-001–R-005     | 6          | QA    | Service-level tests over poller+calculator+adapter chain without UI.                   |

**Total P1:** 18 tests, ~18 hours

### P2 (Medium) – Run nightly/weekly

**Criteria:** Secondary features + Low/medium risk (1–4) + Edge cases.

| Requirement                        | Test Level | Risk Link | Test Count | Owner | Notes                                                      |
| ---------------------------------- | ---------- | --------- | ---------- | ----- | ---------------------------------------------------------- |
| Edge ROI thresholds and rounding   | Unit      | R-002     | 6          | Dev   | Boundary tests for ROI calculations and display.          |
| Error handling / retries per provider| API     | R-001, R-005 | 8       | QA    | Simulated 5xx, timeouts, and malformed payloads.          |
| Logging and observability          | Unit/API  | R-005, R-007 | 6      | Dev   | Tests around electron-log config and structured events.   |

**Total P2:** 20 tests, ~10 hours

### P3 (Low) – Run on-demand

**Criteria:** Nice-to-have + exploratory + extended performance benchmarks.

| Requirement                         | Test Level | Test Count | Owner | Notes                                              |
| ----------------------------------- | ---------- | ---------- | ----- | -------------------------------------------------- |
| Extended long-run performance sweeps| E2E        | 2          | QA    | Burn-in suites under CI with real-world schedules. |
| Exploratory workflows / future epics| E2E        | 2          | QA    | Ad-hoc flows to validate UX hypotheses.            |
| Internal tooling / debug panels     | Unit/Comp  | 4          | Dev   | Low-risk utilities supporting dev workflows.       |

**Total P3:** 8 tests, ~2 hours

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose:** Fast feedback to verify build and core pipeline.

- [ ] App launches on Windows 11 and connects to a dummy provider (happy path).
- [ ] Dashboard renders with empty state and no console errors.
- [ ] Basic scan returns at least one mocked opportunity in Test mode.

**Total:** 3 scenarios

### P0 Tests (<10–15 min)

**Purpose:** Critical path validation around surebet generation and visibility.

- [ ] Rate-limiter/API quota test suite (NFR1 – no 429s under normal load).
- [ ] Arb engine correctness suite against golden dataset for both providers.
- [ ] End-to-end “scan and view surebet” flow with ROI threshold and filters.

**Total:** 10 scenarios (batched where possible via fixtures)

### P1 Tests (<30 min)

**Purpose:** Important configuration and UX flows that support the core engine.

- [ ] Provider + key management (create, update, invalid key handling).
- [ ] Region/sport filters and persistence across sessions.
- [ ] UI responsiveness under heavier but realistic scan conditions.
- [ ] Integration suite for poller + calculator + adapters.

**Total:** 18 scenarios

### P2/P3 Tests (<60 min)

**Purpose:** Broader regression and exploratory/performance coverage.

- [ ] Edge-case ROI thresholds, rounding, and sorting.
- [ ] Provider-specific failure modes and retries.
- [ ] Extended performance and burn-in runs.

**Total:** 28 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes                               |
| -------- | ----- | ---------- | ----------- | ----------------------------------- |
| P0       | 10    | 2.0        | 20          | Complex setup, golden dataset work. |
| P1       | 18    | 1.0        | 18          | Standard coverage for main flows.   |
| P2       | 20    | 0.5        | 10          | Focused edge and resilience tests.  |
| P3       | 8     | 0.25       | 2           | Exploratory and perf sweeps.        |
| **Total**| 56    | -          | **50**      | **~6–7 days**                       |

### Prerequisites

**Test Data:**

- Golden arbitrage datasets per provider (Production pre-calculated, Test raw odds).
- Factories for generating synthetic events, odds, and regions (for unit/API tests).

**Tooling:**

- Playwright for E2E and API-level tests.
- Node test runner (e.g., Vitest) for unit/integration tests.

**Environment:**

- Windows 11, Electron dev environment matching architecture.md.
- Stable test API keys for both providers with non-production quotas.

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions).
- **P1 pass rate**: ≥95% (waivers required for failures).
- **P2/P3 pass rate**: ≥90% (informational, monitored).
- **High-risk mitigations (score ≥6)**: 100% implemented or explicitly waived.

### Coverage Targets

- **Critical paths (scan → view surebet)**: ≥80%.
- **Security scenarios (API key handling, IPC boundaries)**: 100%.
- **Business logic (arb detection, filters)**: ≥70%.
- **Edge cases (provider failures, rounding edges)**: ≥50%.

### Non-Negotiable Requirements

- [ ] All P0 tests pass.
- [ ] No high-risk (score ≥6) items unmitigated.
- [ ] Security tests (SEC category) pass 100%.
- [ ] Performance targets for NFR1/NFR2 met.

---

## Mitigation Plans

### R-001: Rate Limiting and API Quotas (Score: 6)

**Mitigation Strategy:**  
Implement centralized Bottleneck configuration with explicit quotas per provider; add API-level tests that simulate
peak usage patterns; run nightly performance checks to confirm no 429s under defined “normal use” profiles.

**Owner:** Tech Lead  
**Timeline:** Before first public release  
**Status:** Planned  
**Verification:** CI job that runs stress test suite and fails on any 429 responses or quota violations.

### R-002: Arbitrage Calculation Correctness (Score: 6)

**Mitigation Strategy:**  
Define a curated golden dataset of events and odds with expected arbitrage opportunities; implement property-based tests
for the arb formula; cross-check sample outputs with an external reference calculator tool.

**Implementation (Story 2.6):**

- Golden fixtures live under `tests/fixtures/arbitrage/`:
  - `golden-odds-odds-api-io.json` (production provider snapshot).
  - `golden-odds-the-odds-api.json` (test provider raw-odds snapshot).
  - `golden-odds-no-surebets.json` (control �?" no arbitrage expected).
- Pure calculator entry point: `src/main/services/calculator.ts`  
  (`calculateArbitrageFromSnapshots`, exported via `out-tests/src/main/services/calculator.js`).
- Canonical R-002 test harness: `tests/2.6-golden-dataset-arbitrage-correctness-tests.test.cjs`.

**Owner:** Quant/Tester  
**Timeline:** Before enabling Production provider for real stakes  
**Status:** Implemented (Story 2.6)  
**Verification:** All golden cases pass, and random fuzzed inputs stay within agreed tolerance boundaries.

---

## Assumptions and Dependencies

### Assumptions

1. External providers honour documented SLAs and response schemas.
2. Users run the app on reasonably modern Windows 11 hardware.
3. Network connectivity is stable enough for periodic polling.

### Dependencies

1. Stable test and production API keys for both providers – required before P0/P1 suites are implemented.
2. Architecture decisions in `architecture.md` remain stable for the first release.

### Risks to Plan

- **Risk:** Significant late changes to provider selection or data model.  
  - **Impact:** Test design and golden datasets require rework.  
  - **Contingency:** Keep factories and test data generation centralized and well-documented.

---

## Appendix

### Knowledge Base References

- `risk-governance.md` – Risk classification and scoring framework.
- `probability-impact.md` – Probability × impact scale and thresholds.
- `test-levels-framework.md` – Guidance for choosing unit, integration, API, or E2E coverage.
- `test-priorities-matrix.md` – P0–P3 prioritization, coverage targets, and execution ordering.

### Related Documents

- PRD: `_bmad-output/prd.md`
- Epics: `_bmad-output/epics.md`
- Architecture: `_bmad-output/architecture.md`

---

**Generated by:** TEA (Master Test Architect persona)  
**Workflow:** `.bmad/bmm/testarch/test-design` (System-Level Mode)
