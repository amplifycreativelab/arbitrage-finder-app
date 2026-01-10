# Story 5.1: Multi-Provider Configuration & Settings

- **Status**: done

## Story

As a User,
I want to configure and enable multiple data providers at once,
so that I can increase bookmaker coverage without manually switching environments.

## Acceptance Criteria

1. **Multi-provider enable/disable toggle** – Settings surface allows enabling/disabling each provider independently via toggles, in addition to storing API keys. The old single-select dropdown is replaced with a list of providers, each with its own enabled toggle and API key field.

2. **Persistent active providers** – Active (enabled) providers are persisted to storage and loaded on app start without exposing raw keys to the renderer. The `StorageSchema` stores an `enabledProviders: ProviderId[]` array instead of the single `activeProviderId`.

3. **Clear ConfigMissing indicators** – If a provider is enabled but missing a valid API key, the dashboard shows a clear `ConfigMissing` / actionable status with an InlineError guiding the user to add the key. The StatusBar and ErrorBanner systems (from Story 4.4) surface per-provider configuration errors.

4. **Hot reconfiguration** – Disabling a provider removes it from polling and status summaries without requiring an app restart. The poller is notified of configuration changes and adapts its polling targets immediately.

5. **Backward compatibility** – Existing single-provider configurations (`activeProviderId`) migrate automatically to the new multi-provider model on first load. If a user previously had `activeProviderId: 'the-odds-api'` with a valid key, they should see `the-odds-api` enabled after migration.

## Tasks / Subtasks

- [x] **Task 1: Extend shared types for multi-provider support** (AC: #2, #5)
  - [x] 1.1 Add `enabledProviders?: ProviderId[]` to `StorageSchema` in `src/main/services/storage.ts`
  - [x] 1.2 Create helper functions: `getEnabledProviders(): ProviderId[]`, `setEnabledProviders(providers: ProviderId[]): void`, `isProviderEnabled(providerId: ProviderId): boolean`, `toggleProvider(providerId: ProviderId, enabled: boolean): void`
  - [x] 1.3 Implement backward compatibility migration: if `enabledProviders` is undefined but `activeProviderId` exists, populate `enabledProviders` with that single provider (if key is configured)

- [x] **Task 2: Update TRPC router for multi-provider API** (AC: #2, #4)
  - [x] 2.1 Add `getEnabledProviders` query returning `{ enabledProviders: ProviderId[] }`
  - [x] 2.2 Add `setProviderEnabled` mutation accepting `{ providerId: ProviderId, enabled: boolean }` that toggles provider and notifies poller
  - [x] 2.3 Deprecate or modify `getActiveProvider` / `setActiveProvider` to return all enabled providers (backward compatible)
  - [x] 2.4 Add input schemas in `shared/schemas.ts` for new procedures
  - [x] 2.5 Update `src/preload/index.ts` to expose `getEnabledProviders` and `setProviderEnabled` via credentials API

- [x] **Task 3: Refactor poller for multi-provider polling targets** (AC: #4)
  - [x] 3.1 Replace `activeProviderIdForPolling: ProviderId | null` with `enabledProvidersForPolling: Set<ProviderId>`
  - [x] 3.2 Create `notifyEnabledProvidersChanged(providers: ProviderId[]): void` function that updates polling targets
  - [x] 3.3 Modify `pollOnceForActiveProvider()` to poll all enabled providers (renamed to `pollOnceForEnabledProviders()`)
  - [x] 3.4 Ensure rate limiting respects per-provider limits when multiple providers are active simultaneously
  - [x] 3.5 Update `pollAndGetFeedSnapshot` response to include `enabledProviderIds: ProviderId[]` and concatenate opportunities from all enabled providers

- [x] **Task 4: Redesign ProviderSettings UI for multi-provider** (AC: #1, #3)
  - [x] 4.1 Replace the single `Select` dropdown with a list of provider cards, each showing: provider name, enabled toggle, API key status badge, API key input field
  - [x] 4.2 Wire each toggle to call `setProviderEnabled` TRPC mutation
  - [x] 4.3 Show `InlineError` per provider when enabled but missing key (reuse from Story 4.4)
  - [x] 4.4 Update status messages to reflect multi-provider state ("2 providers enabled", etc.)
  - [x] 4.5 Style provider cards per Orange Terminal theme with clear visual hierarchy

- [x] **Task 5: Update dashboard feed and status for multi-provider** (AC: #3, #4)
  - [x] 5.1 Update `feedStore.ts` to receive opportunities from multiple enabled providers (concatenated, NOT merged/deduplicated – that's Story 5.2)
  - [x] 5.2 Update `StatusBar.tsx` to show status badges for all enabled providers, not just active provider
  - [x] 5.3 Update `FeedPane.tsx` provider failure banner to handle multiple provider failures gracefully (stack banners or collapse)
  - [x] 5.4 Ensure keyboard navigation and copy/advance workflow work correctly with multi-provider feed
  - [x] 5.5 Add provider source badge to each opportunity row (e.g., "Odds-API.io" chip) so users know which provider sourced each signal

- [x] **Task 6: Add comprehensive tests** (AC: #1, #2, #3, #4, #5)
  - [x] 6.1 Create `tests/5-1-multi-provider-configuration.test.cjs` with test cases for:
    - Multi-provider storage: enable/disable persistence, backward migration from `activeProviderId`
    - TRPC procedures: getEnabledProviders, setProviderEnabled, response shapes
    - UI toggles: enabling/disabling providers in settings, per-provider key input
    - Poller behavior: polling multiple providers, respecting per-provider rate limits
    - Hot reconfiguration: disabling provider mid-session removes from polling within next tick
    - ConfigMissing indicators: error display when enabled but no key, InlineError per provider
  - [x] 6.2 Import real functions from compiled output (per E4-AI-02)
  - [x] 6.3 Ensure existing Epic 4 tests still pass (no regressions)

### Review Follow-ups (AI)

- [x] [AI-Review][MEDIUM] Remove legacy `pollOnceForActiveProvider`, `getActiveProviderForPolling`, `activeProviderIdForPolling` in `poller.ts` – dead code after multi-provider migration
- [x] [AI-Review][MEDIUM] Remove legacy `getActiveProvider`/`setActiveProvider` TRPC procedures in `router.ts` – redundant with `getEnabledProviders`/`setProviderEnabled`
- [x] [AI-Review][LOW] Add per-request timeout wrapper in `pollOnceForEnabledProviders` to prevent adapter hangs from freezing entire polling loop (e.g., `Promise.race` with 30s timeout)

## Dev Notes

### Architecture Compliance

- The multi-provider extension follows the existing architecture patterns:
  - **Storage:** Uses the same `electron-store` with `StorageSchema` extension
  - **IPC:** All new procedures follow the `IpcResult<T>` discriminated union pattern from 4.4
  - **Rate limiting:** Each provider has its own `Bottleneck` instance (already in place in `poller.ts`)
  - **Status model:** Uses existing `ProviderStatus` and `SystemStatus` enums without new ad-hoc flags

### Key Files to Modify

| Category | File | Changes |
|----------|------|---------|
| Storage | `src/main/services/storage.ts` | Add `enabledProviders` field, migration logic, new getters/setters |
| Schemas | `shared/schemas.ts` | Add `setProviderEnabledSchema`, `getEnabledProvidersSchema` |
| Router | `src/main/services/router.ts` | Add `getEnabledProviders`, `setProviderEnabled` procedures |
| Poller | `src/main/services/poller.ts` | Multi-provider polling targets, `notifyEnabledProvidersChanged` |
| Preload | `src/preload/index.ts` | Expose new provider configuration methods |
| UI | `src/renderer/src/features/settings/ProviderSettings.tsx` | Multi-provider cards with toggles |
| Dashboard | `src/renderer/src/features/dashboard/stores/feedStore.ts` | Handle multi-provider feed |
| Dashboard | `src/renderer/src/features/dashboard/StatusBar.tsx` | Show all enabled provider statuses |

### Learnings from Epic 4 to Apply

1. **E4-AI-01 (Adversarial reviews):** This story touches 10+ files – adversarial review required before marking done.
2. **E4-AI-02 (Real function tests):** Import actual implementation from compiled output, not mock duplicates.
3. **E4-AI-03 (Wire components immediately):** Integrate UI changes into parent components in the same task.
4. **E4-AI-04 (Complete story workflow):** Follow all workflow steps including context XML creation.
5. **E4-AI-05 (E3-AI-02 deferred):** League/region/market mapping will be addressed in Story 5.2 or 5.3.

### From Epic 4 Retrospective – Dependencies

- Error surfacing patterns (InlineError, ErrorBanner, SystemErrorBar) are ready for multi-provider scenarios
- `IpcResult<T>` pattern established for all TRPC communication
- Keyboard navigation and copy workflow work with any feed content

### Key Risks from Epic 4 Retrospective

- **Rate limiting across multiple providers** – Each provider already has separate `Bottleneck` instance; verify parallel polling doesn't exceed quotas
- **Deduplication of opportunities** – Story 5.2 handles merging; this story just enables multiple providers

### Migration Strategy (Task 1.3)

```typescript
// On app start, one-time migration
function migrateToMultiProvider(): void {
  const enabledProviders = store.get('enabledProviders')
  if (enabledProviders === undefined) {
    const legacyActive = store.get('activeProviderId')
    if (legacyActive && isProviderConfigured(legacyActive)) {
      store.set('enabledProviders', [legacyActive])
    } else {
      store.set('enabledProviders', [])
    }
  }
}
```

### Project Structure Notes

- All new files follow existing patterns: PascalCase for components, camelCase for stores/utils
- TRPC procedures in `router.ts` continue to use `t.procedure` pattern with Zod input validation
- Tests co-located in `/tests/` directory following `{story-id}.test.cjs` naming

### References

- [Source: _bmad-output/architecture.md#Security and API Credential Handling]
- [Source: _bmad-output/architecture.md#Implementation Patterns – Lifecycle Patterns]
- [Source: _bmad-output/epics.md#Story 5.1 – Multi-Provider Configuration & Settings]
- [Source: _bmad-output/implementation-artifacts/epic-4-retro-2026-01-07.md#7. Next Epic Preparation]
- [Source: _bmad-output/implementation-artifacts/4-4-structured-error-surfacing-in-dashboard.md]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List
- Implemented multi-provider storage and backward migration
- Updated TRPC procedures for enabling/disabling providers
- Refactored poller to fetch from multiple enabled providers
- Redesigned ProviderSettings UI with per-provider cards and toggles
- Updated FeedStore and FeedTable to handle multi-provider data and display source badges
- Added comprehensive tests covering storage, poller, and hot reconfiguration
- **Fix (2026-01-10):** Connected Manual Fetch button in ProviderSettings directly to feedStore to ensure dashboard updates immediately (resolved data visibility disconnect).
- **Feat (2026-01-10):** Added Auto-Refresh configuration (Toggle & Interval) to ProviderSettings, persisted via `appSettingsStore` and hooked into `FeedPane`.

### File List
- src/main/services/storage.ts
- src/main/services/router.ts
- src/main/services/poller.ts
- src/main/services/calibration.ts (updated to use multi-provider polling API)
- src/preload/index.ts
- src/preload/index.d.ts
- src/renderer/src/features/settings/ProviderSettings.tsx
- src/renderer/src/features/dashboard/stores/feedStore.ts
- src/renderer/src/features/dashboard/FeedTable.tsx
- shared/types.ts
- shared/schemas.ts
- tests/5-1-multi-provider-configuration.test.cjs
- src/renderer/src/features/settings/stores/appSettingsStore.ts
- src/renderer/src/features/dashboard/hooks/useAutoRefresh.ts
