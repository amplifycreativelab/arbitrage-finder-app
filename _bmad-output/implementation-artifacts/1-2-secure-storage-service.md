# Story 1.2: Secure Storage Service

Status: done

## Story

As a User,
I want API keys securely stored,
so that secrets are never stored in plain text.

## Acceptance Criteria

1. Main process uses `safeStorage` (or equivalent secure API) for encrypting API keys at rest.
2. `electron-trpc` exposes typed procedures `saveApiKey` and `getApiKey` scoped per provider.
3. When `safeStorage` is not available (e.g., unsupported platform), the app falls back to a documented, less-secure but functional storage path, with a visible warning to the user.
4. No API keys are written to plain-text config files or logs.
5. Keys are retrievable across app restarts for all configured providers.

## Tasks / Subtasks

- [x] Implement secure storage module in `src/main/services/storage.ts` using `safeStorage` and electron-store.
- [x] Design a minimal key/value schema for provider-scoped secrets (e.g., provider id ? encrypted key) and document it.
- [x] Add `saveApiKey` / `getApiKey` procedures to the main TRPC router, delegating persistence to the storage service.
- [x] Wire preload/renderer IPC so settings UI can save and read keys via typed TRPC calls (no direct file system access from renderer).
- [x] Implement and document the fallback behavior when `safeStorage` is unavailable, including a user-facing warning.
- [x] Add basic unit/integration tests around the storage service to verify encryption and retrieval behavior.

### Review Follow-ups (AI)

- [x] [AI-Review][High] Implement a clear, user-facing warning in the settings UI when fallback storage is active (i.e., `isUsingFallbackStorage()` is true because `safeStorage` is unavailable), using a one-time `fallbackWarningShown` flag to avoid noisy repetition and explaining the security trade-off (AC #3, fallback task).
- [x] [AI-Review][Medium] Document the provider credential storage schema and fallback semantics (store name `credentials`, key `providerSecrets`, `enc:` vs `b64:` prefixes) in `_bmad-output/architecture.md` under Security / API Credential Handling and/or this story's Dev Notes so future changes remain auditable (schema documentation task).
- [x] [AI-Review][Medium] Wire the settings UI to call the typed TRPC procedures (`saveApiKey` / `getApiKey`) via `trpcClient` so provider keys are configured end-to-end through IPC rather than any future direct file access from the renderer (IPC wiring task).
- [x] [AI-Review][Low] Add unit tests that exercise the `safeStorage` encryption path by mocking `safeStorage.isEncryptionAvailable` to `true`, asserting that `saveApiKey` persists `enc:`-prefixed values and that `getApiKey` successfully decrypts them (AC #1, tests task).

## Dev Notes

- Follow security guidance from `_bmad-output/architecture.md` ("Security and API Credential Handling" and related sections).
- All secret handling must stay in the main process; the renderer should only see non-sensitive status (e.g., "key configured").
- Ensure logs and error messages never include raw API keys.

### Project Structure Notes

- Place the storage implementation in `src/main/services/storage.ts` and expose a small, typed interface (e.g., `saveApiKey(providerId, key)` / `getApiKey(providerId)`).
- Keep the public surface small so future providers can reuse the same storage.

### References

- PRD: `_bmad-output/PRD.md` (Non-Functional Requirements NFR3, NFR4; Configuration & Settings FR1?FR2).
- Architecture: `_bmad-output/architecture.md` (Security and API Credential Handling, Data Privacy, Implementation Patterns).
- Epics: `_bmad-output/epics.md` (Epic 1, Story 1.2).

## Dev Agent Record

### Context Reference

- _bmad-output/implementation-artifacts/1-2-secure-storage-service.context.xml

### Agent Model Used

GPT-based SM assistant (BMAD workflow)

### Debug Log References

### Completion Notes List

- Implemented secure, provider-scoped API key storage using Electron `safeStorage` when available, with a documented base64 fallback in environments where encryption is unavailable (AC1, AC3, AC4, AC5).
- Added TRPC procedures `saveApiKey` and `getApiKey` exposed via `electron-trpc`, wired through the main process router and preload bridge so the renderer can use typed IPC instead of direct file access (AC2).
- Added unit tests around the storage service to verify per-provider key round-tripping and detection of fallback mode in non-Electron environments (AC5, AC6).
- 2025-11-20: Senior Developer Review (AI) executed with outcome **Changes Requested**; see "Senior Developer Review (AI)" for AC/task validation, findings, and follow-up items.
- 2025-11-20: Resolved review finding [High] by wiring a fallback-mode security banner into the Provider Credentials settings UI using `isUsingFallbackStorage()` and a one-time `fallbackWarningShown` flag, clearly documenting the trade-off for users when OS-backed encryption is unavailable (AC3, fallback UX).
- 2025-11-20: Resolved review finding [Medium] by documenting the `credentials` store schema (`StorageSchema`, `providerSecrets`, `enc:` / `b64:` prefixes, `fallbackWarningShown`) under "Security and API Credential Handling" in `_bmad-output/architecture.md` and aligning Dev Notes with the implemented format (schema documentation).
- 2025-11-20: Resolved review finding [Medium] by wiring the Settings / Provider Credentials UI to `trpcClient.saveApiKey` / `trpcClient.getApiKey`, so provider keys now flow end-to-end via `electron-trpc` rather than any potential direct file access from the renderer (IPC wiring).
- 2025-11-20: Resolved review finding [Low] by adding `[P1][1.2-UNIT-003]` to exercise the `safeStorage` encryption branch using a test-only `__setSafeStorageForTests` override, asserting `enc:`-prefixed persistence and successful decryption via `getApiKey` (encryption-path tests).
- 2025-11-20: Senior Developer Review (AI) re-run for Story 1.2; outcome **Approved** after verifying AC1–AC5, all tasks, and tests (`npm test`), with fallback-mode risks documented but accepted as an intentional, clearly warned degradation path.

### File List

- src/main/services/storage.ts
- src/main/services/router.ts
- src/main/index.ts
- src/preload/index.ts
- src/renderer/src/lib/trpc.ts
- tests/1.2-unit-storage.test.cjs
- tsconfig.storage-test.json
- package.json
- src/renderer/src/App.tsx
- src/renderer/src/features/settings/ProviderSettings.tsx
- _bmad-output/architecture.md
- _bmad-output/implementation-artifacts/1-2-secure-storage-service.md

### Change Log

- 2025-11-20: Senior Developer Review (AI) run for Story 1.2; outcome **Changes Requested** due to missing user-facing fallback warning, incomplete schema documentation, and incomplete UI wiring/tests for secure storage.
- 2025-11-20: Dev follow-up for Story 1.2 implemented fallback-mode UX warning, credential schema documentation, Settings/Provider Credentials wiring to TRPC, and safeStorage encryption-path tests; status advanced to **review** after `npm test` and `npm run build` passed.

### Acceptance Criteria Validation

| AC   | Description                                                                                                                                                            | Status              | Evidence |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------- |
| AC1  | Main process uses `safeStorage` (or equivalent secure API) for encrypting API keys at rest.                                                                            | IMPLEMENTED         | `src/main/services/storage.ts:23-33`, `src/main/services/storage.ts:53-58`, `tests/1.2-unit-storage.test.cjs:4-26` |
| AC2  | `electron-trpc` exposes typed procedures `saveApiKey` and `getApiKey` scoped per provider.                                                                             | IMPLEMENTED         | `src/main/services/router.ts:7-28`, `src/main/index.ts:5-7`, `src/renderer/src/lib/trpc.ts:1-7` |
| AC3  | When `safeStorage` is not available, the app falls back to a documented, less-secure but functional storage path, with a visible warning to the user.                 | IMPLEMENTED         | `src/main/services/storage.ts:35-38`, `src/main/services/storage.ts:61-63`, `src/main/services/storage.ts:24-34` (`isUsingFallbackStorage` and `fallbackWarningShown`), `src/main/services/router.ts:7-34` (`getStorageStatus` / `acknowledgeFallbackWarning`), `src/renderer/src/features/settings/ProviderSettings.tsx` (fallback security banner), and `_bmad-output/architecture.md` ("Security and API Credential Handling" / "Current Credential Storage Implementation (Story 1.2)") documenting the schema and trade-offs. |
| AC4  | No API keys are written to plain-text config files or logs.                                                                                                            | IMPLEMENTED (RISK)  | `src/main/services/storage.ts:40-64` (keys stored as `enc:` or `b64:` tokens in a dedicated credentials store), `rg "apiKey" src` (no logging of raw keys); base64 fallback is reversible and treated as an acceptable but documented trade-off. |
| AC5  | Keys are retrievable across app restarts for all configured providers.                                                                                                 | IMPLEMENTED         | `src/main/services/storage.ts:40-64` (electron-store persistence) and `[P0][1.2-UNIT-001]` round-trip test in `tests/1.2-unit-storage.test.cjs:4-26`. |

Summary: 5 of 5 acceptance criteria implemented; fallback behavior, UX warning, and documentation are now complete for secure storage and its degraded mode.

### Task Completion Validation

| Task                                                                                                                                                                     | Marked As | Verified As                    | Evidence |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------------------------------ | -------- |
| Implement secure storage module in `src/main/services/storage.ts` using `safeStorage` and electron-store.                                                               | [x]       | VERIFIED COMPLETE              | `src/main/services/storage.ts:8-22`, `src/main/services/storage.ts:23-33`, `src/main/services/storage.ts:40-64`, `[P0][1.2-UNIT-001]` in `tests/1.2-unit-storage.test.cjs:4-26` |
| Design a minimal key/value schema for provider-scoped secrets (e.g., provider id ? encrypted key) and document it.                                                      | [x]       | VERIFIED COMPLETE              | Schema implemented as `StorageSchema` / `providerSecrets` with `enc:` / `b64:` prefixes in `src/main/services/storage.ts:8-14`, and documented under "Current Credential Storage Implementation (Story 1.2)" in `_bmad-output/architecture.md` and this story's Dev Notes. |
| Add `saveApiKey` / `getApiKey` procedures to the main TRPC router, delegating persistence to the storage service.                                                       | [x]       | VERIFIED COMPLETE              | `src/main/services/router.ts:7-28`, `src/main/index.ts:5-7`, `src/renderer/src/lib/trpc.ts:1-7`. |
| Wire preload/renderer IPC so settings UI can save and read keys via typed TRPC calls (no direct file system access from renderer).                                     | [x]       | VERIFIED COMPLETE              | IPC plumbing remains in `src/main/index.ts:5-7`, `src/preload/index.ts:1-13`, `src/renderer/src/lib/trpc.ts:1-7`, and is now exercised by `src/renderer/src/features/settings/ProviderSettings.tsx` (calling `trpcClient.saveApiKey` / `trpcClient.getApiKey`) and the updated shell in `src/renderer/src/App.tsx`. |
| Implement and document the fallback behavior when `safeStorage` is unavailable, including a user-facing warning.                                                       | [x]       | VERIFIED COMPLETE              | Fallback storage implemented via base64 (`src/main/services/storage.ts:35-38`, `src/main/services/storage.ts:61-63`), detectable via `isUsingFallbackStorage`, surfaced to users through the Provider Credentials warning banner in `src/renderer/src/features/settings/ProviderSettings.tsx`, and documented in `_bmad-output/architecture.md` ("Current Credential Storage Implementation (Story 1.2)"). |
| Add basic unit/integration tests around the storage service to verify encryption and retrieval behavior.                                                                | [x]       | VERIFIED COMPLETE              | Tests validate per-provider round-trip and fallback detection (`tests/1.2-unit-storage.test.cjs:4-37`), and `[P1][1.2-UNIT-003]` now covers the `safeStorage` encryption branch by asserting `enc:` persistence and successful decryption when encryption is available. |

Summary: 6 of 6 tasks verified complete; all previously flagged AI review follow-ups have been implemented and validated for Story 1.2.

### Test Coverage and Gaps

- Implemented tests for Story 1.2:
  - `[P0][1.2-UNIT-001]` saveApiKey/getApiKey round-trip per provider (`tests/1.2-unit-storage.test.cjs:4-26`).
  - `[P1][1.2-UNIT-002]` storage fallback mode is detectable (`tests/1.2-unit-storage.test.cjs:27-37`).
- Implemented additional test for Story 1.2:
  - `[P1][1.2-UNIT-003]` safeStorage encryption path persists `enc:`-prefixed values and successfully decrypts them using a test-only `__setSafeStorageForTests` override (`tests/1.2-unit-storage.test.cjs:39-76` and `out-tests/storage.js`).
- All tests currently pass via `npm test` (including Story 1.1 integration/unit suites; 1.1 E2E smoke is intentionally skipped).
- Gaps:
  - No renderer-level tests yet assert correct wiring of the settings UI to the TRPC credentials endpoints; behavior is verified via unit tests and manual inspection for now.

### Architectural Alignment

- Credential handling is centralized in `src/main/services/storage.ts` and exposed from `src/main/index.ts:7`, keeping raw API keys confined to the main process as required by `_bmad-output/architecture.md` (“Security and API Credential Handling”: `_bmad-output/architecture.md:151`).
- IPC boundaries use `electron-trpc` (`src/main/services/router.ts:7-28`, `src/main/index.ts:5-7`, `src/preload/index.ts:11-13`, `src/renderer/src/lib/trpc.ts:1-7`), matching the architecture’s guidance for typed IPC between renderer and main.
- Fallback storage uses an `electron-store` file named `credentials` (`src/main/services/storage.ts:13-21`); this is functionally aligned but weaker than the ideal secure-store-only model in `_bmad-output/architecture.md`, and the risk is explicitly called out in the follow-up items.

### Security Notes

- No occurrences of raw API keys were found in logs or renderer code paths (`rg "apiKey" src`); keys flow only through the main-process storage service and typed TRPC procedures.
- Fallback storage mode encodes keys with a reversible `b64:` prefix in the `credentials` store; this is acceptable only as a last-resort compatibility path and must be paired with prominent user warning and documentation (tracked as a High-severity follow-up).
- Public APIs `saveApiKey` / `getApiKey` enforce non-empty `providerId` and avoid exposing secrets directly to the renderer; adapters and future providers should consume keys only via main-process helpers.

### Best-Practices and References

- Security and API credential handling: `_bmad-output/architecture.md:151`.
- Story context and acceptance criteria: `_bmad-output/implementation-artifacts/1-2-secure-storage-service.context.xml`.
- Test design and coverage expectations for Epic 1: `_bmad-output/test-design-epic-1.1.md` (for patterns and naming).

### Action Items

**Code Changes Required**

- [x] [High] Implement settings UI handling for fallback mode using `isUsingFallbackStorage()` and a one-time warning flag, surfacing a clear warning when encryption is unavailable and documenting the risk (AC3; fallback and UX tasks).
- [x] [Medium] Add documentation of the credential storage schema and fallback behavior to `_bmad-output/architecture.md` (and/or this story's Dev Notes), including `providerSecrets` keys and `enc:` / `b64:` prefixes, so future stories can reason about persistence format.
- [x] [Medium] Wire the Settings / Provider Configuration screen to call `trpcClient.saveApiKey` / `trpcClient.getApiKey`, ensuring no direct file system access from the renderer and aligning with the architecture's IPC pattern.
- [x] [Low] Extend storage tests to cover the `safeStorage` encryption path by mocking `safeStorage.isEncryptionAvailable` and verifying both persistence and decryption behavior.

**Advisory Notes**

- After implementing the above changes and adding tests, re-run `npm test` and the TEA trace workflows to refresh any traceability artifacts and confirm Story 1.2 is ready to move back to `review` and then `done`.
