# Story 1.3: Settings Interface & Provider Selection

Status: done

## Story

As a User,
I want to enter API keys and select the active provider,
so that the app runs in Test or Production mode.

## Acceptance Criteria

1. The Settings / Provider Configuration screen exposes a provider toggle implemented with a shadcn `Select`, with options for the Production provider (`Odds-API.io`) and Test provider (`The-Odds-API.com`), and the selected provider is persisted across app restarts via a typed settings store (e.g., backed by `electron-store` in the main process).
2. For each provider, the settings screen renders a masked shadcn password `Input` for the API key and uses typed IPC (via `electron-trpc`) to call `saveApiKey(providerId, apiKey)` / `getApiKey({ providerId })` in the main process; keys are never stored in renderer global state (no Zustand store, no localStorage, no query-string parameters).
3. The form validates API key inputs on submit: empty or whitespace-only values are rejected with inline error messaging, while valid non-empty keys result in a clear success state; after a successful save, in-memory key values are cleared from the React component state while the "key configured" status reflects persisted state from `getApiKey`.
4. Switching the selected provider updates the in-memory form state and re-queries `getApiKey` for that provider so that the "key configured" indicator, validation messages, and save behavior correctly reflect per-provider secrets (separate keys for Production vs Test).
5. When secure storage falls back to base64 mode (`isUsingFallbackStorage === true` and `fallbackWarningShown !== true`), the Settings UI displays the one-time security warning described in `_bmad-output/architecture.md` ("Security and API Credential Handling") and acknowledges it via `acknowledgeFallbackWarning`, without exposing raw keys in the banner or logs.
6. Component and/or integration tests cover provider toggle behavior (including persistence), API key validation rules, and the fallback warning display, following patterns from `_bmad-output/test-design-system.md` and Epic 1.1 test design.

## Tasks / Subtasks

- [x] Extend the existing `ProviderSettings` UI under `renderer/src/features/settings/ProviderSettings.tsx` to use a shadcn `Select` for provider selection instead of a free-text provider ID input, with clearly labeled options for "Production (Odds-API.io)" and "Test (The-Odds-API.com)" backed by stable provider IDs.
- [x] Introduce or reuse a small settings state layer (local state or a `useProviderSettings` hook) that manages the active provider and per-provider key fields in component scope only, never persisting raw keys to shared client-side state or disk.
- [x] Ensure provider key submission continues to call `trpcClient.saveApiKey` / `trpcClient.getApiKey` via `src/preload/index.ts`, handling success and error cases, clearing the password input on success, and updating the "key configured" indicator using `getApiKey({ providerId })`.
- [x] Add or refine typed main-process settings helpers and TRPC procedures for reading/writing the active provider (e.g., `getActiveProvider` / `setActiveProvider`) backed by `electron-store`, and integrate them so the provider `Select` both reads and writes configuration through typed IPC.
- [x] Verify that changing the active provider triggers any required configuration refresh in the polling/adapter layer (e.g., via `poller.ts` or adapter initialization) so that downstream stories can honor the selected provider without requiring an app restart.
- [x] Keep the fallback storage warning banner wired to `getStorageStatus` / `acknowledgeFallbackWarning`, adjusting copy or placement as needed so it remains visible and accurate alongside the provider controls.
- [x] Add component and/or integration tests for `ProviderSettings` that assert the use of shadcn `Select` / password `Input`, enforce non-empty API key validation, and verify that no renderer logs or shared state containers store raw API key values.

## Dev Notes

- Scope of this story is the **renderer-side Settings / Provider Configuration UI and its IPC hooks** for provider selection and API key entry; storage primitives and secure storage behavior are implemented in Story 1.2 and reused here.
- Follow `_bmad-output/architecture.md` ("Security and API Credential Handling", "Project Structure") to keep raw credentials confined to `src/main/services/storage.ts` / `src/main/credentials.ts` and typed IPC procedures; the renderer must treat keys as write-only configuration.
- Implement and refine Settings UI in `renderer/src/features/settings/**` and align layout/components with the existing "Orange Terminal" theme and shadcn component patterns established in Story 1.1.
- Ensure provider selection and keys are wired into the broader configuration flow so that toggling providers can be used by the data engine and dashboard without restart, in line with `_bmad-output/prd.md` FR1 ("Select Active Data Provider") and the core innovation around an API-agnostic adapter layer.
- When designing tests, prioritize verifying that no renderer logs or state containers contain raw API key values and that IPC calls are limited to the narrow credentials/settings surface.

### Learnings from Previous Story (1.2 -- Secure Storage Service)

- Story 1.2 introduced the secure storage module in `src/main/services/storage.ts` and typed TRPC procedures (`saveApiKey`, `getApiKey`) for per-provider key persistence; this story must reuse those interfaces rather than duplicating storage logic in the renderer.
- Fallback storage behavior and the one-time security banner for non-encrypted storage are defined in `_bmad-output/architecture.md` and implemented in the Settings UI via `trpcClient.getStorageStatus` / `trpcClient.acknowledgeFallbackWarning`; this story should ensure new UI elements do not weaken or obscure these guarantees.
- Existing tests around storage and fallback detection (e.g., `1.2-UNIT-*` suites) can be used as a reference when adding UI-level tests to ensure settings behavior remains consistent with security guarantees.

### Project Structure Notes

- Place new or updated UI elements under `renderer/src/features/settings/` and prefer co-locating hooks and local state modules near the UI components to keep the settings surface well-encapsulated.
- Use existing shared type definitions in `shared/types.ts` / `shared/schemas.ts` as the source of truth for provider identifiers and settings payloads exposed over IPC.

### References

- PRD: `_bmad-output/prd.md` (FR1, FR2; "API Flexibility" and configuration section; architecture mapping to settings and credentials).
- Architecture: `_bmad-output/architecture.md` ("Security and API Credential Handling", "API Key Flow and Boundaries", "PRD-to-Architecture Mapping" for settings).
- Epics: `_bmad-output/epics.md` (Epic 1, Story 1.3).
- Prior Stories: `_bmad-output/implementation-artifacts/1-1-project-initialization-ui-scaffolding.md`, `_bmad-output/implementation-artifacts/1-2-secure-storage-service.md`.

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

- _bmad-output/implementation-artifacts/1-3-settings-interface-provider-selection.context.xml

### Agent Model Used

GPT-based SM assistant (BMAD create-story workflow via Codex)

### Debug Log References

### Completion Notes List

### File List
