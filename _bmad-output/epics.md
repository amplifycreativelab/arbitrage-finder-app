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

------------------------------------------------------------------------

## FR Coverage Map

  Epic                    Covers
  ----------------------- ---------------------------------------
  Epic 1 -- Foundation    FR1, FR2, NFR3, NFR4
  Epic 2 -- Data Engine   FR5, FR6, FR7, FR8, NFR1, NFR2
  Epic 3 -- Dashboard     FR3, FR4, FR9, FR10, FR11, FR12, FR13
  Epic 4 -- Interaction   FR14
  Epic 5 -- Multi-Provider & Advanced Markets   FR3, FR4, FR5, FR6, FR7, FR9, FR10, FR11

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

# **FR Coverage Matrix**

  Requirement   Story
  ------------- ---------------
  FR1           1.3
  FR2           1.2, 1.3, 1.4
  FR3           3.4, 5.3, 6.3
  FR4           3.4, 5.3
  FR5           2.4, 2.6, 5.2, 5.4
  FR6           2.5, 2.6, 5.2, 5.3, 5.4, 6.1
  FR7           2.1, 2.4, 2.5, 2.6, 5.2, 5.3, 5.4, 6.1
  FR8           2.2, 2.3, 5.2
  FR9           3.2, 5.2, 5.4
  FR10          3.4, 5.3, 5.4, 6.2
  FR11          3.4, 5.3, 5.4, 6.1, 6.2
  FR12          3.2, 5.3
  FR13          3.3, 3.5
  FR14          4.3

------------------------------------------------------------------------

# **Summary**

This epic breakdown ensures:

- **Epic 1** – secure, stable runtime  
- **Epic 2** – high-frequency data ingestion with rate-limit safety and correctness  
- **Epic 3** – fast, trustworthy visualization with health indicators  
- **Epic 4** – zero-friction execution via keyboard workflows and clear error handling
- **Epic 5** – expanded provider coverage and advanced market support for richer arbitrage opportunities
- **Epic 6** – enhanced filtering UX, granular bookmaker selection, and full-width desktop optimization

A complete, production-grade arbitrage analysis workflow.

