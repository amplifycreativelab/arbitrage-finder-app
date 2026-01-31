# Story 7.9: Sport/League Filter Configuration

Status: completed

## Story

As a User,
I want to configure specific sports and leagues for Deep Scan filtering,
So that I can focus API quota on high-value leagues with good bookmaker coverage.

## Background

The existing scan scope setting (all-sports / selected-sports / selected-leagues) was implemented but had no UI for actually selecting which sports or leagues to include. This caused Deep Scan to waste API calls on obscure leagues with minimal odds coverage.

**Problem**: Free tier API limits (5000 req/hour) were being consumed by leagues with low bookmaker participation.
**Solution**: Add UI controls for sport/league selection with preset configurations for major leagues.

## Acceptance Criteria

### 1. League Presets ✅

- [x] Define preset configurations for common league groupings:
  - **Top 5 European Leagues**: Premier League, La Liga, Serie A, Bundesliga, Ligue 1
  - **European Elite**: Top 5 + Champions League, Europa League, Conference League
  - **Major European**: Top 5 + Portugal, Netherlands, Belgium, Turkey, Scotland
  - **English Football**: All English tiers + cups
  - **International**: World Cup, Euro, Nations League, qualifiers
- [x] Presets can be applied with a single click
- [x] Applying a preset sets the scan scope to 'selected-leagues' and populates the filters

### 2. Sport Filter UI ✅

- [x] When scan scope is 'selected-sports', show sport selection UI
- [x] Fetch available sports from `/v3/sports` API endpoint
- [x] Allow multi-select with toggle buttons
- [x] Cache discovered sports for quick access
- [x] "Refresh Sports" button to fetch latest from API

### 3. League Filter UI ✅

- [x] When scan scope is 'selected-leagues', show league selection UI
- [x] Fetch available leagues from `/v3/leagues` API endpoint (per sport)
- [x] Show league name and active events count
- [x] Allow multi-select with chip-based UI
- [x] Selected leagues displayed as removable chips
- [x] Leagues sorted by events count (highest first)

### 4. Backend Integration ✅

- [x] Add `/v3/sports` endpoint call capability
- [x] Add `/v3/leagues` endpoint call capability
- [x] Store enabled sports/leagues filters in deepScan module state
- [x] TRPC endpoints for get/set filters and presets
- [x] Preload API exposure for renderer access
- [x] Filters used in `discoverAllEvents()` and `runContinuousScanCycle()`

## Tasks / Subtasks

### Phase 1: API Endpoints

- [x] **Task 1: Add API constants and types**
  - [x] 1.1 Add `ODDS_API_IO_SPORTS_PATH` constant
  - [x] 1.2 Add `ODDS_API_IO_LEAGUES_PATH` constant
  - [x] 1.3 Define `DiscoveredSport` and `DiscoveredLeague` interfaces
  - [x] 1.4 Define `LeaguePreset` interface

- [x] **Task 2: Implement API fetchers**
  - [x] 2.1 Create `fetchAvailableSports()` function
  - [x] 2.2 Create `fetchAvailableLeagues()` function
  - [x] 2.3 Cache discovered sports/leagues for UI access
  - [x] 2.4 Add getters for cached data

### Phase 2: Presets

- [x] **Task 3: Define league presets**
  - [x] 3.1 Create `LEAGUE_PRESETS` constant array
  - [x] 3.2 Implement `applyLeaguePreset()` function
  - [x] 3.3 Add `getLeaguePresets()` getter

### Phase 3: TRPC Integration

- [x] **Task 4: Add TRPC endpoints**
  - [x] 4.1 `deepScanFetchSports` - fetch from API
  - [x] 4.2 `deepScanGetSportsDetails` - get cached
  - [x] 4.3 `deepScanFetchLeagues` - fetch for sport
  - [x] 4.4 `deepScanGetLeagues` - get cached
  - [x] 4.5 `deepScanGetLeaguePresets` - get presets
  - [x] 4.6 `deepScanApplyPreset` - apply preset

### Phase 4: Preload API

- [x] **Task 5: Update preload types and implementation**
  - [x] 5.1 Extend `DeepScanAPI` type with new methods
  - [x] 5.2 Add `DiscoveredSport`, `DiscoveredLeague`, `LeaguePreset` types
  - [x] 5.3 Implement all API methods in preload

### Phase 5: UI Component

- [x] **Task 6: Create SportLeagueFilter component**
  - [x] 6.1 Collapsible presets section with apply buttons
  - [x] 6.2 Expandable sports section with toggle buttons
  - [x] 6.3 Expandable leagues section with chip UI
  - [x] 6.4 Refresh buttons for fetching from API
  - [x] 6.5 Clear all functionality
  - [x] 6.6 Conditional rendering based on scan scope

- [x] **Task 7: Integrate into DeepScanPanel**
  - [x] 7.1 Import SportLeagueFilter component
  - [x] 7.2 Add state for enabled sports/leagues
  - [x] 7.3 Add handlers for changes and preset application
  - [x] 7.4 Load initial values on mount

## Dev Notes

### Architecture Compliance

| Component | File | Changes |
|-----------|------|---------|
| Deep Scan Service | `src/main/services/deepScan.ts` | Added API fetchers, presets, getters |
| Router | `src/main/services/router.ts` | Added TRPC endpoints for sport/league operations |
| Preload | `src/preload/index.ts` | Extended DeepScanAPI with new methods |
| Preload Types | `src/preload/index.d.ts` | Added type declarations |
| SportLeagueFilter | `src/renderer/src/features/dashboard/SportLeagueFilter.tsx` | New component |
| DeepScanPanel | `src/renderer/src/features/dashboard/DeepScanPanel.tsx` | Integrated filter component |

### League Presets

The following presets are available:

1. **top-5-european**: Premier League, La Liga, Serie A, Bundesliga, Ligue 1 (5 leagues)
2. **european-elite**: Top 5 + UEFA competitions (8 leagues)
3. **major-european**: Top 5 + secondary European leagues (10 leagues)
4. **english-football**: All English divisions + cups (6 leagues)
5. **international**: World and continental competitions (6 leagues)

### API Efficiency

With 5000 req/hour on the free tier:
- Scanning all events: ~80-100 events/hour after deduplication
- With Top 5 preset: Focus on ~500 events with high odds coverage
- Expected improvement: 5-10x more relevant opportunities per scan cycle

### Error Handling

- API fetch failures are logged but don't block UI
- Cached data persists in memory for fast UI access
- All async operations use try/catch with silent fallback

## File List

| File | Changes |
|------|---------|
| `src/main/services/deepScan.ts` | Added ODDS_API_IO_SPORTS_PATH, ODDS_API_IO_LEAGUES_PATH constants; DiscoveredSport, DiscoveredLeague, LeaguePreset types; LEAGUE_PRESETS array; fetchAvailableSports, fetchAvailableLeagues, getAvailableSportsDetails, getAvailableLeagues, getLeaguePresets, applyLeaguePreset functions |
| `src/main/services/router.ts` | Added TRPC endpoints: deepScanFetchSports, deepScanGetSportsDetails, deepScanFetchLeagues, deepScanGetLeagues, deepScanGetLeaguePresets, deepScanApplyPreset |
| `src/preload/index.ts` | Extended DeepScanAPI with sport/league methods |
| `src/preload/index.d.ts` | Added type declarations for new API methods and types |
| `src/renderer/src/features/dashboard/SportLeagueFilter.tsx` | New component for sport/league selection UI |
| `src/renderer/src/features/dashboard/DeepScanPanel.tsx` | Integrated SportLeagueFilter, added state and handlers |

## Dev Agent Record

### Agent Model Used

Claude (Antigravity Agent)

### Completion Notes

1. **League Presets (AC #1)**: Implemented 5 preset configurations covering major European leagues, UEFA competitions, English football pyramid, and international tournaments. Presets use league slugs from odds-api.io.

2. **Sport Filter UI (AC #2)**: SportLeagueFilter component shows collapsible sports section when scan scope is 'selected-sports'. Includes refresh button to fetch from API and toggle buttons for selection.

3. **League Filter UI (AC #3)**: Shows collapsible leagues section when scan scope is 'selected-leagues'. Features chip-based selection, event counts, and sorting by popularity.

4. **Backend Integration (AC #4)**: Full TRPC pipeline from deepScan service through router to preload. All existing filter logic in `runContinuousScanCycle()` uses the enabled filters.
