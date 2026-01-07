# Test Design: Story 1.1 – Project Initialization & UI Scaffolding

**System:** Arbitrage Finder App  
**Epic:** 1 – Foundation & Secure Configuration  
**Story:** 1.1 – Project Initialization & UI Scaffolding  
**Date:** 2025-11-20  
**Author:** stefano  
**Status:** Draft

---

## Executive Summary

**Scope:** Test design for Story 1.1, covering the initial Electron-Vite React+TS scaffold, Tailwind + shadcn/ui integration, and alignment with the architecture’s project structure and UX theme (“The Orange Terminal”).

**Story 1.1 Acceptance Criteria (recap):**

- `npm run dev` launches Electron with dark theme `#0F172A`.
- Text color is off-white `#F8FAFC`.
- Primary accent color is `#F97316`.
- Folder structure matches `_bmad-output/architecture.md` project structure.

**Risk Summary:**

- Total risks identified: 6
- High-priority risks (score ≥ 6): 2
- Critical categories: TECH, OPS

**Coverage Summary (Planned):**

- P0 scenarios: 3 (6 hours)
- P1 scenarios: 3 (3 hours)
- P2 scenarios: 2 (1 hour)
- P3 scenarios: 1 (0.25 hours)
- **Total effort**: 10.25 hours (~1.5 days)

---

## Risk Assessment

### High-Priority Risks (Score ≥ 6)

| Risk ID | Category | Description                                                                                               | Probability | Impact | Score | Mitigation                                                                                                                           | Owner     | Timeline  |
| ------- | -------- | --------------------------------------------------------------------------------------------------------- | ----------- | ------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------ | --------- | --------- |
| R-1     | TECH     | Scaffold diverges from `_bmad-output/architecture.md` (missing/relocated core files, wrong folders, adapters).   | 2           | 3      | 6     | File-structure checks in CI; integration test asserting presence/paths of main, preload, renderer, shared entrypoints and adapters. | Tech Lead | Sprint 1  |
| R-2     | OPS      | `npm run dev` / `npm run build:win` unreliable on clean Windows 11 (extra steps or intermittent failures). | 2           | 3      | 6     | CI pipeline that runs `npm run dev` smoke + `npm run build:win`; document required tools and Windows-specific caveats.               | Dev/QA    | Sprint 1  |

### Medium-Priority Risks (Score 3–4)

| Risk ID | Category | Description                                                                                                    | Probability | Impact | Score | Mitigation                                                                                                               | Owner   |
| ------- | -------- | -------------------------------------------------------------------------------------------------------------- | ----------- | ------ | ----- | ------------------------------------------------------------------------------------------------------------------------ | ------- |
| R-3     | BUS      | Base theme deviates from UX spec (colors hard-coded or inconsistent), causing downstream UI rework.           | 2           | 2      | 4     | Centralize theme tokens in Tailwind config / CSS variables; UI tests asserting key shell colors via tokens, not magic.  | Dev/QA  |
| R-4     | TECH     | Starter versions / dependencies drift from `_bmad-output/architecture.md`, leading to subtle incompatibilities later. | 2           | 2      | 4     | Pin versions in `package.json` per architecture; periodic review; simple unit test loading config to catch breaking changes. | Tech Lead |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description                                                                | Probability | Impact | Score | Action  |
| ------- | -------- | -------------------------------------------------------------------------- | ----------- | ------ | ----- | ------- |
| R-5     | OPS      | Missing or outdated developer setup docs for Story 1.1 scaffold.          | 1           | 2      | 2     | Monitor |
| R-6     | BUS      | Lint/format rules not aligned initially, causing minor friction in PRs.   | 1           | 1      | 1     | Monitor |

---

## Test Coverage Plan

### P0 (Critical) – Run on every commit

**Criteria:** Blocks core journey + High risk (score ≥ 6) + No reasonable workaround.

| Requirement / AC                                      | Test ID           | Test Level | Risk Link | Test Count | Owner | Notes                                                                                               |
| ----------------------------------------------------- | ----------------- | ---------- | --------- | ---------- | ----- | --------------------------------------------------------------------------------------------------- |
| Story 1.1 – AC1, AC4 (`npm run dev`, structure)       | 1.1-E2E-001       | E2E        | R-1, R-2  | 1          | QA    | Launch Electron via `npm run dev`, assert main window opens, no fatal errors in console/logs.      |
| Story 1.1 – AC4 (project structure consistency)       | 1.1-INT-001       | Integration| R-1       | 1          | QA    | Node-level test asserting presence/paths of main, preload, renderer, shared, adapters, services.   |
| Story 1.1 – build entrypoint & scripts wired correctly| 1.1-INT-002       | Integration| R-2       | 1          | QA    | Run `npm run build:win` on CI agent; fail test on TS errors or packaging failures.                 |

**Total P0:** 3 tests, ~6 hours initial implementation (2h/test including CI wiring and environment stabilization).

### P1 (High) – Run on PRs to main

**Criteria:** Important feature + Medium risk (score 3–4) + Core experience.

| Requirement / AC                                | Test ID     | Test Level | Risk Link | Test Count | Owner | Notes                                                                                                           |
| ----------------------------------------------- | ----------- | ---------- | --------- | ---------- | ----- | ---------------------------------------------------------------------------------------------------------------- |
| Story 1.1 – AC1–3 (theme colors on base shell)  | 1.1-CMP-001 | Component  | R-3       | 1          | QA    | Playwright component or RTL test checking background, text, accent colors driven by theme tokens, not inline.    |
| Story 1.1 – design system primitives wired      | 1.1-CMP-002 | Component  | R-3       | 1          | Dev   | Component tests for base `Button`/layout to assert correct classes, hover/focus states, disabled behavior.       |
| Story 1.1 – theme config invariants             | 1.1-UNIT-001| Unit       | R-3, R-4  | 1          | Dev   | Unit test importing Tailwind/theme config to assert key hex values and exported token names.                     |

**Total P1:** 3 tests, ~3 hours (1h/test).

### P2 (Medium) – Run nightly/weekly

**Criteria:** Secondary coverage + Lower risk (score 1–2) + Edge/corner cases.

| Requirement / Area                       | Test ID     | Test Level | Risk Link | Test Count | Owner | Notes                                                                                      |
| ---------------------------------------- | ----------- | ---------- | --------- | ---------- | ----- | ------------------------------------------------------------------------------------------ |
| Dev ergonomics & docs stay in sync      | 1.1-UNIT-002| Unit       | R-5       | 1          | Dev   | Simple test ensuring `README` / setup docs reference correct npm scripts and folder paths. |
| Formatter/linter commands exist & run   | 1.1-INT-003 | Integration| R-6       | 1          | Dev   | CI step invoking `npm run lint` / `npm run format:check` to ensure tooling is wired.       |

**Total P2:** 2 tests, ~1 hour (0.5h/test).

### P3 (Low) – Run on-demand / full regression

**Criteria:** Nice-to-have + mostly cosmetic + small impact.

| Requirement / Area                 | Test ID     | Test Level | Risk Link | Test Count | Owner | Notes                                                                                   |
| ---------------------------------- | ----------- | ---------- | --------- | ---------- | ----- | --------------------------------------------------------------------------------------- |
| Initial welcome/placeholder UI UX  | 1.1-E2E-002 | E2E        | R-6       | 1          | QA    | Light E2E check that initial dashboard shell renders helpful copy and non-broken layout.|

**Total P3:** 1 test, ~0.25 hours.

---

## Execution Order

### Smoke Tests (<5 minutes)

**Purpose:** Fast feedback that the scaffold is not broken.

- [ ] `npm install` + `npm run dev` starts Electron successfully (subset of 1.1-E2E-001).
- [ ] Main window renders root React component without runtime errors.

**Total:** 2 smoke checks (subset of P0), automated via CI where possible.

### P0 Tests (<10 minutes)

**Purpose:** Critical foundation validation on every commit.

- [ ] 1.1-E2E-001 – Dev environment boot.  
- [ ] 1.1-INT-001 – Project structure integrity.  
- [ ] 1.1-INT-002 – Build scripts & packaging.

### P1 Tests (<30 minutes)

**Purpose:** Ensure Story 1.1’s UX and theme integration are stable.

- [ ] 1.1-CMP-001 – Theme shell matches design tokens.  
- [ ] 1.1-CMP-002 – Design-system primitives wired correctly.  
- [ ] 1.1-UNIT-001 – Theme configuration invariants.

### P2/P3 Tests (<60 minutes)

**Purpose:** Broader regression and ergonomics coverage.

- [ ] 1.1-UNIT-002 – Setup docs and scripts stay in sync.  
- [ ] 1.1-INT-003 – Lint/format commands exist and run.  
- [ ] 1.1-E2E-002 – Initial UI shell UX sanity.

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes                                         |
| -------- | ----- | ---------- | ----------- | --------------------------------------------- |
| P0       | 3     | 2.0        | 6.0         | CI wiring + Windows-specific stability checks |
| P1       | 3     | 1.0        | 3.0         | Component and unit tests                      |
| P2       | 2     | 0.5        | 1.0         | Docs and tooling checks                       |
| P3       | 1     | 0.25       | 0.25        | Cosmetic UX sanity                            |
| **Total**| **9** | **-**      | **10.25**   | **~1.5 days**                                 |

### Prerequisites

**Test Data:**

- No domain data required; focus is structural and visual.  
- Minimal seed data for renderer shell (e.g. placeholder components) if needed for E2E.

**Tooling:**

- Playwright (or equivalent) for E2E / component-level checks.  
- Vitest (or equivalent) for unit/integration tests.  
- CI agent capable of running Electron builds on Windows (for `npm run build:win`).

**Environment:**

- Windows 11 dev machine matching `architecture.md` assumptions.  
- Stable Node.js and npm versions aligned with the starter and lockfile.  
- Ability to run Electron in CI (headless or xvfb-equivalent where supported).

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate:** 100% (no exceptions).  
- **P1 pass rate:** ≥ 95% (waivers required for failures).  
- **P2/P3 pass rate:** ≥ 90% (informational, monitored).  
- **High-risk mitigations (score ≥ 6):** 100% implemented or explicitly waived.

### Coverage Targets

- **Foundation / scaffold behavior (Story 1.1):** ≥ 80% of acceptance criteria covered by automated tests.  
- **Build / script behavior:** 100% of documented scripts validated at least by integration tests.  
- **Visual theme correctness:** ≥ 70% of core shell elements (background, text, accent) asserted via tests.

### Non-Negotiable Requirements

- [ ] All P0 tests pass.  
- [ ] No open high-risk items (score ≥ 6) without mitigation or waiver.  
- [ ] `npm run dev` and `npm run build:win` succeed in the reference environment.  
- [ ] Project structure remains aligned with `_bmad-output/architecture.md`.

---

## Assumptions and Dependencies

### Assumptions

1. The Electron-Vite starter and dependencies listed in `_bmad-output/architecture.md` remain stable for this sprint.  
2. Contributors use a Node.js version compatible with the generated project scaffold.  
3. Windows 11 is the primary target environment for both development and packaging.

### Dependencies

1. CI environment with Windows runner capable of building Electron apps – required before enabling 1.1-INT-002 in gating.  
2. Base lint/format tooling configured (ESLint, Prettier/Tailwind config) – required before fully enabling 1.1-INT-003.  
3. UX design tokens for “The Orange Terminal” finalized – required before locking 1.1-CMP-001 as stable.

### Risks to Plan

- **Risk:** CI on Windows is not yet available or slow to provision.  
  - **Impact:** P0 build validation may run only on local machines temporarily.  
  - **Contingency:** Start with local verification and non-blocking CI check; upgrade to gating once CI Windows runner is ready.

---

## Appendix

### Knowledge Base References

- `risk-governance.md` – Risk classification and gate decision framework.  
- `probability-impact.md` – Probability × impact scoring and thresholds.  
- `test-levels-framework.md` – Guidance for choosing unit, integration, E2E levels.  
- `test-priorities-matrix.md` – P0–P3 prioritization and execution strategy.

### Related Documents

- PRD: `_bmad-output/prd.md`  
- Epics & Stories: `_bmad-output/epics.md` (Epic 1, Story 1.1)  
- Architecture: `_bmad-output/architecture.md`  
- Story Artifact: `_bmad-output/implementation-artifacts/1-1-project-initialization-ui-scaffolding.md`

---

**Generated by:** TEA (Master Test Architect persona – manual run)  
**Workflow:** `.bmad/bmm/testarch/test-design` (Epic-level mode, Story 1.1 focus)

