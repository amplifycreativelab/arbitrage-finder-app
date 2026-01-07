# Story 1.4: Security Hardening & API Boundaries

Status: Done

## Story

As a Developer,
I want strict boundaries around API credentials and secrets,
so that keys are never exposed in the UI layer or logs.

## Acceptance Criteria

1. The renderer never persists API keys or secret tokens outside the Settings / Provider Configuration form: no keys in Zustand or other global state containers, no keys in `localStorage` or session storage, and no keys in URLs, query strings, or dev-only debug overlays; keys exist only in local component state long enough to submit them via typed IPC.
2. The preload bridge exposes a minimal, typed `credentials` surface (e.g. `saveApiKey`, `isProviderConfigured`, `getStorageStatus`, `acknowledgeFallbackWarning`) backed by shared contracts in `shared/types.ts` / `shared/schemas.ts`, and it does not expose any getter that returns raw API keys to the renderer (only boolean / configuration status is allowed across the boundary).
3. A dedicated `src/main/credentials.ts` module in the main process is the single code path that reads and writes provider credentials, delegating persistence and fallback handling to `src/main/services/storage.ts`; all adapters and other main-process callers obtain API keys via this module instead of reading from `electron-store` directly.
4. An automated check (test or script) uses a sentinel test key to exercise the credentials flow end-to-end and then asserts that application logs, IPC payloads (including TRPC responses and errors), and test fixtures never contain obvious key substrings (e.g. the sentinel value or common API key patterns), in line with `_bmad-output/architecture.md` "Security and API Credential Handling".

## Tasks / Subtasks

- [x] Introduce a `src/main/credentials.ts` module that provides a small, typed surface for credential operations (e.g. `saveApiKey`, `getApiKeyForAdapter`, `getStorageStatus`, `acknowledgeFallbackWarning`), internally delegating to the existing secure storage service in `src/main/services/storage.ts` without re-exposing `electron-store` details. (AC2, AC3)
- [x] Update the Electron preload bridge (`preload/index.ts`) to expose a minimal `credentials` API to the renderer (e.g. `saveApiKey`, `isProviderConfigured`, `getStorageStatus`, `acknowledgeFallbackWarning`) using shared types, and remove or forbid any preload surface that returns raw API keys or arbitrary storage values. (AC2)
- [x] Audit the renderer settings and configuration code (`renderer/src/features/settings/**`, `renderer/src/lib/trpc.ts`) to ensure API keys are held only in local component state for the duration of the form interaction, never written to global state containers, persistent browser storage, URLs, or logs; tighten types or refactor where necessary. (AC1)
- [x] Wire provider adapters and related main-process services to obtain credentials exclusively through the new `src/main/credentials.ts` module (e.g. `src/main/adapters/odds-api-io.ts`, `src/main/adapters/the-odds-api.ts`, and any poller or calculator that needs provider configuration), removing any direct access to the credentials `electron-store`. (AC3)
- [x] Implement an automated security hygiene check (unit/integration test or dedicated script under `tests/`) that flows a known sentinel key through `saveApiKey` and normal adapter usage, then scans logs and IPC payloads for that sentinel or obvious key patterns, failing if any are found. (AC4)
- [x] Add or extend tests to assert that the preload credentials surface never returns raw keys (only status/booleans), and that renderer-level logging utilities and debug helpers do not log credential values, following patterns from `_bmad-output/test-design-system.md` and existing Epic 1 storage tests. (AC1, AC2, AC4)

## Dev Notes

- This story hardens the **boundaries** around credential handling built in Story 1.2 (secure storage service) and Story 1.3 (settings UI and provider selection) by enforcing that raw API keys are only ever read in the main process and never exposed to renderer state, logs, or preload IPC surfaces.
- The `src/main/credentials.ts` module should be the single aggregation point for credential access in the main process, wrapping the `credentials` `electron-store` and `safeStorage` behavior described in `_bmad-output/architecture.md` ("Security and API Credential Handling", "API Key Flow and Boundaries") and providing adapter-friendly helpers (e.g. a token provider function) without leaking storage details.
- Preload should expose a narrow `credentials` bridge (e.g. `saveApiKey`, `isProviderConfigured`, `getStorageStatus`, `acknowledgeFallbackWarning`) that forwards requests to TRPC or direct main-process handlers but never returns raw keys; renderer components should treat this surface as write-only configuration plus status.
- Renderer settings components (`renderer/src/features/settings/ProviderSettings.tsx` and related hooks) must continue to treat keys as transient, local state used only to submit to the main process; after a successful save, local key state should be cleared and any "configured" indicators must be based on status flags from the main process rather than echoing the key value.
- Automated checks in this story should explicitly protect against regressions where new logging, debugging, or tracing code accidentally emits secrets; tests should be structured so that adding a new log or IPC field with a key will fail loudly and early.

### Learnings from Previous Story (1.3 -- Settings Interface & Provider Selection)

- Story 1.3 established the provider selection and credentials UI using shadcn `Select` and password `Input` components, with per-provider keys configured via typed IPC and a "key configured" status derived from main-process storage; this story must preserve that UX while tightening underlying boundaries.
- The fallback storage warning behavior (`isUsingFallbackStorage`, `fallbackWarningShown`, `acknowledgeFallbackWarning`) is already wired into the Settings UI; security hardening work must ensure that the warning remains accurate and prominent even as the preload and main-process surfaces are refactored.
- Existing tests for the Provider Settings UI and secure storage (including Story 1.2 unit tests) provide patterns for structuring new hardening checks, especially around asserting the absence of secrets in logs and renderer state.

### Project Structure Notes

- Implement the credentials aggregation module at `src/main/credentials.ts`, keeping it narrowly focused on credential read/write operations and status queries, and delegate persistence details to `src/main/services/storage.ts`.
- Keep renderer-facing surfaces under `renderer/src/features/settings/**` and the `preload/index.ts` credentials bridge, aligning with the architecture's separation between renderer, preload, and main.
- Add or update tests under `tests/` (e.g. `1.4-SEC-credentials-boundaries.test.cjs` or similar) next to existing Epic 1 storage and settings tests so security hygiene remains easy to monitor and maintain.

### References

- PRD: `_bmad-output/prd.md` (FR2 "Users can input and securely save API keys", NFR4 "Data Privacy").
-,Architecture: `_bmad-output/architecture.md` ("Security and API Credential Handling", "API Key Flow and Boundaries", "Error Handling, Logging, and Observability").
- Epics: `_bmad-output/epics.md` (Epic 1, Story 1.4).
- Prior Stories: `_bmad-output/implementation-artifacts/1-2-secure-storage-service.md`, `_bmad-output/implementation-artifacts/1-3-settings-interface-provider-selection.md`.

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

- _bmad-output/implementation-artifacts/1-4-security-hardening-api-boundaries.context.xml

### Agent Model Used

GPT-based SM assistant (BMAD create-story workflow via Codex)

### Debug Log References

- [P1][1.4-SEC-001] renderer-facing TRPC surface does not expose raw keys (`tests/1.4-sec-credentials-boundaries.test.cjs`).
- [P1][1.4-SEC-002] sentinel key never appears in logs or plaintext storage (`tests/1.4-sec-credentials-boundaries.test.cjs`).

### Completion Notes List

- Implemented `src/main/credentials.ts` as the single aggregation point for credential operations in the main process, wrapping the existing secure storage service and exposing `saveApiKey`, `getApiKeyForAdapter`, `isProviderConfigured`, `getStorageStatus`, and `acknowledgeFallbackWarning` for adapters and services without leaking `electron-store` details. (AC2, AC3)
- Extended the preload bridge to expose a narrow `window.api.credentials` surface backed by TRPC (`saveApiKey`, `isProviderConfigured`, `getStorageStatus`, `acknowledgeFallbackWarning`), and updated `ProviderSettings` to use this bridge so that the renderer never reads raw API keys and treats keys as transient, local state only. (AC1, AC2)
- Added security-focused tests in `tests/1.4-sec-credentials-boundaries.test.cjs` that drive a sentinel key through the credentials flow and assert that TRPC payloads, console logs, and plaintext storage never contain the sentinel value, enforcing the "no secrets in logs or IPC" invariant. All existing Epic 1 storage and provider settings tests continue to pass. (AC1, AC4)
- Resolved the preload blank-screen regression by wiring `electronTRPC` manually via `ipcRenderer` inside `src/preload/index.ts`, guaranteeing the bridge exists before any proxy client instantiation and preserving renderer access to typed IPC during development. (AC2)

### File List

- _bmad-output/implementation-artifacts/1-4-security-hardening-api-boundaries.md
- _bmad-output/implementation-artifacts/1-4-security-hardening-api-boundaries.context.xml
- shared/schemas.ts
- src/main/credentials.ts
- src/main/index.ts
- src/main/services/router.ts
- src/preload/index.ts
- src/preload/index.d.ts
- src/renderer/src/features/settings/ProviderSettings.tsx
- tests/1.4-sec-credentials-boundaries.test.cjs

## Change Log

- Initial draft created from PRD, Architecture, and Epics (Story 1.4); no implementation work has been performed yet.
- Story context XML generated for Story 1.4 and linked under Dev Agent Record ���?' Context Reference.
- 2025-11-20: Implemented credentials boundary hardening for Story 1.4 (main `credentials` module, preload `window.api.credentials` bridge, TRPC router updates, ProviderSettings integration, and sentinel-based security tests) and updated story status to `review`.
- 2025-11-20: Patched the preload startup path to expose `electronTRPC` ahead of proxy creation (via `ipcRenderer`), resolving the dev-time blank screen and confirming the renderer stays connected to the typed IPC bridge.
