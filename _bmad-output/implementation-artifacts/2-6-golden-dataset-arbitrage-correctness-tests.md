# Story 2.6: Golden Dataset & Arbitrage Correctness Tests

Status: done

## Story

As a Quant/Tester,  
I want a golden dataset and correctness tests for arbitrage calculation,  
so that we can detect regressions and avoid false positives/negatives.

## Acceptance Criteria

1. Curated golden odds snapshots exist for at least three scenarios and are stored as small, reviewable JSON fixtures under the test suite (for example `tests/fixtures/arbitrage/golden-odds-odds-api-io.json`, `tests/fixtures/arbitrage/golden-odds-the-odds-api.json`, and `tests/fixtures/arbitrage/golden-odds-no-surebets.json`):  
   - One Odds-API.io scenario based on a realistic response with known arbitrage opportunities.  
   - One The-Odds-API.com scenario exercising local arbitrage detection over raw odds (matching the behavior validated in Story 2.5).  
   - One "no surebets" scenario where the calculator correctly returns zero opportunities.  
   Each fixture clearly documents the intended provider, sport/league, and expected arbitrage outcomes and is kept small enough to understand at a glance (aligning with `_bmad-output/architecture.md` High-Risk Domain Patterns, R-002).
2. `src/main/services/calculator.ts` exposes a pure, test-focused entry point (for example `calculateArbitrageFromSnapshots` or equivalent) that accepts typed inputs derived from the golden fixtures and returns `ArbitrageOpportunity[]` without performing any I/O, network calls, or poller interaction; the function is imported from `../out-tests/src/main/services/calculator.js` in the test suite and can be exercised in isolation from adapters and HTTP wiring.
3. Golden dataset tests (for example `tests/2.6-golden-dataset-arbitrage-correctness-tests.test.cjs`) run each fixture through the pure calculator entry point and assert that:  
   - All expected arbitrage opportunities are present with the correct `id`, `sport`, `event` metadata, and `roi` values.  
   - No additional or "fake" arbitrage opportunities are produced beyond the expected set.  
   - The "no surebets" fixture yields an empty `ArbitrageOpportunity[]`.  
   - All results pass `arbitrageOpportunityListSchema` validation from `shared/schemas.ts`.  
   These tests serve as the primary R-002 correctness gate and are tagged as P0 in line with `_bmad-output/test-design-system.md`.
4. Invariants from `_bmad-output/architecture.md` (Arbitrage Correctness R-002) and `_bmad-output/test-design-system.md` are encoded as explicit assertions or property-based checks over the golden dataset and additional randomized inputs:  
   - `roi >= 0` for all opportunities (with non-positive calculated ROI treated as non-arbitrage).  
   - Each opportunity's legs reference distinct bookmakers.  
   - Implied probability for each opportunity satisfies `1/oddsA + 1/oddsB <= 1 + ε` for a documented tolerance `ε`.  
   - Edge cases around extreme odds and near-zero ROI are covered without producing flaky tests.  
   These invariants are enforced for both Odds-API.io and The-Odds-API.com scenarios and run as part of the standard `node --test tests/*.test.cjs` suite.
5. The golden dataset and correctness harness integrate cleanly with existing Epic 2 tests and documentation:  
   - Golden fixtures and the pure calculator entry point are reused (where appropriate) by adapter-level tests (Stories 2.4 and 2.5) instead of duplicating inline odds samples.  
   - `_bmad-output/test-design-system.md` and (optionally) `_bmad-output/epics.md` are updated to reference the concrete golden dataset harness for R-002.  
   - All Epic 2 tests (2.1–2.5) continue to pass alongside the new 2.6 tests, with no regression in rate limiting, adapter contracts, or filter behavior.

## Tasks / Subtasks

- [x] Design golden dataset structure and fixtures (AC: #1).
  - [x] Define a minimal JSON schema for golden odds snapshots that can represent both pre-calculated arbs (Odds-API.io) and raw-odds scenarios (The-Odds-API.com), including provider id, event metadata, markets, and expected arbitrage opportunities (AC: #1, #3).
  - [x] Create at least three golden fixture files under `tests/fixtures/arbitrage/` (Odds-API.io arbs, The-Odds-API.com arbs, no-surebets) and document each scenario in comments or a short README near the fixtures (AC: #1).
  - [x] Add a small loader or helper in the test suite for reading these fixtures and converting them into the typed structures expected by the calculator entry point (AC: #1, #2).
- [x] Expose a pure calculator entry point for golden datasets (AC: #2).
  - [x] Extend `src/main/services/calculator.ts` with a pure function that accepts golden snapshot inputs (or a derived internal structure) and returns `ArbitrageOpportunity[]` using `calculateTwoLegArbitrageRoi` and the existing normalization rules, with no direct dependency on the poller or adapters (AC: #2, #3).
  - [x] Ensure the new entry point is exported through the compiled `out-tests` bundle and can be imported from Node test files without requiring Electron runtime setup (AC: #2).
  - [x] Confirm that existing adapter and poller code paths continue to use `calculateTwoLegArbitrageRoi` consistently, so that golden dataset expectations align with real pipeline behavior (AC: #2, #3).
- [x] Implement golden dataset correctness tests and invariants (AC: #3, #4).
  - [x] Add `tests/2.6-golden-dataset-arbitrage-correctness-tests.test.cjs` that loads each golden fixture, runs it through the pure calculator entry point, and asserts expected opportunities (ids, ROI, event metadata) and absence of extra results (AC: #1, #3).
  - [x] Encode the R-002 invariants (`roi >= 0`, distinct bookmakers per opportunity, implied probability within tolerance) as assertions over the golden dataset outputs and cross-check them with existing tests from Stories 2.1-2.5 (AC: #3, #4).
  - [x] Introduce lightweight property-based or randomized tests (following `_bmad-output/test-design-system.md`) that generate synthetic odds around edge cases (near 1/oddsA + 1/oddsB == 1) and verify that the calculator never produces negative ROI or spurious arbs (AC: #4).
- [x] Integrate harness with existing adapter and test design workflows (AC: #5).
  - [x] Refactor adapter tests in `tests/2.4-production-adapter-odds-api-io.test.cjs` and `tests/2.5-test-adapter-the-odds-api-com.test.cjs` to reuse golden fixtures where it improves clarity and avoids duplicated odds setups, while keeping adapter-specific HTTP wiring tests intact (AC: #3, #5).
  - [x] Update `_bmad-output/test-design-system.md` to point to the concrete golden dataset files and 2.6 test cases as the canonical implementation of R-002 mitigation (AC: #5).
  - [ ] Optionally update `_bmad-output/epics.md` (Story 2.6 section) with a brief note indicating that the golden dataset and property-based harness are implemented and referencing the main test file(s) and fixtures (AC: #5).

## Dev Notes

- This story implements the golden dataset and arbitrage correctness harness described in `_bmad-output/architecture.md` under "High-Risk Domain Patterns – Arbitrage Correctness (R-002, DATA)" and in `_bmad-output/test-design-system.md` under risk R-002, ensuring that arbitrage logic is validated against curated fixtures and invariant checks before relying on live provider data.
- The golden dataset harness must operate purely at the calculator level (`src/main/services/calculator.ts`), using `calculateTwoLegArbitrageRoi` and the canonical `ArbitrageOpportunity` model (`shared/types.ts`, `shared/schemas.ts`), so that correctness can be enforced independently of HTTP wiring, poller scheduling, or UI behavior.
- Golden fixtures should be stable and intentionally small: they function as long-lived reference scenarios for both providers and must be easy for reviewers to understand and reason about; any changes to their contents should be considered semantically significant and go through code review with clear rationale.
- Tests added in this story should be tagged consistently with existing conventions (for example `[P0][2.6-…]`) and integrated into the existing `node --test tests/*.test.cjs` flow so that regressions in arbitrage correctness or invariants immediately surface in CI.
- When integrating with adapter tests from Stories 2.4 and 2.5, prioritize reuse where it increases clarity (e.g., using the same odds scenarios), but avoid over-coupling adapters to the exact golden fixtures; adapters remain responsible for mapping provider payloads into canonical structures, while the golden dataset harness is responsible for validating the core calculation and invariants.

### Learnings from Previous Story (2.5 – Test Adapter (The-Odds-API.com))

- Story 2.5 confirmed that arbitrage detection logic should remain centralized in `src/main/services/calculator.ts` via `calculateTwoLegArbitrageRoi`, and that adapter-level logic (`normalizeTheOddsApiMarket` in `src/main/adapters/the-odds-api.ts`) must delegate to this shared function to avoid duplicated or divergent formulas (see `_bmad-output/implementation-artifacts/2-5-test-adapter-the-odds-api-com.md` for details).
- The Dev Agent Record for Story 2.5 explicitly identified the golden dataset and full R-002 property-based harness as deferred work for this story, and left an unchecked subtask ("Reuse golden dataset and R-002 testing patterns where applicable, preparing for Story 2.6") that should be satisfied by implementing the fixtures and tests described here.
- Adapter and poller tests for Epic 2 already validate many invariants (non-negative ROI, distinct bookmakers, schema validation), but they rely on inline, test-specific odds scenarios; the golden dataset introduced in this story should become the shared, documented source of truth for a small set of canonical scenarios used across tests where appropriate.

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->
- _bmad-output/implementation-artifacts/2-6-golden-dataset-arbitrage-correctness-tests.context.xml

### Agent Model Used

BMAD Scrum Master (*create-story* workflow via Codex CLI / GPT-5.1)

  ### Debug Log References
  
  - `npm test` (tsc -p tsconfig.storage-test.json + node --test tests/**/*.test.cjs) passing on 2025-11-21.
  
  ### Completion Notes List
  
  - Implemented `GoldenOddsSnapshot` and `calculateArbitrageFromSnapshots` in `src/main/services/calculator.ts` as a pure calculator entry point for golden datasets (AC: #2, #3).
  - Added golden fixtures, loader helper, and P0/P1 tests (`tests/fixtures/arbitrage/*golden-odds-*.json`, `tests/helpers/golden-dataset.js`, `tests/2.6-golden-dataset-arbitrage-correctness-tests.test.cjs`) covering Odds-API.io, The-Odds-API.com, and no-surebets scenarios (AC: #1, #3, #4).
  - Refactored adapter tests 2.4/2.5 to reuse the golden dataset where appropriate and updated `_bmad-output/test-design-system.md` to treat the 2.6 harness as the canonical R-002 mitigation (AC: #5).
  
  ### File List
  
    - _bmad-output/implementation-artifacts/2-6-golden-dataset-arbitrage-correctness-tests.md
    - _bmad-output/implementation-artifacts/sprint-status.yaml
    - _bmad-output/test-design-system.md
    - src/main/services/calculator.ts
    - tests/2.4-production-adapter-odds-api-io.test.cjs
    - tests/2.5-test-adapter-the-odds-api-com.test.cjs
    - tests/2.6-golden-dataset-arbitrage-correctness-tests.test.cjs
    - tests/helpers/golden-dataset.js
    - tests/fixtures/arbitrage/golden-odds-odds-api-io.json
    - tests/fixtures/arbitrage/golden-odds-the-odds-api.json
    - tests/fixtures/arbitrage/golden-odds-no-surebets.json
    - tests/fixtures/arbitrage/README.md

## Change Log

- Story 2.6 implemented golden dataset fixtures, pure calculator entry point, adapter reuse, and P0/P1 R-002 correctness tests as defined in `_bmad-output/test-design-system.md` (Date: 2025-11-21).

## Senior Developer Review (AI)

- Outcome: Approve
- Reviewer: Amelia (Dev Agent)
- Review Date: 2025-11-21

### Acceptance Criteria Validation

1. AC #1 �?" Golden fixtures
   - PASS �?" Three curated JSON fixtures exist under the test suite with clear, reviewable snapshots for each scenario:
     - `tests/fixtures/arbitrage/golden-odds-odds-api-io.json` (Odds-API.io pre-calculated arb snapshot) (tests/fixtures/arbitrage/golden-odds-odds-api-io.json:1)
     - `tests/fixtures/arbitrage/golden-odds-the-odds-api.json` (The-Odds-API.com raw-odds snapshot) (tests/fixtures/arbitrage/golden-odds-the-odds-api.json:1)
     - `tests/fixtures/arbitrage/golden-odds-no-surebets.json` ("no surebets" control snapshot) (tests/fixtures/arbitrage/golden-odds-no-surebets.json:1)
   - Fixtures are documented and intentionally small per R-002 guidance: see `Golden arbitrage fixtures (Story 2.6)` header and scenario descriptions (tests/fixtures/arbitrage/README.md:1).

2. AC #2 �?" Pure calculator entry point
   - PASS �?" `calculateArbitrageFromSnapshots` is implemented in the calculator service as a pure, test-focused entry point that:
     - Accepts typed `GoldenOddsSnapshot[]` inputs and derives opportunities via `calculateTwoLegArbitrageRoi` (src/main/services/calculator.ts:24,39,46).
     - Performs no I/O, network, or poller interaction; it only computes ROI and shapes `ArbitrageOpportunity` objects plus a `foundAt` timestamp.
   - The function is exported via the compiled test bundle and imported directly in the Node test suite: (tests/2.6-golden-dataset-arbitrage-correctness-tests.test.cjs:12).

3. AC #3 �?" Golden dataset tests and schema validation
   - PASS �?" P0 test `[P0][2.6-GOLDEN-001]` runs the Odds-API.io and The-Odds-API.com fixtures through `calculateArbitrageFromSnapshots`, validating:
     - Each snapshot with positive ROI yields exactly one `ArbitrageOpportunity` (length check) (tests/2.6-golden-dataset-arbitrage-correctness-tests.test.cjs:21).
     - IDs, sport, league, and event name match the original snapshots (tests/2.6-golden-dataset-arbitrage-correctness-tests.test.cjs:31).
     - ROI matches `calculateTwoLegArbitrageRoi` within a tight tolerance (tests/2.6-golden-dataset-arbitrage-correctness-tests.test.cjs:47).
     - Legs reference distinct bookmakers for each opportunity (tests/2.6-golden-dataset-arbitrage-correctness-tests.test.cjs:64).
   - P0 test `[P0][2.6-GOLDEN-002]` confirms the no-surebets fixture produces zero opportunities and still passes `arbitrageOpportunityListSchema` validation (tests/2.6-golden-dataset-arbitrage-correctness-tests.test.cjs:81).

4. AC #4 �?" R-002 invariants and edge cases
   - PASS �?" P1 test `[P1][2.6-R002-001]` enforces R-002 invariants across the golden dataset opportunities:
     - `roi >= 0` for all opportunities.
     - Distinct bookmakers per leg.
     - Implied probability `1/oddsA + 1/oddsB <= 1 + tolerance` (tests/2.6-golden-dataset-arbitrage-correctness-tests.test.cjs:94).
   - P1 test `[P1][2.6-R002-002]` runs randomized samples near the arbitrage boundary and asserts:
     - ROI is never negative.
     - ROI is positive when implied probability is clearly below 1 and zero when clearly above 1 (tests/2.6-golden-dataset-arbitrage-correctness-tests.test.cjs:128).

5. AC #5 �?" Integration with Epic 2 tests and docs
   - PASS �?" Adapter-level tests have been refactored to reuse the golden dataset where appropriate:
     - Odds-API.io adapter mapping test uses `buildOddsApiIoArbitrageBets` derived from golden fixtures (tests/2.4-production-adapter-odds-api-io.test.cjs:24,142; tests/helpers/golden-dataset.js:30).
     - The-Odds-API.com adapter HTTP test uses `buildTheOddsApiRawEvents` built from the golden fixtures (tests/2.5-test-adapter-the-odds-api-com.test.cjs:22,58; tests/helpers/golden-dataset.js:64).
   - `_bmad-output/test-design-system.md` explicitly documents the Story 2.6 implementation as the canonical R-002 mitigation, including golden fixtures, pure calculator entry point, and harness location (_bmad-output/test-design-system.md:247,255).
   - Full `npm test` (tsc + `node --test tests/**/*.test.cjs`) passes with all Epic 2 tests (2.1–2.5) and new 2.6 tests green; only the optional dev smoke E2E remains skipped (npm test output, 2025-11-21).

### Task Verification

- All tasks and subtasks under "Design golden dataset structure and fixtures", "Expose a pure calculator entry point", "Implement golden dataset correctness tests and invariants", and "Integrate harness with existing adapter and test design workflows" are marked complete in the story and have corresponding code and tests:
  - Golden fixtures and README: (tests/fixtures/arbitrage/README.md:1; tests/fixtures/arbitrage/golden-odds-odds-api-io.json:1; tests/fixtures/arbitrage/golden-odds-the-odds-api.json:1; tests/fixtures/arbitrage/golden-odds-no-surebets.json:1).
  - Loader/helper and type-safe integration: (tests/helpers/golden-dataset.js:6,18,23,27,30,64).
  - Pure calculator entry point and schema enforcement: (src/main/services/calculator.ts:24,39; shared/schemas.ts via arbitrageOpportunityListSchema use).
  - P0/P1 golden dataset and R-002 tests: (tests/2.6-golden-dataset-arbitrage-correctness-tests.test.cjs:21,81,94,128).
  - Adapter reuse of golden dataset: (tests/2.4-production-adapter-odds-api-io.test.cjs:24,142; tests/2.5-test-adapter-the-odds-api-com.test.cjs:22,58).
  - R-002 documentation linkage and status: (_bmad-output/test-design-system.md:247,255).

### Findings and Recommendations

- Severity: None (no blocking issues).
- Observations:
  1. The current design relies on fixtures to enforce distinct bookmakers per leg; consider codifying this invariant in a shared helper or schema constraint if future stories introduce additional snapshot formats.
  2. `providerId` from `GoldenOddsSnapshot` is currently unused in `calculateArbitrageFromSnapshots`; this is acceptable for Story 2.6 but may be a useful field for future multi-provider analytics or logging.

### Status Update

- Story Status: Updated from `review` to `done` based on full AC and task verification and passing test suite.
