# Story 2.1: Adapter Pattern & Shared Types

Status: done

## Story

As a Developer,
I want a shared adapter interface and shared types,
so that all providers can be normalized into a single data model.

## Acceptance Criteria

1. `shared/types.ts` defines an `ArbitrageOpportunity` type that matches the `Data Architecture` specification in `_bmad-output/architecture.md` (fields for id, sport, event { name, date, league }, two legs with bookmaker/market/odds/outcome, and roi), and this type is the single source of truth for arbitrage opportunities used by main, shared, and renderer code.
2. A base adapter contract (e.g. `ArbitrageAdapter`) is defined in shared contracts (either `shared/types.ts` or a dedicated `src/main/adapters/base.ts`) and exposes a normalized `fetchOpportunities` method that returns `ArbitrageOpportunity[]` (or a typed success/error wrapper) without leaking provider-specific response shapes to callers.
3. Both the production adapter (`src/main/adapters/odds-api-io.ts`) and the test adapter (`src/main/adapters/the-odds-api.ts`) implement the shared adapter contract, obtain credentials via the existing `src/main/credentials.ts` module (per Story 1.2/1.4 and `_bmad-output/architecture.md`), and do not log or expose raw secrets outside the main process.
4. Normalized opportunities flowing out of adapters satisfy the invariants from `_bmad-output/architecture.md` and `_bmad-output/prd.md` for FR5�?"FR7 (e.g. opportunities are derived from current odds snapshots, legs reference distinct bookmakers, roi is non-negative, and any additional adapter-specific fields are kept separate from the core `ArbitrageOpportunity` model).

## Tasks / Subtasks

- [x] Define or confirm the canonical `ArbitrageOpportunity` type in `shared/types.ts` based on the `Data Architecture` section of `_bmad-output/architecture.md`, including id, sport, event metadata, legs, and roi.
  - [x] Align any existing `ArbitrageOpportunity` definitions with this canonical shape and remove duplicated or conflicting types.
  - [x] Add or update the corresponding validation schema in `shared/schemas.ts` so that malformed provider data is rejected before entering the main pipeline.
- [x] Introduce a shared adapter contract for provider integration.
  - [x] Create a base adapter interface (e.g. `ArbitrageAdapter`) in `shared/types.ts` or `src/main/adapters/base.ts` that declares a normalized `fetchOpportunities` operation returning `ArbitrageOpportunity[]` (or a typed result wrapper).
  - [x] Document expectations for error handling, logging, and rate limiting at the adapter boundary, referencing `_bmad-output/architecture.md` ("Data Architecture", "High-Risk Domain Patterns �?" Arbitrage Correctness", and provider adapter sections).
- [x] Refactor provider adapters to implement the shared contract.
  - [x] Update `src/main/adapters/odds-api-io.ts` to implement the base adapter interface, map raw provider responses into `ArbitrageOpportunity[]`, and use the centralized `credentials` module (`src/main/credentials.ts`) for API key access.
  - [x] Update `src/main/adapters/the-odds-api.ts` to implement the same interface and normalization rules, sharing mapping helpers where practical.
  - [x] Ensure all outbound HTTP calls from adapters respect the rate-limiting and polling patterns described in `_bmad-output/architecture.md` (e.g. no direct `fetch`/`axios` bypassing the configured limiter).
- [x] Wire adapters cleanly into the poller/calculator pipeline.
  - [x] Confirm `src/main/services/poller.ts` and `src/main/services/calculator.ts` consume adapters solely through the shared contract and operate on `ArbitrageOpportunity[]`.
  - [x] Verify that renderer-facing state (e.g. Zustand stores and TRPC responses) uses `ArbitrageOpportunity` as the primary shape for opportunities.
- [x] Add focused tests for normalization and contracts.
  - [x] Introduce integration/unit tests (e.g. under `tests/2.1-adapter-pattern-shared-types.test.[tj]s`) that feed representative provider responses into each adapter and assert that the resulting `ArbitrageOpportunity[]` matches the architecture�?Ts structure and invariants.
  - [x] Add tests around the shared adapter contract to ensure new adapters must implement `fetchOpportunities` correctly and cannot return untyped or partial data.
  - [x] Reuse the security and boundary patterns from Story 1.4 tests (no secrets in logs or IPC) when exercising adapters that obtain credentials.

## Dev Notes

- This story establishes the normalized data model and adapter boundary for the arbitrage engine, turning the `ArbitrageOpportunity` interface from `_bmad-output/architecture.md` into an enforced shared contract used by main, shared, and renderer layers.
- Provider adapters should treat `ArbitrageOpportunity` as the only shape they return to the rest of the system; any provider-specific fields or diagnostics remain internal to the adapter or are exposed via clearly separate DTOs.
- Adapters must obtain credentials exclusively through `src/main/credentials.ts` (Story 1.2/1.4) and follow the security invariants in `_bmad-output/architecture.md` ("Security and API Credential Handling", "Security Invariants")�?"no raw keys in logs, IPC payloads, or renderer-visible state.
- The adapter contract and normalization logic should be designed so that future stories (e.g. rate limiting, calibration, golden dataset tests) can plug in additional providers without altering the core `ArbitrageOpportunity` type.

### Project Structure Notes

- Keep provider adapters under `src/main/adapters/**`, with any base adapter abstractions in `src/main/adapters/base.ts` or shared contracts in `shared/types.ts` / `shared/schemas.ts`.
- Keep the arbitrage computation pipeline within `src/main/services/poller.ts` and `src/main/services/calculator.ts`, consuming adapters through the shared interface rather than direct HTTP calls.
- Place new tests under `tests/` using a clear naming convention (e.g. `2.1-adapter-pattern-shared-types.test.cjs` or `.test.ts`) alongside existing Epic 1 tests so normalization and adapter behavior remain easy to verify.

### References

- PRD: `_bmad-output/prd.md` (FR5�?"FR7: arbitrage engine and normalized data model).
- Architecture: `_bmad-output/architecture.md` ("Data Architecture", "High-Risk Domain Patterns �?" Arbitrage Correctness (R-002)", "Caching and Persistence", provider adapter structure).
- Epics: `_bmad-output/epics.md` (Epic 2, Story 2.1 �?" Adapter Pattern & Shared Types).
- Prior Stories: `_bmad-output/implementation-artifacts/1-2-secure-storage-service.md`, `_bmad-output/implementation-artifacts/1-3-settings-interface-provider-selection.md`, `_bmad-output/implementation-artifacts/1-4-security-hardening-api-boundaries.md` (credentials boundaries and secure storage patterns to preserve when adapters consume API keys).

## Dev Agent Record

### Completion Notes
**Completed:** 2025-11-20
**Definition of Done:** All acceptance criteria met, code reviewed, tests passing

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->
- _bmad-output/implementation-artifacts/2-1-adapter-pattern-shared-types.context.xml

### Agent Model Used

BMAD Scrum Master (*create-story* workflow)

### Debug Log References

- [2.1-DATA-001] `shared/schemas.ts`: `arbitrageOpportunitySchema` validates canonical shape and rejects opportunities with duplicate bookmakers.
- [2.1-ADAPTER-ODDS-001] `src/main/adapters/odds-api-io.ts`: `normalizeOddsApiIoOpportunity` maps representative pre-calculated arbitrage bets into `ArbitrageOpportunity`.
- [2.1-ADAPTER-THEODDS-001] `src/main/adapters/the-odds-api.ts`: `normalizeTheOddsApiMarket` uses `calculateTwoLegArbitrageRoi` to drop non-arbitrage markets.
- [2.1-PIPELINE-001] `src/main/services/poller.ts`, `src/main/services/calculator.ts`: poller and calculator operate purely on `ArbitrageOpportunity[]` using the shared adapter contract.
- [2.1-ADAPTER-CONTRACT-001] `tests/2.1-adapter-pattern-shared-types.test.cjs`: invalid adapter outputs are rejected via the shared validation schema.

### Completion Notes List

- [AC1] `shared/types.ts`: Introduced canonical `ArbitrageOpportunity` aligned with `_bmad-output/architecture.md` Data Architecture section and shared across main/renderer via `shared` imports.
- [AC1][AC4] `shared/schemas.ts`: Added `arbitrageOpportunitySchema` and list schema with invariants (`roi >= 0`, two legs, distinct bookmakers) used by poller/calculator to reject malformed provider data.
- [AC2][AC3] `shared/types.ts`, `src/main/adapters/base.ts`: Defined `ArbitrageAdapter` contract and `BaseArbitrageAdapter` that obtains credentials via `src/main/credentials.ts` without logging secrets and exposes normalized `fetchOpportunities(): Promise<ArbitrageOpportunity[]>`.
- [AC2][AC3][AC4] `src/main/adapters/odds-api-io.ts`, `src/main/adapters/the-odds-api.ts`: Implemented provider-specific adapter classes plus pure normalization helpers that map representative provider payloads into `ArbitrageOpportunity` while preserving security and correctness invariants.
- [AC2][AC4] `src/main/services/poller.ts`, `src/main/services/calculator.ts`: Wired adapters into a shared pipeline that consumes adapters via the `ArbitrageAdapter` contract, validates with `arbitrageOpportunitySchema`, and merges provider results as `ArbitrageOpportunity[]`.
- [AC4] `tests/2.1-adapter-pattern-shared-types.test.cjs`: Added tests for shared types, normalization helpers, and the adapter/poller/calculator contract, reusing security patterns from Story 1.4 and ensuring no secrets appear in opportunity payloads.

### File List

- _bmad-output/implementation-artifacts/2-1-adapter-pattern-shared-types.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- shared/types.ts
- shared/schemas.ts
- src/main/adapters/base.ts
- src/main/adapters/odds-api-io.ts
- src/main/adapters/the-odds-api.ts
- src/main/services/poller.ts
- src/main/services/calculator.ts
- src/main/services/router.ts
- tests/2.1-adapter-pattern-shared-types.test.cjs
- tsconfig.storage-test.json

## Change Log

- Initial draft created from PRD, architecture, and epics (Story 2.1 �?" Adapter Pattern & Shared Types); no implementation work has been performed yet.
- Implemented canonical `ArbitrageOpportunity` type and Zod schema, shared adapter contract, provider adapters, and poller/calculator wiring with tests (Story 2.1 �?" Adapter Pattern & Shared Types); story moved to review.
