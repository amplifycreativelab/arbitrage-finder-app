# Arbitrage Finder App -- Epic Breakdown

**Author:** Bob (Scrum Master)\
**Date:** November 20, 2025\
**Project Level:** 3 (High Complexity)\
**Target Scale:** Single-user Desktop Application

------------------------------------------------------------------------

## Overview

This document provides the complete **epic and story breakdown** for the
Arbitrage Finder App, converting the PRD into detailed, implementable
Agile stories.

### Strategy

We follow a **Walking Skeleton** approach:

1. Secure runtime foundation  
2. Data engine ("the brain")  
3. Visualization layer ("the eyes")  
4. Interaction layer ("the hands")

### Context Integration

- **UX Theme:** "The Orange Terminal" (Dark mode #0F172A / Accent #F97316)  
- **Architecture:** electron-trpc, zustand, safeStorage, adapter pattern

------------------------------------------------------------------------

## Functional Requirements Inventory

  ID     Description
  ------ ------------------------------
  FR1    Select Active Data Provider
  FR2    Securely save API keys
  FR3    Filter Bookmakers by region
  FR4    Toggle sports
  FR5    Retrieve pre-calculated bets
  FR6    Calculate local arbs
  FR7    Normalize responses
  FR8    API rate limiting
  FR9    Sortable Data Grid
  FR10   Filter by ROI
  FR11   Filter by Market Type
  FR12   Highlight ROI
  FR13   Staleness Indicator
  FR14   One-click copy to clipboard
  FR15   Deep Scan all markets (raw odds)

------------------------------------------------------------------------

## FR Coverage Map

  Epic                    Covers
  ----------------------- ---------------------------------------
  Epic 1 -- Foundation    FR1, FR2, NFR3, NFR4
  Epic 2 -- Data Engine   FR5, FR6, FR7, FR8, NFR1, NFR2
  Epic 3 -- Dashboard     FR3, FR4, FR9, FR10, FR11, FR12, FR13
  Epic 4 -- Interaction   FR14
  Epic 5 -- Multi-Provider & Advanced Markets   FR3, FR4, FR5, FR6, FR7, FR9, FR10, FR11
  Epic 6 -- Enhanced Filtering & Desktop UX     FR3, FR6, FR9, FR10, FR11, FR13
  Epic 7 -- Deep Scan (All Markets)             FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR15
  Epic 8 -- Odds Browser & Surebet Tools        FR14, FR16, FR17, FR18

------------------------------------------------------------------------

## Architecture Touchpoints per Epic

- **Epic 1 – Foundation & Secure Configuration**
  - Main: `src/main/credentials.ts`, `src/main/services/storage.ts`
  - Preload: `preload/index.ts` (credentials/IPC surface)
  - Renderer: `renderer/src/features/settings/**`
  - Architecture refs: “Project Initialization”, “Security and API Credential Handling”, “Implementation Patterns – Naming/Structure/Location”

- **Epic 2 – Data Ingestion & Normalization Engine**
  - Main: `src/main/adapters/odds-api-io.ts`, `src/main/adapters/the-odds-api.ts`, `src/main/services/poller.ts`, `src/main/services/calculator.ts`
  - Shared: `shared/types.ts` (`ArbitrageOpportunity`), `shared/schemas.ts`
  - Architecture refs: “Data Architecture”, “High-Risk Domain Patterns – Rate Limiting (R-001)”, “High-Risk Domain Patterns – Arbitrage Correctness (R-002)”, “Implementation Patterns – Caching and Persistence”

- **Epic 3 – Dashboard & UX**
  - Renderer: `renderer/src/features/dashboard/FeedTable.tsx`, `SignalPreview.tsx`, filters and status components
  - State: Zustand stores for opportunities, filters, and statuses
  - Architecture refs: “UX Error and Degraded States”, “Error Handling, Logging, and Observability”, “Implementation Patterns – Lifecycle/Consistency”

- **Epic 4 – Interaction & Workflow Efficiency**
  - Renderer: dashboard interaction components and future `renderer/src/features/interaction/**`
  - Architecture refs: “Implementation Patterns – Naming/Structure”, “End-to-End Flow Diagram”, “For AI Agents (Summary)”

- **Epic 7 â€“ Deep Scan (All Markets)**
  - Main: `src/main/adapters/odds-api-io.ts`, `src/main/services/poller.ts`, `src/main/services/calculator.ts`
  - Shared: `shared/types.ts` (`ArbitrageOpportunity`, market metadata), `shared/schemas.ts`
  - Renderer: `renderer/src/features/dashboard/**`, `renderer/src/features/settings/**`
  - Architecture refs: â€œHigh-Risk Domain Patterns â€“ Rate Limiting (R-001)â€, â€œHigh-Risk Domain Patterns â€“ Arbitrage Correctness (R-002)â€

- **Epic 8 – Odds Browser & Surebet Tools**
  - Main: `src/main/services/currency.ts` (Frankfurt API integration)
  - Shared: `shared/types.ts` (`RawOddsPayload`, currency types), `shared/schemas.ts`
  - Renderer: 
    - `renderer/src/features/dashboard/SurebetCalculator.tsx` (calculator in main feed)
    - `renderer/src/features/odds-browser/**` (view-only odds browser)
  - State: Zustand stores for odds browser filters, calculator history, currency settings
  - Architecture refs: "Implementation Patterns – Caching and Persistence", "Implementation Patterns – Naming/Structure"

Each story below should be read together with these architecture touchpoints to avoid introducing ad-hoc patterns or file layouts.

# **Epic 1: Foundation & Secure Configuration**

Goal: Create secure Electron runtime with persistent encrypted settings.

------------------------------------------------------------------------

## **Story 1.1 -- Project Initialization & UI Scaffolding**

**As a Developer**\
I want to initialize the repo with Electron-Vite, Tailwind, and shadcn/ui\
So that the foundational UI matches the design system.

### Acceptance Criteria

- `npm run dev` launches Electron with dark theme (#0F172A)
- Text color off-white (#F8FAFC)
- Primary accent set to #F97316
- Folder structure matches `architecture.md`

### Technical Notes

- Use `npm create @quick-start/electron@latest ...`
- Install: zustand, electron-trpc, clsx, tailwind-merge

------------------------------------------------------------------------

## **Story 1.2 -- Secure Storage Service**

**As a User**\
I want API keys securely stored\
So that secrets are never stored in plain text.

### Acceptance Criteria

- Main process uses safeStorage encryption
- electron-trpc exposes `saveApiKey` and `getApiKey`
- Fallback only if safeStorage unavailable (Win11 requirement)

### Technical Notes

- Implement in `src/main/services/storage.ts`
- Use encrypted electron-store

------------------------------------------------------------------------

## **Story 1.3 -- Settings Interface & Provider Selection**

**As a User**\
I want to enter API keys and select the active provider\
So that the app runs in Test or Production mode.

### Acceptance Criteria

- shadcn `Select` for provider toggle
- shadcn password `Input` for keys
- Empty strings invalid
- Provider + keys persisted

------------------------------------------------------------------------

## **Story 1.4 -- Security Hardening & API Boundaries**

**As a Developer**\
I want strict boundaries around API credentials and secrets\
So that keys are never exposed in the UI layer or logs.

### Acceptance Criteria

- Renderer never persists API keys in global state, localStorage, or URLs; keys only exist in the settings form while editing.
- Preload exposes a minimal `credentials` surface (e.g. `saveApiKey`, `isProviderConfigured`) with no getter returning raw keys.
- A dedicated credentials module in the main process (e.g. `src/main/credentials.ts`) is the only code that reads/writes stored keys.
- An automated check (test or script) confirms that logs and IPC payloads never contain obvious key substrings.

### Links

- FR2 (Securely save API keys)
- Architecture: "Security and API Credential Handling"

------------------------------------------------------------------------

# **Epic 2: Data Ingestion & Normalization Engine**

Goal: Build the **Brain** of the system.

------------------------------------------------------------------------

## **Story 2.1 -- Adapter Pattern & Shared Types**

**As a Developer**\
I want a shared adapter interface and shared types\
So that all providers can be normalized into a single data model.

### Acceptance Criteria

- `ArbitrageOpportunity` defined per Architecture spec in `shared/types.ts`
- Base adapter interface (e.g. `ArbitrageAdapter`) defines `fetchOpportunities()`
- Both production and test adapters implement this interface

### Links

- FR7 (Normalize responses)

------------------------------------------------------------------------

## **Story 2.2 -- Rate Limiter Implementation**

**As a System**\
I want to throttle outgoing API requests\
So that quotas (e.g. 5,000 req/hr) are never violated.

### Acceptance Criteria

- bottleneck enforces minimum spacing between requests per provider (e.g. 720 ms)
- 429 responses trigger appropriate retry/backoff behavior
- Configuration for rate limits is centralized (not scattered across adapters)

### Links

- FR8 (API rate limiting)
- Architecture: "High-Risk Domain Patterns" → Rate Limiting (R-001, NFR1)

------------------------------------------------------------------------

## **Story 2.3 -- Rate Limit Calibration & Stress Harness**

**As a Developer**\
I want a calibration/stress mode for the poller and adapters\
So that we can tune Bottleneck settings and verify quotas are respected under load.

### Acceptance Criteria

- A dedicated calibration command (e.g. `npm run calibrate:providers`) runs a bounded-duration polling loop against test providers.
- Per-provider metrics are logged: request count, 2xx/4xx/5xx/429 counts, average/percentile latency.
- No provider exceeds documented quotas during calibration runs.
- The test harness can be invoked from CI to exercise rate-limiting behavior.

### Links

- Risk: R-001 (PERF – rate limiter misconfiguration)
- Test Design: P0/P1 perf scenarios for NFR1

------------------------------------------------------------------------

## **Story 2.4 -- Production Adapter (Odds-API.io)**

**As a User**\
I want to fetch pre-calculated arbs from the production provider\
So that I can see live surebet opportunities.

### Acceptance Criteria

- Calls the provider’s pre-calculated arbs endpoint (e.g. `/v3/arbitrage-bets`)
- Calls /v3/arbitrage-bets with a comma-separated `bookmakers=` parameter.
- The `bookmakers` value is sourced from the authenticated user’s selected bookmakers (Odds-API.io account-level selection), and is never hardcoded in the adapter.
- If no selected bookmakers are configured, the app surfaces an actionable error (prompting the user to select bookmakers in Settings) rather than silently polling a known-bad request.
- Strict mapping into `ArbitrageOpportunity`
- Region/sport filters applied according to PRD

### Links

- FR5 (Retrieve pre-calculated bets)
- FR7 (Normalize responses)

------------------------------------------------------------------------

## **Story 2.5 -- Test Adapter (The-Odds-API.com)**

**As a User**\
I want to calculate arbitrage opportunities locally from raw odds\
So that I can test the engine without relying on pre-calculated feeds.

### Acceptance Criteria

- Calls the provider’s raw odds endpoint
- Detects arbs using formula: `1/oddsA + 1/oddsB < 1`
- Returns formatted `ArbitrageOpportunity` objects via the shared adapter interface

### Links

- FR5, FR6, FR7
- Architecture: "High-Risk Domain Patterns" → Arbitrage Correctness (R-002)

------------------------------------------------------------------------

## **Story 2.6 -- Golden Dataset & Arbitrage Correctness Tests**

**As a Quant/Tester**\
I want a golden dataset and correctness tests for arbitrage calculation\
So that we can detect regressions and avoid false positives/negatives.

### Acceptance Criteria

- Golden odds snapshots for at least:
  - One Odds-API.io scenario with known arbitrage opportunities
  - One The-Odds-API.com scenario with local arbs
  - One "no surebets" scenario
- A pure calculator function accepts these fixtures and returns `ArbitrageOpportunity[]`.
- Tests verify expected arbs appear with correct ROI and mapping, and no extra/fake arbs are produced.
- Invariants enforced in tests: `roi >= 0`, legs reference distinct bookmakers, implied probability ≤ 1 (within tolerance).

### Links

- Risk: R-002 (DATA – arbitrage correctness)
- Test Design: P0 scenarios for arb detection & normalization

------------------------------------------------------------------------

## **Story 2.7 -- Logging & Observability Baseline**

**As a Developer**\
I want structured logging and basic observability for the data engine\
So that rate limiting, polling, and adapters can be monitored and debugged.

### Acceptance Criteria

- Main process uses `electron-log` with structured fields (timestamp, level, context, operation, providerId, correlationId, durationMs).
- All adapter calls and poller ticks log success/failure and key metrics (status, duration, number of opportunities).
- A lightweight heartbeat log entry records overall system health at a fixed interval.
- Tests or a log-scrubbing check confirm that no API keys or other secrets are ever written to logs.

### Links

- NFR1 (observability for performance/stability)
- Architecture: "Error Handling, Logging, and Observability"

------------------------------------------------------------------------

# **Epic 3: The Signal Dashboard (Visual Layer)**

Goal: High-density, scan-efficient view for surebet opportunities.

------------------------------------------------------------------------

## **Story 3.1 -- Main Layout & Split Pane**

**As a User**\
I want to see signals on the left and details on the right\
So that I can scan and inspect opportunities quickly.

### Acceptance Criteria

- Fixed-left pane (~400px), fluid right pane
- Background #0F172A
- Minimum width 900px

------------------------------------------------------------------------

## **Story 3.2 -- Feed (Left Pane Data Grid)**

**As a User**\
I want a sortable, scrollable grid of opportunities\
So that I can scan many surebets efficiently.

### Acceptance Criteria

- Each row shows at least: Time, Event, ROI (ROI highlighted in #F97316)
- Virtualized list if there are more than ~50 rows

### Links

- FR9 (Sortable Data Grid)
- FR12 (Highlight ROI)

------------------------------------------------------------------------

## **Story 3.3 -- Visual Staleness Logic**

**As a User**\
I want to recognize when data is old\
So that I don’t act on stale opportunities.

### Acceptance Criteria

- Items older than 5 minutes show reduced opacity (e.g. 50%)
- Label shows "Xm ago" based on `foundAt`
- Timer updates every 30 seconds

### Links

- FR13 (Staleness Indicator)
- Architecture: "Error Handling, Logging, and Observability" (heartbeat/staleness)

------------------------------------------------------------------------

## **Story 3.4 -- Filters & Controls**

**As a User**\
I want to filter by region, sport, and ROI\
So that I only see relevant opportunities.

### Acceptance Criteria

- Instant filtering (client-side via Zustand)
- Persistent filter preferences between sessions
- Region filters drive a secondary bookmaker selector, so that after choosing one or more regions the user can further restrict the feed to bookmakers available in those regions.

### Links

- FR3, FR4, FR10, FR11

------------------------------------------------------------------------

## **Story 3.5 -- Provider & System Status Indicators**

**As a User**\
I want to see provider and system health at a glance\
So that I can trust whether the current grid reflects reality.

### Acceptance Criteria

- The dashboard displays a system status chip (OK / Degraded / Error / Stale) derived from heartbeat and error data.
- Each configured provider has a status badge (OK / Degraded / Down / QuotaLimited / ConfigMissing).
- Provider failures show non-blocking banners with provider name, last-success time, and next recommended action.
- Stale or degraded states are visually distinct from "legitimately empty" results.

### Links

- FR13 (Staleness Indicator)
- Risks: R-001, R-005 (stale/frozen data)
- Architecture: "UX Error and Degraded States"

------------------------------------------------------------------------

# **Epic 4: Interaction & Workflow Efficiency**

Goal: Achieve "keyboard-first" operation.

------------------------------------------------------------------------

## **Story 4.1 -- Signal Preview Pane**

**As a User**\
I want a detailed preview of the selected signal\
So that I can quickly copy it into my workflow.

### Acceptance Criteria

- Displays full formatted payload for the selected `ArbitrageOpportunity`
- Uses monospace font
- Matches the intended downstream (e.g. Telegram) formatting

------------------------------------------------------------------------

## **Story 4.2 -- Keyboard Navigation**

**As a User**\
I want to navigate the feed purely via keyboard\
So that I can operate at high speed.

### Acceptance Criteria

- Arrow Up/Down changes the selected row
- Right pane updates instantly when selection changes
- The selected row is visually highlighted (e.g. `data-state="selected"`)

### Links

- FR14 (Keyboard-first workflows)

------------------------------------------------------------------------

## **Story 4.3 -- Copy & Advance Workflow**

**As a User**\
I want a one-key copy-and-advance flow\
So that I can rapidly process opportunities.

### Acceptance Criteria

- Pressing Enter or clicking "Copy Signal" copies the formatted payload to clipboard
- Button gives positive feedback (e.g. flashes green)
- Row is marked "Processed"
- Selection advances to the next unprocessed row

### Links

- FR14 (One-click copy to clipboard)

------------------------------------------------------------------------

## **Story 4.4 -- Structured Error Surfacing in Dashboard**

**As a User**\
I want clear, consistent error messages in the dashboard\
So that I understand what went wrong and what I can do next.

### Acceptance Criteria

- User errors (e.g. missing API key, invalid filters) show inline near the relevant control with specific guidance.
- Provider errors (e.g. 5xx, 429) show as banners and/or provider status badges without blocking unrelated workflows.
- System errors (unexpected failures) show a generic error bar with a prompt to retry and a reference to logs.
- Error payloads from IPC follow the discriminated union pattern defined in the architecture (`ok` / `error.category`, `code`, `correlationId`).

### Links

- Architecture: "Error Handling, Logging, and Observability"
- Risks: R-003, R-005 (security and ops issues)

------------------------------------------------------------------------

# **Epic 5: Multi-Provider & Advanced Markets**

Goal: Broaden bookmaker coverage and market types while preserving arbitrage correctness and UX simplicity.

------------------------------------------------------------------------

## **Story 5.1 -- Multi-Provider Configuration & Settings**

**As a User**\
I want to configure and enable multiple data providers at once\
So that I can increase bookmaker coverage without manually switching environments.

### Acceptance Criteria

- Settings surface allows enabling/disabling each provider independently, in addition to storing API keys.
- Active providers are persisted and loaded on app start without exposing raw keys to the renderer.
- If a provider is enabled but missing a valid API key, the dashboard shows a clear "ConfigMissing" / actionable status.
- Disabling a provider removes it from polling and status summaries without requiring an app restart.

### Links

- FR1 (Select Active Data Provider) — extended to multi-provider mode
- FR2 (Securely save API keys)
- Architecture: "Security and API Credential Handling"

------------------------------------------------------------------------

## **Story 5.2 -- Merged Multi-Provider Feed**

**As a User**\
I want a single, unified feed of arbitrage opportunities from all enabled providers\
So that I can see the best available surebets without thinking about underlying APIs.

### Acceptance Criteria

- Poller can fetch opportunities from all enabled providers in a single tick using the centralized rate limiter.
- Results from multiple providers are merged into a single `ArbitrageOpportunity[]` list with duplicate IDs deduplicated.
- Provider metadata for each opportunity is preserved so the UI can display the originating provider(s) when needed.
- Existing invariants (`roi >= 0`, distinct bookmakers, schema validation) still pass for the merged feed.

### Links

- FR5 (Retrieve pre-calculated bets)
- FR6 (Calculate local arbs)
- FR7 (Normalize responses)
- FR8 (API rate limiting)
- Risks: R-001 (rate limiter misconfiguration), R-002 (arbitrage correctness)

------------------------------------------------------------------------

## **Story 5.3 -- Additional Soccer Two-Way Markets**

**As a User**\
I want to see more two-way soccer markets beyond Moneyline, Draw No Bet, and Totals\
So that I can hunt surebets across a richer set of straightforward markets.

### Acceptance Criteria

- Adapters normalize additional two-way soccer markets (e.g. BTTS/Yes-No, Over/Under goals, 0-handicap variants) into the shared `ArbitrageOpportunity` model.
- Market strings from providers are mapped into canonical categories used by dashboard filters (e.g. `moneyline`, `draw-no-bet`, `totals`, `btts`, `handicap`).
- Dashboard filters include the new market categories and `inferMarketTypeFromOpportunity` correctly classifies opportunities for both production and test providers.
- Golden fixtures cover at least one new two-way market type and tests assert correct ROI, market classification, and formatting in the Signal Preview.

### Links

- FR3 (Filter Bookmakers by region) — indirectly via richer league coverage
- FR4 (Toggle sports)
- FR6 (Calculate local arbs)
- FR7 (Normalize responses)
- FR10 (Filter by ROI)
- FR11 (Filter by Market Type)
- FR12 (Highlight ROI)
- Risk: R-002 (arbitrage correctness)

------------------------------------------------------------------------

## **Story 5.4 -- Cross-Provider Arbitrage Aggregator (Advanced)**

**As a Power User**\
I want arbitrage opportunities that combine odds from different providers and bookmakers\
So that I can capture surebets that are only visible across feeds.

### Acceptance Criteria

- A new calculator accepts normalized market quotes from multiple providers and constructs cross-provider `ArbitrageOpportunity` pairs using the existing ROI formula.
- Event and market identifiers are normalized so that quotes from different APIs for the same underlying fixture and market can be safely combined.
- Cross-provider opportunities respect all existing invariants (`roi >= 0`, distinct bookmakers, validated schema) and are clearly labeled in the dashboard.
- Tests using a golden "cross-feed" dataset verify that expected multi-provider arbs are created and no spurious arbs are emitted when implied probabilities are ≥ 1.

### Links

- FR5 (Retrieve pre-calculated bets)
- FR6 (Calculate local arbs)
- FR7 (Normalize responses)
- FR9 (Sortable Data Grid)
- FR10 (Filter by ROI)
- FR11 (Filter by Market Type)
- Risks: R-001 (rate limiting), R-002 (arbitrage correctness), R-005 (stale/frozen data)

------------------------------------------------------------------------

## **Story 5.5 -- Advanced Soccer Markets & UI Selector**

**As a User**\
I want rich soccer markets (goals, handicaps, corners, cards, shots, offsides, fouls, time-based props)\
So that I can find surebets across the same breadth of binary markets that professional books offer.

### Acceptance Criteria

- Market coverage is expanded to include, at minimum, the following groups and examples (where available from providers):
  - Goals / Scoring: match and team totals O/U (FT, 1H, 2H), "Goal in Match/1H/2H/Both Halves – Yes/No", team to score / clean sheet, BTTS (FT, and 1H/2H when offered).
  - Handicaps: Asian handicaps (FT, 1H, 2H) and 2-way team spreads (e.g. Home -0.25/-0.5/-0.75/-1.0 vs Away +line).
  - Corners: match and team corner totals O/U (FT, 1H, 2H), corner handicaps (FT, 1H), corner race / "to reach X first", and corner occurrence binaries (e.g. Corner in Match/1H/after minute X – Yes/No).
  - Cards / Discipline: match and team card totals O/U (FT, 1H, 2H), red-card and booking binaries, and penalty-related Yes/No props when offered.
  - Shots & SOT: match and team totals O/U (FT, 1H, 2H), and player-level O/U where provider depth allows (shots, shots on target).
  - Offsides, fouls, tackles, saves, time-window binaries: totals and team/player O/U plus "before minute X"/"to happen" Yes/No markets where supported.
- Adapters map provider-specific market names and parameters into a normalized schema that tags each two-way market with:
  - a market group (e.g. `goals`, `handicap`, `corners`, `cards`, `shots`, `offsides`, `fouls`, `time-window`), and
  - a canonical key capturing side (match/team/player), period (FT/1H/2H), and parameter (e.g. line 2.5 goals, reach 5 corners first).
- The dashboard replaces the flat market chip row with a compact selector that can accommodate dozens of markets by:
  - grouping options by market group (Goals, Handicaps, Corners, Cards, Shots, Offsides, Fouls/Defence, Time Windows), and
  - allowing the user to quickly pick or search into specific markets without overflowing the layout.
- `inferMarketTypeFromOpportunity` and related filter logic are updated to use the new normalized tags so that:
  - Tier S markets (totals, Asian handicaps, team goals) and Tier A/B markets (corners, cards, BTTS, shots, offsides, fouls/saves) are filterable and composable with ROI filters.
- Golden fixtures and/or a curated test dataset include examples from at least Tier S and Tier A groups, and tests assert correct ROI, grouping, and Signal Preview formatting for these advanced markets.

### Links

- FR3 (Filter Bookmakers by region) �?" indirectly via richer league coverage
- FR4 (Toggle sports)
- FR6 (Calculate local arbs)
- FR7 (Normalize responses)
- FR9 (Sortable Data Grid)
- FR10 (Filter by ROI)
- FR11 (Filter by Market Type)
- FR12 (Highlight ROI)

------------------------------------------------------------------------

# **Epic 6: Enhanced Filtering & Desktop UX**

Goal: Expand market coverage to 20+ two-way markets, redesign filter UX for scalability, enable granular bookmaker selection per region, and optimize the desktop layout for full-screen use.

**Supersedes:** Story 5.5 (Advanced Soccer Markets & UI Selector) — Epic 6 provides a more comprehensive implementation of the same goals with additional UX improvements.

------------------------------------------------------------------------

## **Story 6.1 -- Expanded Two-Way Market Types**

**As a User**\
I want to see arbitrage opportunities across 20+ two-way soccer markets\
So that I can find surebets across corners, cards, shots, team-specific lines, and other binary markets.

### Acceptance Criteria

- Market types are expanded to include at minimum:
  - **Goals/Scoring**: Match totals O/U (FT, 1H, 2H), team totals O/U, BTTS (FT, 1H, 2H), Goal in 1H/2H Yes/No, clean sheet Yes/No
  - **Handicaps**: Asian handicaps (FT, 1H, 2H), European handicaps, team spread lines (-0.5, -1.0, -1.5, etc.)
  - **Corners**: Match corners O/U (FT, 1H, 2H), team corners O/U, corner handicaps, race to X corners
  - **Cards**: Match cards O/U (FT, 1H, 2H), team cards O/U, red card Yes/No, player to be booked
  - **Shots**: Match shots O/U, shots on target O/U, team shots O/U
  - **Other**: Offsides O/U, fouls O/U, penalty Yes/No, own goal Yes/No
- Each market is assigned to a **market group** for categorization: `goals`, `handicap`, `corners`, `cards`, `shots`, `other`
- Market normalization maps provider-specific strings to canonical keys (e.g., `corners_over_9.5_ft`, `cards_under_4.5_1h`)
- `inferMarketTypeFromOpportunity` is refactored to return a structured object `{ group: MarketGroup, key: string, label: string }` instead of a flat string
- Adapters (`odds-api-io`, `the-odds-api`) are updated to normalize new market types into the shared schema
- At least 5 golden fixtures are added covering new market groups (corners, cards, shots) with correct ROI and classification assertions

### Technical Notes

- Define `MarketGroup` enum: `goals | handicap | corners | cards | shots | other`
- Update `shared/types.ts` with `MarketMetadata` interface
- Consider provider-specific market availability (not all providers offer all markets)

### Links

- FR6 (Calculate local arbs)
- FR7 (Normalize responses)
- FR11 (Filter by Market Type)
- Risk: R-002 (arbitrage correctness)

------------------------------------------------------------------------

## **Story 6.2 -- Scalable Market Filter UI**

**As a User**\
I want a compact, searchable market filter that can handle 20+ market options\
So that I can quickly find and toggle specific markets without UI overflow.

### Acceptance Criteria

- The current 5-button market filter row is replaced with a **grouped dropdown/popover selector**
- Markets are organized by group (Goals, Handicaps, Corners, Cards, Shots, Other) with collapsible sections or tabs
- A **search/filter input** allows users to type and filter markets by name (e.g., typing "corner" shows only corner-related markets)
- Selected markets are displayed as compact chips below the selector (with X to remove)
- A "Select All" / "Clear All" action is available per group and globally
- Filter state persists across sessions via the existing Zustand store
- The filter UI fits within the existing dashboard layout without horizontal overflow
- Keyboard accessibility: Tab navigation through groups, Enter/Space to toggle markets

### Technical Notes

- Use shadcn/ui `Popover` + `Command` (combobox) pattern for searchable multi-select
- Consider virtualization if market list exceeds 50 items
- Update `feedFiltersStore.ts` to handle `MarketGroup` + individual market toggles

### Links

- FR10 (Filter by ROI)
- FR11 (Filter by Market Type)
- Architecture: "Implementation Patterns – Naming/Structure"

------------------------------------------------------------------------

## **Story 6.3 -- Cascading Bookmaker Selection by Region**

**As a User**\
I want to select specific bookmakers within my chosen regions\
So that I can focus on bookmakers I actually use instead of seeing all available options.

### Acceptance Criteria

- When one or more **regions are selected**, a secondary bookmaker filter appears showing only bookmakers available in those regions
- Bookmakers are sourced from the current feed data (opportunities that match the selected regions)
- The bookmaker selector uses a **multi-select dropdown** or checkbox list (not inline chips for 15+ bookmakers)
- Bookmaker selections are **persisted per region combination** (e.g., "UK + IT" remembers different selections than "UK only")
- When no bookmakers are explicitly selected, all bookmakers in the selected regions are included (current behavior)
- A "Select All" / "Clear All" action is available for bookmakers
- The UI clearly indicates the cascade relationship: Region → Bookmaker
- If region selection changes, bookmaker selections are reset or filtered to only valid options

### Technical Notes

- Extend `feedFiltersStore.ts` to track `selectedBookmakersByRegion: Record<string, string[]>` or derive dynamically
- Bookmaker availability may differ between providers; handle gracefully
- Consider a two-column layout: Regions on left, Bookmakers on right

### Links

- FR3 (Filter Bookmakers by region)
- Story 3.4 (Filters & Controls)

------------------------------------------------------------------------

## **Story 6.4 -- Full-Width Desktop Layout**

**As a User**\
I want the application to use the full available screen width\
So that I can see more data and work efficiently on my desktop monitor.

### Acceptance Criteria

- The `max-w-6xl` constraint is **removed or significantly increased** from the header, main content, and dashboard areas
- The layout adapts fluidly to viewport widths from 1024px to 2560px+
- The feed pane (left) and signal preview pane (right) share the available width proportionally or with configurable column widths
- On ultra-wide displays (≥1920px), additional horizontal space is used effectively (e.g., wider table columns, more visible data)
- The split pane maintains usable proportions at all supported widths (min-width constraints prevent unusable narrow panes)
- Typography and spacing scale appropriately for larger widths (no awkward stretched layouts)
- The header and footer (if any) span the full width with appropriate internal padding

### Technical Notes

- Update `App.tsx`: Remove `max-w-6xl` from header and main content divs
- Update `DashboardLayout.tsx`: Adjust pane width constraints (current: `w-[380px] min-w-[360px] max-w-[440px]`)
- Consider CSS `fr` units or percentage-based widths for fluid columns
- Test at 1280px, 1920px, and 2560px viewports

### Links

- Story 3.1 (Main Layout & Split Pane)
- Architecture: "Implementation Patterns – Naming/Structure"

------------------------------------------------------------------------

# **Epic 7: Deep Scan (All Markets via /v3/odds + /v3/odds/multi)**

Goal: Maximize arbitrage discovery by fetching raw odds via Odds-API.io `/v3/odds` (single) and `/v3/odds/multi` (batch) for **all events and markets**, calculating arbitrage locally. Deep Scan operates as the **primary discovery mechanism** running continuously alongside regular polling, ensuring no arbitrage opportunity is missed across any market type (corners, cards, goals, handicaps, etc.).

**Design Philosophy:** Arbitrage opportunities are rare and time-sensitive. With 5,000 requests/hour capacity, the system should scan aggressively across all available events and markets rather than waiting for user-initiated scans. The existing `/arbitrage-bets` endpoint provides a fast initial feed, while Continuous Deep Scan ensures comprehensive coverage of all two-way markets.

Note: Three-way market support (e.g., 1X2 / Moneyline-with-draw) is out of scope for the current Deep Scan arbitrage engine and best-odds comparison; these markets can still be surfaced in the Odds Browser as raw odds.

------------------------------------------------------------------------

## **Story 7.1 -- Deep Scan Mode (Hybrid Feed)**

**As a User**\
I want a "Deep Scan" mode that searches all markets for selected events/leagues\
So that I can find arbitrage opportunities beyond Moneyline.

### Acceptance Criteria

- Existing feed behavior is preserved: `/arbitrage-bets` continues to provide quick Moneyline opportunities
- A new Deep Scan entrypoint exists (button or toggle) that:
  - runs on-demand (not continuous polling by default)
  - shows scan progress (events scanned, requests made, time elapsed)
  - supports cancel/stop without leaving stale loading states
- Deep Scan results are merged into the feed and clearly labeled (e.g., `source: deepScan`)
- The user can set Deep Scan scope (at minimum: specific event; optional: league/sport batch)
- Per-market (or per-market-group) minimum ROI thresholds are supported for Deep Scan results

### Technical Notes

- Prefer an explicit TRPC procedure (e.g., `deepScan.start`, `deepScan.cancel`, `deepScan.status`) instead of overloading the existing poller RPC
- Reuse the existing rate limiting and structured logging patterns for scan telemetry

### Links

- FR5 (Retrieve pre-calculated bets)
- FR6 (Calculate local arbs)
- FR8 (API rate limiting)
- FR10 (Filter by ROI)
- FR15 (Deep Scan all markets)

------------------------------------------------------------------------

## **Story 7.2 -- Continuous Deep Scan Mode**

**As a User**\
I want Deep Scan to run automatically and continuously\
So that I never miss arbitrage opportunities across any market without manual intervention.

### Acceptance Criteria

- A **"Continuous Deep Scan"** toggle exists in Settings (default: **ON**)
- When enabled, Deep Scan runs automatically after each regular poll cycle completes
- The system automatically discovers all upcoming events from enabled sports/leagues via `/events` endpoint
- No manual scope selection required - scans all available events by default
- Deep Scan results merge seamlessly into the main feed in real-time
- The UI displays continuous scan status (events scanned, opportunities found, last scan time)
- Users can still trigger manual Deep Scans for targeted searches when needed (existing Story 7.1 functionality preserved)

### Technical Notes

- Implement a scheduler in `deepScan.ts` that triggers after `pollOnceForEnabledProviders()` completes
- Add `continuousDeepScanEnabled: boolean` to app settings store (persisted)
- With 5,000 req/hour (~1.4 req/sec), budget allows scanning 80-100 events/hour at full market depth
- Prioritize events by start time (soonest first) to maximize actionable opportunities
- Skip events already scanned within a configurable TTL (e.g., 5 minutes) to avoid redundant API calls

### Links

- FR5 (Retrieve pre-calculated bets)
- FR6 (Calculate local arbs)
- FR8 (API rate limiting)
- FR15 (Deep Scan all markets)

------------------------------------------------------------------------

## **Story 7.3 -- Automatic Event Discovery & Batch Scanning**

**As a Developer**\
I want the system to automatically discover and batch-scan all available events\
So that Continuous Deep Scan covers the full event landscape without manual configuration.

### Acceptance Criteria

- The system fetches all upcoming events via `/events` endpoint for each enabled sport
- Events are sorted by start time (ascending) to prioritize imminent matches
- Batch scanning processes events in configurable chunks (default: 10-20 events per cycle)
- Each event retrieves odds via `/odds?eventId={id}&bookmakers={list}` for **all available markets**
- Bookmaker selection uses the user's configured bookmakers/regions from Settings
- A **scan cache** tracks recently scanned events to avoid redundant API calls:
  - Cache key: `eventId + bookmakerHash`
  - TTL: configurable (default 5 minutes, adjustable in Settings)
  - Cache invalidation on bookmaker selection change
- Logging includes: events discovered, events scanned (new vs cached), markets retrieved, opportunities found
- Progress is visible in the UI status bar during continuous scanning

### Technical Notes

- Extend `deepScan.ts` with `discoverAllEvents()` function that queries `/events` without scope restrictions
- Implement event prioritization: live/starting soon > today > future
- Use bounded concurrency (default: 5 concurrent requests) to balance throughput and rate limits
- Store scan timestamps per event in memory to enforce TTL-based deduplication
- Consider adding a "scan budget" setting: max events per cycle (e.g., 50) to control API usage

### Links

- FR3 (Filter Bookmakers by region)
- FR7 (Normalize responses)
- FR8 (API rate limiting)
- FR15 (Deep Scan all markets)

------------------------------------------------------------------------

## **Story 7.4 -- Comprehensive Market Normalization**

**As a Developer**\
I want all `/odds` markets normalized into canonical keys supporting the full breadth of two-way markets\
So that Continuous Deep Scan can find arbitrage across every market type the API provides.

### Acceptance Criteria

- `/odds` response parsing produces normalized outcomes for **all two-way markets**, including:
  - **Goals/Scoring**: Match totals O/U, team totals O/U, BTTS, Goal in 1H/2H, clean sheet
  - **Handicaps**: Asian handicaps, European handicaps, team spreads
  - **Corners**: Match/team corners O/U, corner handicaps, race to X corners
  - **Cards**: Match/team cards O/U, red card Yes/No, player bookings
  - **Shots**: Match/team shots O/U, shots on target O/U
  - **Other**: Offsides O/U, fouls O/U, penalty Yes/No, own goal Yes/No
- Each normalized market includes:
  - canonical market key (e.g., `corners_over_9.5_ft`, `cards_red_yes_ft`)
  - market group (aligns with Epic 6: `goals`, `handicap`, `corners`, `cards`, `shots`, `other`)
  - human-readable label for UI display
  - line/parameter value where applicable (e.g., 9.5 for corners O/U 9.5)
- Normalization handles provider naming variance (case, punctuation, abbreviations)
- Unknown/unsupported markets are logged at debug level and skipped (no crashes)
- **No minimum ROI threshold by default** - all arbitrage opportunities are surfaced regardless of ROI (user can filter in UI)
- Golden fixtures cover: Moneyline, Corners O/U, Cards O/U, BTTS, Asian Handicap, Red Card Yes/No

### Technical Notes

- Extend `inferMarketMetadata()` to handle all market types from Odds-API.io `/odds` response
- Create a market key registry mapping provider strings to canonical keys
- Reuse Epic 6's `MarketMetadata` / `MarketGroup` types for consistency
- Consider fuzzy matching for market name variations across bookmakers

### Links

- FR7 (Normalize responses)
- FR11 (Filter by Market Type)
- FR15 (Deep Scan all markets)

------------------------------------------------------------------------

## **Story 7.5 -- Exhaustive Arbitrage Detection Engine**

**As a User**\
I want the app to find every possible arbitrage opportunity across all markets and bookmakers\
So that I maximize my chances of finding profitable surebets.

### Acceptance Criteria

- The arbitrage engine computes opportunities from raw odds by:
  - Collecting best prices per outcome across **all configured bookmakers**
  - Calculating ROI using the standard formula: `ROI = (1 - (1/oddsA + 1/oddsB)) * 100`
  - Selecting the optimal bookmaker pair that maximizes ROI for each market
- **All two-way markets** are supported: O/U, Yes/No, team totals, handicaps, corners, cards, shots, etc.
- Markets with incomplete outcome sets (missing one side from all bookmakers) are excluded
- **No ROI floor by default** - opportunities with any positive ROI are included (filtering happens in UI)
- Resulting opportunities include:
  - participating bookmakers with their respective odds
  - implied probabilities for each leg
  - ROI percentage
  - normalized market metadata (group, key, label)
  - stable `opportunityId` derived from: `event + market key + bookmakers + outcomes`
  - `source: 'deepScan'` tag to distinguish from pre-calculated feed
- **Best odds comparison**: For each market, the engine identifies which bookmaker offers the best odds for each outcome (useful for users who want to compare lines even without arbitrage)
- Regression tests verify:
  - Non-ML markets (Corners O/U, Red Card Yes/No) produce valid opportunities
  - Cross-bookmaker best price selection works correctly
  - Edge cases: identical odds, single bookmaker markets, extremely low ROI

### Technical Notes

- The existing `buildOpportunitiesFromRawOdds()` function handles this logic
- Consider adding a "best odds" view mode that shows optimal bookmaker per outcome (even without arb)
- 3-way markets (soccer 1X2) can be supported by checking all 3 pairwise combinations, but start with 2-way only

### Links

- FR6 (Calculate local arbs)
- FR9 (Sortable Data Grid)
- FR10 (Filter by ROI)
- FR11 (Filter by Market Type)
- FR15 (Deep Scan all markets)

------------------------------------------------------------------------

## **Story 7.6 -- Continuous Deep Scan Settings & Status UI**

**As a User**\
I want to configure Continuous Deep Scan behavior and monitor its status\
So that I can control how aggressively the system scans and see what it's doing.

### Acceptance Criteria

- **Settings Panel** (in Provider Settings or new Deep Scan section):
  - Toggle: "Continuous Deep Scan" (default: ON)
  - Dropdown: "Scan Scope" - All Sports / Selected Sports / Selected Leagues
  - Number input: "Scan Interval" - minutes between full scan cycles (default: 5 min)
  - Number input: "Event Cache TTL" - minutes before re-scanning same event (default: 5 min)
  - Number input: "Max Events Per Cycle" - budget limit per scan (default: 50, max: 200)
  - Number input: "Concurrent Requests" - parallel API calls (default: 5, max: 10)
  - All settings persisted to app settings store

- **Status Bar Integration**:
  - Show Deep Scan status: "Scanning 12/47 events..." or "Idle - Last scan: 2m ago"
  - Show running totals: "Deep Scan: 156 opportunities found today"
  - Visual indicator when scan is active (subtle animation or icon)

- **Deep Scan Panel** (existing UI, enhanced):
  - Real-time progress: events scanned, requests made, opportunities found, elapsed time
  - "Pause/Resume" button for Continuous Deep Scan (distinct from Cancel)
  - History: last 5 scan cycles with summary stats
  - Manual scan button remains available for targeted single-event scans

- **Performance Guardrails**:
  - Warning if settings would exceed 5,000 req/hour budget
  - Auto-throttle if approaching rate limit (reduce concurrency dynamically)
  - Clear feedback when rate-limited: "Scan paused - rate limit reached, resuming in Xm"

### Technical Notes

- Add settings to `appSettingsStore.ts`:
  ```typescript
  continuousDeepScanEnabled: boolean
  deepScanIntervalMinutes: number
  deepScanEventCacheTtlMinutes: number
  deepScanMaxEventsPerCycle: number
  deepScanConcurrentRequests: number
  ```
- Create new TRPC endpoints:
  - `deepScan.pauseContinuous` / `deepScan.resumeContinuous`
  - `deepScan.getConfig` / `deepScan.setConfig`
- Status bar component reads from `deepScanStore` for real-time updates

### Links

- FR1 (Select Active Data Provider)
- FR8 (API rate limiting)
- FR15 (Deep Scan all markets)

------------------------------------------------------------------------

## **Story 7.7 -- Odds Comparison View**

**As a User**\
I want to see which bookmaker offers the best odds for each outcome\
So that I can place bets at the best available price even when no arbitrage exists.

### Acceptance Criteria

- A new view mode or panel displays **best odds comparison** for selected events/markets
- For each two-way market outcome, shows:
  - Best available odds and which bookmaker offers them
  - Comparison across all configured bookmakers (sorted by odds descending)
  - Visual highlighting of the best price
- Users can filter by market group (Goals, Corners, Cards, etc.)
- One-click copy of odds/bookmaker info to clipboard
- This view uses the same raw odds data collected by Deep Scan (no additional API calls)
- Useful even when no arbitrage exists - helps users find value bets
- Clarification: Best odds comparison currently focuses on **two-way markets** only (3-way markets are excluded until explicitly supported).

### Technical Notes

- Reuse `RawOddsPayload` data structure from Deep Scan
- Add a `bestOddsView` component in dashboard
- Consider caching odds snapshots for comparison over time (see odds movement)

### Links

- FR9 (Sortable Data Grid)
- FR14 (One-click copy to clipboard)
- FR15 (Deep Scan all markets)

------------------------------------------------------------------------

## **Story 7.8 -- API Efficiency & Advanced Features**

**As a Developer**\
I want to maximize API efficiency using batch endpoints, incremental updates, and advanced filtering\
So that the system can scan 10x more events within the same rate limit budget while providing richer data.

### Background

The odds-api.io API provides several advanced endpoints and parameters that are not currently utilized:
- **`/v3/odds/multi`**: Batch fetch odds for up to 10 events per request (vs 1 event per request currently)
- **`/v3/odds/updated`**: Incremental updates returning only odds changed since a timestamp
- **`/v3/events/live`**: Single endpoint returning all in-play events across sports
- **Time-range filtering**: `/events` supports `from`/`to` parameters to filter by event start time
- **Response enrichment**: API returns bookmaker URLs and market timestamps not currently extracted

**API Documentation Reference**: https://docs.odds-api.io/

### Acceptance Criteria

#### Critical: Batch Odds Fetching (90% API Call Reduction)

- [x] Replace single-event `/v3/odds` calls with batched `/v3/odds/multi` endpoint
- [x] Batch up to 10 events per request (API maximum)
- [x] Adjust concurrency settings to account for batching (e.g., 5 concurrent batched requests = 50 events in flight)
- [x] Maintain existing error handling per-event within batch responses
- [x] Update quota tracking to reflect actual request count (not event count)
- [ ] **Expected impact**: With 5,000 req/hour limit:
  - Current: ~80-100 events/hour (1 request per event)
  - After: ~800-1,000 events/hour (10 events per request)

Contract note (resolved): `/v3/odds/multi` may return `bookmakers` as an object map (not an array). Deep Scan must normalize this shape into `RawOddsPayload` so Odds Browser and best-odds caches populate correctly in batch mode.

#### Critical: Time-Range Filtering for Event Discovery

- [x] Add `from` and `to` parameters to `/v3/events` requests
- [x] Default scan horizon: events starting within next 4 hours (configurable)
- [ ] Settings option: "Scan Horizon" dropdown (1h, 2h, 4h, 8h, 24h, All) (UI deferred)
- [x] Reduce data transfer by excluding distant future events from discovery
- [x] Prioritization logic remains: live > starting soon > later today

#### High Value: Incremental Odds Updates

- [x] Track `lastFetchTimestamp` per scan cycle
- [x] Implement optional `/v3/odds/updated?since={timestamp}` polling mode (fetcher ready)
- [x] Settings toggle: "Use Incremental Updates" (default: ON for continuous scan)
- [~] Fall back to full fetch if incremental returns empty or errors (integration deferred)
- [x] Benefit: Detect odds movements and reduce redundant data transfer

#### High Value: Live Events Mode

- [x] Add `/v3/events/live` endpoint integration (fetcher ready)
- [x] Settings option: "Scan Mode" dropdown (All Events / Live Only / Upcoming Only) (setting ready, UI deferred)
- [~] "Live Only" mode uses single `/events/live` request instead of per-sport queries (integration deferred)
- [ ] UI indicator when in Live-only mode (UI deferred)
- [x] Benefit: Focus on in-play arbitrage with highest volatility

#### Medium Value: Bookmaker Direct Links

- [x] Extract `urls` object from odds responses containing direct bookmaker links
- [x] Store bookmaker URLs in `ArbitrageOpportunity` as `bookmakerUrls?: Record<string, string>`
- [ ] Display "Place Bet" button in Signal Preview pane that opens bookmaker URL (UI deferred)
- [ ] Keyboard shortcut (e.g., `B`) to open best bookmaker link for selected opportunity (UI deferred)
- [x] Benefit: Reduce time from discovery to bet placement

#### Medium Value: True Market Freshness

- [x] Extract `updatedAt` timestamp from each market in odds responses
- [x] Store as `marketUpdatedAt: string` in opportunity data
- [~] Calculate staleness from `marketUpdatedAt` (not just `foundAt`) (UI/logic deferred)
- [ ] Display "Odds updated Xm ago" in addition to "Found Xm ago" (UI deferred)
- [ ] Visual warning if `marketUpdatedAt` > 5 minutes old (configurable threshold) (UI deferred)
- [x] Benefit: Distinguish between "we found it late" vs "odds are actually stale"

#### Nice to Have: Dynamic Rate Limit Tracking

- [ ] Parse rate limit headers from API responses:
  - `X-RateLimit-Limit`: Total hourly quota
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Timestamp when quota resets
- [ ] Use actual remaining quota instead of estimated count
- [ ] Display real quota status in Deep Scan panel
- [ ] Auto-adjust concurrency based on remaining quota percentage
- [ ] Benefit: More accurate throttling, avoid hardcoded assumptions

#### Nice to Have: Odds Movement Tracking

- [ ] Implement `/v3/odds/movements` endpoint integration for detailed history (deferred)
- [x] Store last N odds snapshots per opportunity (configurable, default: 3)
- [x] Calculate and display odds trend: ↑ improving, ↓ worsening, → stable
- [x] "Movement" column in feed showing trend indicator
- [x] Benefit: Timing signal for when to act on an opportunity

### Technical Notes

#### Batch Odds Implementation

```typescript
// Current (inefficient):
for (const event of events) {
  const odds = await fetch(`/v3/odds?eventId=${event.id}&bookmakers=${list}`)
}

// New (batched):
const BATCH_SIZE = 10
for (let i = 0; i < events.length; i += BATCH_SIZE) {
  const batch = events.slice(i, i + BATCH_SIZE)
  const eventIds = batch.map(e => e.id).join(',')
  const odds = await fetch(`/v3/odds/multi?eventIds=${eventIds}&bookmakers=${list}`)
  // Response is array of event odds objects
}
```

#### Files to Modify

| File | Changes |
|------|---------|
| `src/main/services/deepScan.ts` | Add batch fetcher, time filtering, incremental mode |
| `src/main/adapters/odds-api-io.ts` | Extract URLs and timestamps in normalization |
| `shared/types.ts` | Add `bookmakerUrls`, `marketUpdatedAt` to `ArbitrageOpportunity` |
| `src/renderer/src/features/dashboard/SignalPreview.tsx` | Add "Place Bet" button |
| `src/renderer/src/features/settings/DeepScanSettings.tsx` | Add new settings controls |

#### New Constants

```typescript
const ODDS_API_IO_ODDS_MULTI_PATH = '/v3/odds/multi'
const ODDS_API_IO_ODDS_UPDATED_PATH = '/v3/odds/updated'
const ODDS_API_IO_EVENTS_LIVE_PATH = '/v3/events/live'
const BATCH_SIZE_MAX = 10 // API limit
const DEFAULT_SCAN_HORIZON_HOURS = 4
```

#### Settings Schema Extension

```typescript
interface DeepScanConfig {
  // ... existing fields ...

  // New fields for Story 7.8
  useBatchOdds: boolean           // default: true
  useIncrementalUpdates: boolean  // default: true
  scanHorizonHours: number        // default: 4
  scanMode: 'all' | 'live' | 'upcoming'  // default: 'all'
  marketFreshnessThresholdMinutes: number  // default: 5
  trackOddsMovements: boolean     // default: false (nice-to-have)
}
```

### Testing Requirements

- [ ] Unit tests for batch request construction and response parsing
- [ ] Unit tests for incremental update timestamp tracking
- [ ] Integration test: batch mode reduces request count by ~90%
- [ ] Integration test: time-range filtering reduces event count
- [ ] Golden fixtures for `/odds/multi` response format
- [ ] Test: bookmaker URLs correctly extracted and displayed
- [ ] Test: market timestamps correctly parsed and staleness calculated

### Performance Expectations

| Metric | Before | After |
|--------|--------|-------|
| Events scanned per hour | 80-100 | 800-1,000 |
| API requests per 50 events | 50 | 5 |
| Time to scan 50 events | ~35s (at 1.4 req/s) | ~3.5s |
| Data freshness awareness | Scan time only | True market update time |

### Migration Notes

- Batch mode should be **opt-out** (enabled by default) for immediate benefit
- Existing scan cache logic remains valid (cache by eventId)
- No breaking changes to `ArbitrageOpportunity` interface (new fields are optional)
- Incremental mode can be disabled if API behavior is unexpected

### Links

- FR5 (Retrieve pre-calculated bets)
- FR6 (Calculate local arbs)
- FR8 (API rate limiting)
- FR15 (Deep Scan all markets)
- Architecture: "External Provider APIs (Odds-API.io)"

------------------------------------------------------------------------

## **Story 7.9 -- Sport/League Filter Configuration**

**As a User**\
I want to configure specific sports and leagues for Deep Scan filtering\
So that I can focus API quota on high-value leagues with good bookmaker coverage.

### Acceptance Criteria

- [x] **League Presets**: Predefined configurations for major league groupings:
  - Top 5 European Leagues (Premier League, La Liga, Serie A, Bundesliga, Ligue 1)
  - European Elite (Top 5 + Champions League, Europa League, Conference League)
  - Major European (Top 5 + Portugal, Netherlands, Belgium, Turkey, Scotland)
  - English Football (All English tiers + cups)
  - International (World Cup, Euro, Nations League)
- [x] Presets can be applied with a single click from the Deep Scan panel
- [x] **Sport Filter UI**: When scan scope is 'selected-sports':
  - Fetch available sports from `/v3/sports` API endpoint
  - Multi-select with toggle buttons
  - "Refresh Sports" button to fetch latest
- [x] **League Filter UI**: When scan scope is 'selected-leagues':
  - Fetch available leagues from `/v3/leagues` endpoint (per sport)
  - Show league name and active events count
  - Chip-based multi-select UI with removable selections
  - Leagues sorted by events count (highest first)
- [x] **Backend Integration**:
  - TRPC endpoints for fetching sports/leagues and applying presets
  - Preload API exposure for renderer access
  - Filters integrated with existing scanScope logic in Deep Scan

### Technical Notes

- Extends Story 7.6's scan scope setting with actual filter configuration
- Uses odds-api.io `/v3/sports` and `/v3/leagues` endpoints
- League slugs match odds-api.io naming convention (e.g., "england-premier-league")
- Preset application sets scanScope to 'selected-leagues' automatically

### Files Modified

| File | Changes |
|------|---------|
| `src/main/services/deepScan.ts` | Sport/league fetch functions, presets, state management |
| `src/main/services/router.ts` | TRPC endpoints for sport/league operations |
| `src/preload/index.ts` | DeepScanAPI methods for sport/league filters |
| `src/preload/index.d.ts` | Type declarations |
| `src/renderer/src/features/dashboard/SportLeagueFilter.tsx` | New UI component |
| `src/renderer/src/features/dashboard/DeepScanPanel.tsx` | Integration |

### Links

- Story 7.6 (Continuous Deep Scan Settings)
- Story 7.3 (Automatic Event Discovery)
- FR8 (API rate limiting)

------------------------------------------------------------------------

# **Epic 8: Odds Browser & Surebet Tools**

Goal: Provide a bookmaker-style odds browser with integrated surebet calculator and multi-currency support for professional betting workflows.

------------------------------------------------------------------------

## **Story 8.1 -- Odds Browser Tab & Grid View**

**As a User**\
I want to browse raw odds in a bookmaker-style grid view\
So that I can explore all available odds across sports, leagues, and events systematically.

### Acceptance Criteria

- New tab "Odds Browser" appears alongside the main Arbitrage feed
- Grid displays odds grouped hierarchically: Sport → League → Event → Market
- Columns include: Event (teams), Market Type, Bookmaker, Odds, Last Updated
- Sortable columns: Sport, League, Event Time, Market Type, Odds value
- Filters available:
  - Sport multi-select (e.g., Soccer, Basketball, Tennis)
  - League multi-select (dependent on selected sports)
  - Event search (team name fuzzy match)
  - Market type filter (Moneyline, Totals, Handicaps, etc.)
  - Bookmaker filter
- Real-time updates as new Deep Scan data arrives
- Virtualized list for performance with 1000+ rows
- Row highlighting on hover; click to select an outcome

### Technical Notes

- Reuse `RawOddsPayload` data structure from Deep Scan (Story 7.x)
- Create `OddsBrowserStore` with Zustand for filter state persistence
- Implement hierarchical grouping with collapsible sections
- Use shadcn/ui `Table` with sorting and filtering capabilities
- Data source: Cached Deep Scan odds (no additional API calls)

### Links

- FR16 (Browse raw odds in bookmaker-style view)
- Story 7.4 (Comprehensive Market Normalization)
- Story 7.7 (Odds Comparison View)

------------------------------------------------------------------------

## **Story 8.2 -- Odds Selection & Comparison Integration**

**As a User**\
I want to select any odd in the browser and immediately see the odds comparison view\
So that I can compare prices across all bookmakers for that specific market.

### Acceptance Criteria

- Clicking any odd in the Odds Browser opens the **Odds Comparison Panel**
- Comparison panel shows:
  - Selected event and market context
  - All bookmakers offering that market, sorted by odds (best first)
  - Highlighting of the best price per outcome
  - Visual indicator showing the selected odd's rank (e.g., "3rd best")
- Panel can be docked (side view) or floating (modal)
- "Pin" feature to keep comparison visible while browsing other odds
- Copy odds info to clipboard from comparison panel
- Updates in real-time as new odds arrive

### Technical Notes

- Reuse existing `bestOddsView` component from Story 7.7
- Extend comparison logic to work with single-outcome selection
- Add selection state to `OddsBrowserStore`
- Consider keyboard shortcut (Space or Enter) to open comparison for selected row

### Links

- FR16 (Browse raw odds in bookmaker-style view)
- Story 7.7 (Odds Comparison View)

------------------------------------------------------------------------

## **Story 8.3 -- Surebet Calculator Core**

**As a User**\
I want a surebet calculator that tells me exactly how much to bet on each side\
So that I can lock in guaranteed profit regardless of the outcome.

### Acceptance Criteria

- Calculator is integrated directly into the **main Arbitrage/Surebet feed tab**
- Accessible via:
  - "Calculate Stakes" button on each surebet opportunity row
  - Keyboard shortcut (e.g., 'C') when a surebet row is selected
  - Context menu on right-click of any opportunity
- Calculator appears as an **inline panel or modal** within the surebet feed:
  - When activated, pre-populates with the selected opportunity's data
  - Bookmakers and odds are read-only (from the opportunity)
  - User enters stake amount for one side, other side auto-calculates
- Input fields:
  - Outcome A: Bookmaker (read-only), Odds (read-only), Stake amount (editable or auto-calculated)
  - Outcome B: Bookmaker (read-only), Odds (read-only), Stake amount (editable or auto-calculated)
  - Optional: Total bankroll to risk (auto-distributes optimally)
- Output displays:
  - Recommended stake for each outcome
  - Total investment (sum of both stakes)
  - Guaranteed profit amount
  - ROI percentage
  - Profit breakdown per outcome (should be equal for pure arbitrage)
- Supports both "total stake" and "target profit" modes:
  - "I want to invest $100 total" → calculates optimal split
  - "I want to make $10 profit" → calculates required stakes
- Visual warning if the selected opportunity is stale (>5 min old) or no longer valid
- History of recent calculations (last 20, persisted), accessible from the calculator panel

### Technical Notes

- Core formula for optimal stake distribution:
  - `stakeA = totalStake * (1/oddsA) / (1/oddsA + 1/oddsB)`
  - `stakeB = totalStake * (1/oddsB) / (1/oddsA + 1/oddsB)`
- Create `SurebetCalculator` component as a reusable panel/modal
- Store calculation history in `appSettingsStore`
- Add "copy bet slip" feature formatted for common bookmaker interfaces
- Integrate with existing opportunity selection state in the feed

### Links

- FR17 (Surebet stake calculation)
- Epic 3 (Dashboard - Signal Preview Pane)
- Story 4.1 (Signal Preview Pane)

------------------------------------------------------------------------

## **Story 8.4 -- Currency Exchange Rate Service**

**As a User**\
I want to see exchange rates for USD, AUD, and EUR\
So that I can calculate stakes and profits in my preferred currency.
Different bookmakers use different currencies.
When placing bets, I need to calculate the correct stake amounts in different currencies.

### Acceptance Criteria

- Settings panel includes new "Currency" section with:
  - Base currency selector (USD, AUD, EUR - default: USD)
  - "Fetch Rates" button for manual rate update
  - Display of last fetch timestamp and next scheduled fetch
  - Visual indicator showing rate age (green: <24h, yellow: 24-48h, red: >48h)
- Exchange rates fetched from **Frankfurter API** (api.frankfurter.app):
  - Endpoint: `https://api.frankfurter.app/latest?from=USD&to=AUD,EUR`
  - Free, no API key required
  - Updated once per day manually (no auto-poll to respect rate limits)
- Supported currencies:
  - USD (US Dollar) - base/reference
  - AUD (Australian Dollar)
  - EUR (Euro)
- Rates are persisted locally in settings store with timestamp
- Rate display in settings shows:
  - 1 USD = X AUD
  - 1 USD = X EUR
  - Inverse rates (1 AUD = X USD, etc.)
- Offline handling: Use last fetched rates with clear "stale data" warning
- Error handling: User-friendly message if API unreachable
- AUD is the main currency

### Technical Notes

- Create `currencyService.ts` in main process for fetching rates
- Add TRPC endpoints: `currency.fetchRates()`, `currency.getRates()`, `currency.getLastFetchTime()`
- Store structure: `{ rates: { USD: 1, AUD: x, EUR: y }, lastFetched: ISO8601, baseCurrency: 'USD' }`
- Add rate to IPC schema for access in renderer
- Consider caching multiple base currencies if user switches frequently

### Links

- FR18 (Multi-currency support with exchange rates)
- Frankfurt API: https://api.frankfurter.app/

------------------------------------------------------------------------

## **Story 8.5 -- Multi-Currency Surebet Calculator (Integrated)**

**As a User**\
I want the surebet calculator (in the main feed) to handle different currencies across bookmakers\
So that I can calculate stakes accurately when bookmakers use different account currencies.

### Acceptance Criteria

- Calculator integrated in the **main Arbitrage/Surebet feed** supports multi-currency calculations
- Each stake input in the calculator has a **currency selector** (USD/AUD/EUR)
- Calculator automatically converts all stakes to a **base currency** for profit calculation
- Base currency is configurable in settings (default: USD)
- Display shows:
  - Stake amounts in their original currency (as entered)
  - Converted values in base currency (for comparison)
  - Total investment in base currency
  - Guaranteed profit in base currency
  - Optional: profit converted to user's preferred display currency
- Real-time conversion using latest fetched exchange rates
- Visual indicator when exchange rates are stale (>24h old)
- "Refresh Rates" button in calculator panel (calls manual fetch)
- Example workflow:
  - User clicks "Calculate Stakes" on a surebet in the main feed
  - Calculator opens with opportunity details pre-filled
  - User sets Bookmaker A currency to AUD, enters stake
  - Calculator auto-calculates Bookmaker B stake in EUR (or user selects EUR manually)
  - Display shows total investment and profit in USD (base currency)
- History shows original currencies used per calculation

### Technical Notes

- Extend `SurebetCalculator` component from Story 8.3
- Create `useCurrencyConversion()` hook for rate lookups
- Conversion formula: `amountInBase = amountInForeign / rateToBase`
- Consider bid/ask spread if implementing in future (for now use mid-market rates)
- Add currency symbols and formatting per locale
- Calculator panel in main feed needs to handle currency state per opportunity

### Links

- FR17 (Surebet stake calculation)
- FR18 (Multi-currency support with exchange rates)
- Story 8.3 (Surebet Calculator Core)
- Story 8.4 (Currency Exchange Rate Service)

------------------------------------------------------------------------

# **New Functional Requirements**

  ID     Description
  ------ ---------------------------------------------------------
  FR16   Browse raw odds in bookmaker-style grid view
  FR17   Calculate surebet stakes for optimal profit distribution
  FR18   Multi-currency support with exchange rate conversion
  FR19   Batch API operations for 10x efficiency improvement
  FR20   Direct bookmaker links for one-click bet placement

------------------------------------------------------------------------

# **FR Coverage Matrix**

  Requirement   Story
  ------------- ---------------
  FR1           1.3, 7.6
  FR2           1.2, 1.3, 1.4
  FR3           3.4, 5.3, 6.3, 7.3
  FR4           3.4, 5.3
  FR5           2.4, 2.6, 5.2, 5.4, 7.2, 7.8
  FR6           2.5, 2.6, 5.2, 5.3, 5.4, 6.1, 7.2, 7.5, 7.8
  FR7           2.1, 2.4, 2.5, 2.6, 5.2, 5.3, 5.4, 6.1, 7.3, 7.4
  FR8           2.2, 2.3, 5.2, 7.2, 7.3, 7.6, 7.8
  FR9           3.2, 5.2, 5.4, 7.5, 7.7
  FR10          3.4, 5.3, 5.4, 6.2, 7.5
  FR11          3.4, 5.3, 5.4, 6.1, 6.2, 7.4, 7.5
  FR12          3.2, 5.3
  FR13          3.3, 3.5, 7.8
  FR14          4.3, 7.7, 7.8, 8.2
  FR15          7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
  FR16          8.1, 8.2
  FR17          8.3, 8.5
  FR18          8.4, 8.5
  FR19          7.8
  FR20          7.8

------------------------------------------------------------------------

# **Summary**

This epic breakdown ensures:

- **Epic 1** – secure, stable runtime
- **Epic 2** – high-frequency data ingestion with rate-limit safety and correctness
- **Epic 3** – fast, trustworthy visualization with health indicators
- **Epic 4** – zero-friction execution via keyboard workflows and clear error handling
- **Epic 5** – expanded provider coverage and advanced market support for richer arbitrage opportunities
- **Epic 6** – enhanced filtering UX, granular bookmaker selection, and full-width desktop optimization
- **Epic 7** – **Continuous Deep Scan** as the primary arbitrage discovery mechanism, automatically scanning all events and markets to maximize opportunity detection
- **Epic 8** – **Odds Browser & Surebet Tools** - Surebet calculator integrated into the main feed for immediate stake calculation; separate view-only Odds Browser for systematic odds exploration; multi-currency support via Frankfurt API

## Epic 7 Architecture Overview

```
┌───────────────────────────────────────────────────────────────────────────┐
│                    Continuous Deep Scan Flow (Story 7.8 Optimized)         │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Regular Poll (/arbitrage-bets)                                           │
│       │                                                                    │
│       ▼                                                                    │
│  ┌─────────────┐    ┌──────────────────────┐    ┌──────────────────────┐  │
│  │ Fast Feed   │───▶│ Event Discovery      │───▶│ BATCH Scanner        │  │
│  │ (Moneyline) │    │ (/events + filters)  │    │ (/odds/multi)        │  │
│  └─────────────┘    │ • Time-range (from/to)│    │ • 10 events/request │  │
│                     │ • /events/live option │    │ • 90% fewer calls   │  │
│                     └──────────────────────┘    └──────────────────────┘  │
│                              │                           │                 │
│                              ▼                           ▼                 │
│                     ┌──────────────┐      ┌─────────────────────────────┐ │
│                     │ Event Cache  │      │ Enhanced Normalization      │ │
│                     │ (TTL-based)  │      │ • Market timestamps         │ │
│                     └──────────────┘      │ • Bookmaker URLs            │ │
│                              │            │ • Odds movements            │ │
│                              │            └─────────────────────────────┘ │
│                              │                           │                 │
│                              ▼                           ▼                 │
│                     ┌──────────────────┐      ┌─────────────────┐        │
│                     │ Incremental Mode │      │ Arbitrage       │        │
│                     │ (/odds/updated)  │      │ Detection       │        │
│                     │ • Only changes   │      │ (All Markets)   │        │
│                     └──────────────────┘      └─────────────────┘        │
│                                                        │                  │
│                                                        ▼                  │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │              Merged Feed (Deduplicated + Enriched)                   │ │
│  │   • Pre-calculated arbs (fast)                                      │ │
│  │   • Deep Scan arbs (comprehensive)                                  │ │
│  │   • Tagged by source for filtering                                  │ │
│  │   • Direct bookmaker links for quick bet placement                  │ │
│  │   • True market freshness (from API timestamps)                     │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**
- **Story 7.8 Optimization**: Batch API calls via `/odds/multi` (10 events per request = 90% reduction)
- Deep Scan runs continuously by default (5,000 req/hour budget now allows ~800-1,000 events/hour)
- Time-range filtering focuses on imminent events (configurable scan horizon)
- Incremental updates via `/odds/updated` reduce redundant data transfer
- No ROI thresholds - all positive arbitrage opportunities are surfaced
- Event caching prevents redundant API calls (configurable TTL)
- Results merge seamlessly with fast feed, deduplicated by event/market/bookmaker key
- **Direct bookmaker URLs** enable one-click bet placement
- **True market freshness** from API timestamps (not just scan time)
- Manual Deep Scan remains available for targeted single-event investigation

A complete, production-grade arbitrage analysis workflow optimized for maximum opportunity detection with 10x improved API efficiency.

------------------------------------------------------------------------

## Epic 8 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Epic 8: Odds Browser & Surebet Tools                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     MAIN ARBITRAGE FEED TAB                      │   │
│  │  ┌──────────────────────────────────────────────────────────┐  │   │
│  │  │  Surebet Opportunities Grid                              │  │   │
│  │  │  • ROI | Event | Market | Bookmakers | Time             │  │   │
│  │  │                                                          │  │   │
│  │  │  [Row selected] ──► [Calculate Stakes] button           │  │   │
│  │  │       │                                                  │  │   │
│  │  │       ▼                                                  │  │   │
│  │  │  ┌────────────────────────────────────────────────────┐ │  │   │
│  │  │  │     Multi-Currency Surebet Calculator (Inline)     │ │  │   │
│  │  │  │  ┌─────────────────┐    ┌─────────────────┐       │ │  │   │
│  │  │  │  │  Outcome A      │    │  Outcome B      │       │ │  │   │
│  │  │  │  │  • Bookmaker    │    │  • Bookmaker    │       │ │  │   │
│  │  │  │  │  • Odds: 2.10   │    │  • Odds: 2.05   │       │ │  │   │
│  │  │  │  │  • Stake: [100] │    │  • Stake: calc  │       │ │  │   │
│  │  │  │  │  • Curr:[AUD▼]  │    │  • Curr:[EUR▼]  │       │ │  │   │
│  │  │  │  └─────────────────┘    └─────────────────┘       │ │  │   │
│  │  │  │  Results: Total $142.50 | Profit $7.50 (5.26%)   │ │  │   │
│  │  │  └────────────────────────────────────────────────────┘ │  │   │
│  │  └──────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     ODDS BROWSER TAB (View Only)                 │   │
│  │  ┌──────────────────────────────────────────────────────────┐  │   │
│  │  │  Filters: Sport | League | Event | Market | Bookmaker    │  │   │
│  │  └──────────────────────────────────────────────────────────┘  │   │
│  │  ┌──────────────────────────────────────────────────────────┐  │   │
│  │  │  Hierarchical Grid (View Only)                           │  │   │
│  │  │  • Sport ▼                                               │  │   │
│  │  │    • League ▼                                            │  │   │
│  │  │      • Event (Team A vs Team B)                          │  │   │
│  │  │        • Market | Bookmaker | Odds | Updated             │  │   │
│  │  └──────────────────────────────────────────────────────────┘  │   │
│  │                              │                                   │   │
│  │                              ▼ (Select Odd)                     │   │
│  │  ┌──────────────────────────────────────────────────────────┐  │   │
│  │  │              Odds Comparison Panel (View Only)           │  │   │
│  │  │  • All bookmakers sorted by odds                       │  │   │
│  │  │  • Best price highlighted                              │  │   │
│  │  │  • Copy odds info to clipboard                         │  │   │
│  │  └──────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              Currency Exchange Rate Service                      │   │
│  │  ┌─────────────────┐    ┌─────────────────┐                    │   │
│  │  │  Frankfurter    │───▶│  Cached Rates   │                    │   │
│  │  │  API (Daily)    │    │  • USD: 1.0     │                    │   │
│  │  │  Manual Fetch   │    │  • AUD: 1.52    │                    │   │
│  │  └─────────────────┘    │  • EUR: 0.85    │                    │   │
│  │                         │  Last: 2h ago   │                    │   │
│  │                         └─────────────────┘                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**
- **Surebet Calculator is integrated into the main Arbitrage feed** - appears when user clicks "Calculate Stakes" on any opportunity
- **Odds Browser is view-only** - for systematic odds exploration without betting functionality
- Odds Browser reuses existing Deep Scan cached data (no additional API costs)
- Bookmaker-style hierarchical view enables systematic odds exploration
- Odds Comparison panel integrates directly with Story 7.7 implementation
- Surebet Calculator supports both "total stake" and "target profit" calculation modes
- Multi-currency support handles bookmakers with different account currencies
- Frankfurt API chosen for free, reliable exchange rates without API keys
- Manual rate fetching respects API rate limits (once per day sufficient for betting)
- All calculations happen client-side for instant feedback

A professional-grade toolkit with calculator integrated in the main surebet workflow, plus a dedicated odds exploration view.
