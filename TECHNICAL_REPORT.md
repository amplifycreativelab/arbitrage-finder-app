# Arbitrage Finder App - Technical Documentation

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Provider System & API Integration](#provider-system--api-integration)
4. [Odds Fetching & Arbitrage Detection](#odds-fetching--arbitrage-detection)
5. [Cross-Provider Aggregation](#cross-provider-aggregation)
6. [Deep Scan System](#deep-scan-system)
7. [Aggressive Pre-Match Scanning](#aggressive-pre-match-scanning)
8. [Frontend Architecture](#frontend-architecture)
9. [Data Models & Types](#data-models--types)
10. [Storage & Security](#storage--security)
11. [Configuration & Settings](#configuration--settings)

---

## Executive Summary

The Arbitrage Finder App is an Electron-based desktop application that identifies sports betting arbitrage opportunities ("surebets") by aggregating odds data from multiple bookmakers via the Odds-API.io service. The app supports multiple API providers, cross-provider arbitrage detection, deep scanning capabilities, and aggressive pre-match monitoring with intelligent quota management.

**Key Capabilities:**
- Real-time arbitrage opportunity detection from multiple providers
- Cross-provider odds comparison for enhanced arbitrage detection
- Deep scanning of individual events with comprehensive market coverage
- Aggressive pre-match scanning with tiered event priority
- Intelligent API quota management and rate limiting
- Support for soccer, tennis, basketball, and other sports
- Multi-market support: goals, handicaps, corners, cards, shots, and more

---

## Architecture Overview

### Technology Stack
- **Framework**: Electron + React + TypeScript
- **Build Tool**: Electron-Vite
- **State Management**: Zustand (renderer), in-memory + electron-store (main)
- **IPC**: tRPC (electron-trpc) for type-safe communication
- **Rate Limiting**: Bottleneck
- **Validation**: Zod schemas

### Project Structure

```
src/
├── main/                    # Electron main process
│   ├── adapters/           # Provider adapters (odds-api-io, the-odds-api)
│   ├── services/           # Core business logic
│   │   ├── poller.ts      # Central rate limiting & polling
│   │   ├── calculator.ts  # Arbitrage calculation & deduplication
│   │   ├── crossProviderCalculator.ts  # Cross-provider arb detection
│   │   ├── deepScan.ts    # Deep scan orchestration
│   │   ├── aggressiveScan.ts  # Aggressive pre-match scanning
│   │   ├── eventMatcher.ts    # Event normalization & matching
│   │   ├── odds-api-io-bookmakers.ts  # Bookmaker management
│   │   └── router.ts      # tRPC router
│   ├── credentials.ts     # API key management
│   └── index.ts           # Main entry point
├── renderer/              # Electron renderer process (UI)
│   └── src/
│       ├── features/      # Feature-based modules
│       │   ├── dashboard/ # Feed display & controls
│       │   ├── settings/  # Configuration UI
│       │   └── odds-browser/  # Raw odds exploration
│       ├── stores/        # Zustand stores
│       └── lib/           # Utilities
├── shared/                # Shared types & schemas
│   ├── types.ts          # Core type definitions
│   ├── schemas.ts        # Zod validation schemas
│   └── filters.ts        # Filtering utilities
└── preload/              # Electron preload scripts
```

### Process Communication
The app uses **tRPC** for type-safe IPC between main and renderer processes:
- Main process exposes procedures via `appRouter` in `router.ts`
- Renderer calls procedures via `trpcClient` using React hooks
- All API calls are strongly typed end-to-end

---

## Provider System & API Integration

### Supported Providers

The app supports two arbitrage data providers:

1. **Odds-API.io** (Primary) - Direct arbitrage feed + deep scanning
2. **The-Odds-API.com** (Secondary) - Odds comparison only

### Provider Configuration

Providers can be enabled/disabled individually via the multi-provider system:

```typescript
// From shared/types.ts
export const PROVIDER_IDS = ['odds-api-io', 'the-odds-api'] as const
export type ProviderId = (typeof PROVIDER_IDS)[number]
```

### Odds-API.io Integration Details

#### Base URLs
- **Arbitrage Endpoint**: `https://api2.odds-api.io` (for `/v3/arbitrage-bets`)
- **Bookmakers Endpoint**: `https://api.odds-api.io` (for `/v3/bookmakers/*`)

#### Key Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v3/arbitrage-bets` | GET | Fetches pre-calculated arbitrage opportunities |
| `/v3/bookmakers` | GET | Lists all supported bookmakers |
| `/v3/bookmakers/selected` | GET | Gets user's selected bookmakers |
| `/v3/bookmakers/selected/select` | PUT | Sets selected bookmakers |
| `/v3/bookmakers/selected/clear` | PUT | Clears bookmaker selection |
| `/v3/events` | GET | Lists upcoming events |
| `/v3/odds` | GET | Gets odds for specific event |
| `/v3/odds/multi` | GET | Batch odds for up to 10 events |
| `/v3/odds/updated` | GET | Incremental odds updates |
| `/v3/events/live` | GET | Live events feed |
| `/v3/sports` | GET | Available sports |
| `/v3/leagues` | GET | Leagues for a sport |

#### Arbitrage Endpoint Parameters
```typescript
// From src/main/adapters/odds-api-io.ts
const url = new URL(ODDS_API_IO_ARBS_PATH, ODDS_API_IO_BASE_URL)
url.searchParams.set('apiKey', apiKey)
url.searchParams.set('bookmakers', selectedBookmakers.join(','))
url.searchParams.set('includeEventDetails', 'true')
url.searchParams.set('limit', '500') // Max limit
```

#### Response Normalization

Raw responses are normalized to a standard `ArbitrageOpportunity` format:

```typescript
// From src/main/adapters/odds-api-io.ts
export interface OddsApiIoRawArbitrageBet {
  id: string
  eventId: number
  sport?: string
  roi?: number
  market: { name: string; hdp?: number | null }
  profitMargin: number  // Percentage value (e.g., 2.04 = 2.04%)
  legs: Array<{
    side: string        // "home", "away", "over", "under"
    bookmaker: string
    odds: string        // Returned as string, parsed to number
    directLink?: string
  }>
  event?: {
    home?: string       // Home team name
    away?: string       // Away team name
    date?: string
    league?: string
  }
}
```

The normalization process:
1. **Market Metadata Extraction**: Uses `inferMarketMetadata()` to categorize markets
2. **Sport Normalization**: Maps API sport names to internal values (soccer, tennis, basketball)
3. **Odds Conversion**: Parses string odds to numbers
4. **ROI Calculation**: Converts `profitMargin` (percentage) to decimal ROI
5. **Event Info Building**: Constructs event name from home/away teams

### The-Odds-API.com Integration

#### Endpoint
```typescript
const THE_ODDS_API_ODDS_PATH = '/v4/sports/soccer/odds'
const url = new URL(THE_ODDS_API_ODDS_PATH, THE_ODDS_API_BASE_URL)
url.searchParams.set('apiKey', apiKey)
url.searchParams.set('regions', 'eu')
url.searchParams.set('markets', 'h2h')  // Only h2h supported for soccer
```

**Limitations:**
- Only `h2h` (moneyline) markets supported for soccer
- BTTS, spreads, totals return 422 errors
- Primarily used as a secondary data source

---

## Odds Fetching & Arbitrage Detection

### Central Rate Limiting (Poller Service)

All provider requests go through the central **Poller Service** (`src/main/services/poller.ts`):

```typescript
// Rate limit configuration
const PRD_REQUESTS_PER_HOUR = 5000
const DEFAULT_LIMITER_CONFIG: RateLimiterConfig = {
  minTime: 720,              // 720ms between requests
  maxConcurrent: 1,
  reservoir: 5000,           // 5000 requests per hour
  reservoirRefreshAmount: 5000,
  reservoirRefreshInterval: 60 * 60 * 1000  // 1 hour
}
```

**Key Features:**
- Per-provider rate limiters using Bottleneck
- Exponential backoff on 429 rate limit responses
- Request timeout handling (30 seconds)
- Structured logging with correlation IDs
- Status tracking (OK, QuotaLimited, Degraded)

### Adapter Architecture

All adapters extend `BaseArbitrageAdapter`:

```typescript
export abstract class BaseArbitrageAdapter implements ArbitrageAdapter {
  readonly __usesCentralRateLimiter = true as const
  abstract readonly id: ProviderId

  protected abstract fetchWithApiKey(
    apiKey: string,
    context?: ProviderRequestContext
  ): Promise<ArbitrageOpportunity[]>

  async fetchOpportunities(): Promise<ArbitrageOpportunity[]> {
    const apiKey = await getApiKeyForAdapter(this.id)
    if (!apiKey) {
      throw new Error(`API key not configured for provider ${this.id}`)
    }
    return scheduleProviderRequest(this.id, (context) => 
      this.fetchWithApiKey(apiKey, context)
    )
  }
}
```

### Multi-Provider Polling

The system polls all enabled providers in parallel:

```typescript
export async function pollOnceForEnabledProviders(): Promise<ArbitrageOpportunity[]> {
  const providerIds = Array.from(enabledProvidersForPolling)
  
  // Poll all enabled providers in parallel
  const pollPromises = providerIds.map(async (providerId) => {
    const adapter = adaptersByProviderId[providerId]
    // ... fetch and validate
  })
  
  const results = await Promise.allSettled(pollPromises)
  // ... combine results
}
```

### Arbitrage Calculation

The core arbitrage formula (from `calculator.ts`):

```typescript
export function calculateTwoLegArbitrageRoi(oddsA: number, oddsB: number): number {
  if (!Number.isFinite(oddsA) || !Number.isFinite(oddsB)) {
    return 0
  }
  if (oddsA <= 0 || oddsB <= 0) {
    return 0
  }

  const inverseSum = 1 / oddsA + 1 / oddsB
  if (inverseSum <= 0) {
    return 0
  }

  const roi = 1 - inverseSum
  return roi < 0 ? 0 : roi
}
```

**Interpretation:**
- ROI > 0 indicates an arbitrage opportunity
- ROI of 0.02 = 2% guaranteed profit
- The sum of inverse odds must be < 1 for arbitrage

---

## Cross-Provider Aggregation

### Overview

The cross-provider aggregation system finds arbitrage opportunities by combining odds from different providers, creating opportunities that wouldn't be visible from a single provider.

### Event Matching

Events are matched across providers using normalized keys:

```typescript
// From eventMatcher.ts
export function generateEventKey(event: {
  name: string
  date: string
  league: string
}): string | null {
  const teams = extractTeamsFromEventName(event.name)
  if (!teams) return null

  const [home, away] = teams
  const normalizedHome = normalizeTeamName(home)
  const normalizedAway = normalizeTeamName(away)

  // Sort alphabetically for consistent key
  const sortedTeams = [normalizedHome, normalizedAway].sort()
  const dateHour = truncateDateToHour(event.date)

  return `${sortedTeams[0]}|${sortedTeams[1]}|${dateHour}`
}
```

**Normalization includes:**
- Lowercasing and trimming
- Removing accents/diacritics (NFD normalization)
- Stripping common prefixes (FC, AC, SC)
- Stripping common suffixes (FC, United, Club)
- Collapsing multiple spaces

### Market Quote Extraction

Odds are extracted as individual "quotes" for cross-provider comparison:

```typescript
export interface MarketQuote {
  eventKey: string
  providerId: ProviderId
  bookmaker: string
  market: string
  outcome: string
  odds: number
  originalEventName: string
  originalEventDate: string
  originalLeague: string
  foundAt: string
}
```

### Cross-Provider Arbitrage Algorithm

```typescript
// From crossProviderCalculator.ts
export function findCrossProviderArbitrages(quotes: MarketQuote[]): ArbitrageOpportunity[] {
  // 1. Group quotes by (eventKey + market + outcome)
  const grouped = new Map<string, MarketQuote[]>()
  // ... grouping logic

  // 2. For each unique (eventKey + market)
  for (const { eventKey, market } of eventMarkets) {
    const [outcome1, outcome2] = getOutcomePairs(market)
    
    // 3. Find best quote for each outcome
    const best1 = findBestQuote(quotes1)
    const best2 = findBestQuote(quotes2, best1.bookmaker) // Different bookmaker!
    
    // 4. Calculate ROI
    const roi = calculateTwoLegArbitrageRoi(best1.odds, best2.odds)
    
    // 5. Create opportunity if profitable
    if (roi > 0) {
      opportunities.push(createCrossProviderOpportunity(best1, best2, roi))
    }
  }
}
```

**Key Constraints:**
- Best odds for opposing outcomes must come from **different bookmakers**
- Supports market-specific outcome pairs (h2h: home/away, BTTS: yes/no)
- Cross-provider opportunities marked with `isCrossProvider: true`

### Deduplication

Opportunities from multiple providers are deduplicated using semantic keys:

```typescript
function getDeduplicationKey(opp: ArbitrageOpportunity): string {
  const sortedOutcomes = opp.legs
    .map((leg) => `${leg.outcome}:${leg.market}`)
    .sort()
    .join('|')

  return `${opp.event.name}|${opp.event.date}|${opp.event.league}|${sortedOutcomes}`
}
```

When duplicates are found:
- Highest ROI opportunity is kept
- If ROI is equal, first-seen wins
- `mergedFrom` field tracks all source providers

---

## Deep Scan System

### Overview

Deep Scan performs comprehensive odds analysis on individual events, scanning all available markets to find arbitrage opportunities that the main feed might miss.

### API Endpoints for Deep Scan

| Endpoint | Purpose |
|----------|---------|
| `/v3/events` | Discover upcoming events |
| `/v3/odds` | Get odds for single event |
| `/v3/odds/multi` | Batch odds (up to 10 events) |
| `/v3/odds/updated` | Incremental updates |
| `/v3/events/live` | Live events |

### Event Discovery

```typescript
export async function discoverAllEvents(args: {
  apiKey: string
  signal: AbortSignal
  correlationId: string
  sports?: string[]
}): Promise<DeepScanEvent[]>
```

Events are:
1. Fetched with pagination
2. Filtered to upcoming events only
3. Sorted by priority tier (<1h, today, tomorrow, distant)
4. Scoped by enabled sports/leagues

### Odds Processing

Raw odds are processed comprehensively:

```typescript
// Response structure from /v3/odds
interface RawOddsPayload {
  eventId: string
  sport: string
  league: string
  commenceTime: string
  homeTeam: string
  awayTeam: string
  bookmakers: Array<{
    name: string
    markets: Array<{
      key: string
      outcomes: Array<{
        name: string
        odds: number
      }>
    }>
  }>
}
```

**Processing Steps:**
1. **Validation**: Filter valid bookmakers, markets, outcomes
2. **Outcome Normalization**: Map various outcome names to canonical forms
3. **Market Classification**: Infer market group (goals, corners, cards, etc.)
4. **Arbitrage Detection**: Check all outcome pairs for profitable combinations
5. **Card Rules Check**: Detect card counting rule mismatches for cards markets

### Continuous Deep Scan

Runs automatically in the background:
- **Trigger**: After each feed poll or on timer
- **Scope**: Configurable (all sports, selected sports, selected leagues)
- **Quota Management**: Respects hourly request limits with throttling
- **Caching**: Events cached for 5 minutes to avoid re-scanning
- **Pause/Resume**: Can be paused without losing state

### Configuration Options

```typescript
interface DeepScanConfig {
  eventIds?: string[]        // Specific events to scan
  leagueId?: string          // Filter by league
  sportSlug?: string         // Filter by sport
  minRoi?: number            // Minimum ROI threshold
  marketGroupThresholds?: Record<MarketGroup, number>
  bookmakers?: string[]      // Specific bookmakers
  maxConcurrentRequests?: number
}
```

---

## Aggressive Pre-Match Scanning

### Overview

Aggressive scanning (Story 8.7) maximizes API quota usage by prioritizing events based on time-to-kickoff, with tiered polling frequencies.

### Event Tiers

Events are categorized into tiers based on minutes to kickoff:

| Tier | Time to Kickoff | Default Polling |
|------|-----------------|-----------------|
| `imminent` | < 60 minutes | 30-60 seconds |
| `soon` | < 4 hours | 3 minutes |
| `today` | < 12 hours | 10 minutes |
| `later` | < 24 hours | 30 minutes |
| `tomorrow` | < 48 hours | 60 minutes |
| `distant` | > 48 hours | 120 minutes |

### Quota Budget System

```typescript
interface QuotaBudget {
  totalHourlyLimit: number
  targetPercent: number        // Target usage (e.g., 75%)
  targetRequestsPerHour: number
  bufferPercent: number        // Safety buffer (20%)
  usableRequests: number
  perTier: Record<EventTier, TierBudget>
  currentHourUsed: number
  currentHourRemaining: number
}
```

### Tier Weights (Configurable)

```typescript
const DEFAULT_TIER_WEIGHTS = {
  imminent: 40,   // 40% of budget
  soon: 25,       // 25% of budget
  today: 15,      // 15% of budget
  later: 10,      // 10% of budget
  tomorrow: 7,    // 7% of budget
  distant: 3      // 3% of budget
}
```

### Arb Boost System

When an arbitrage opportunity is detected on an event:
1. Event gets "boosted" status for configurable duration (default: 5 minutes)
2. Boosted events use faster polling interval (10-60 seconds)
3. Maximum concurrent boosted events: 10
4. Oldest boost is evicted when limit reached

### Configuration

```typescript
interface AggressiveScanConfig {
  enabled: boolean
  quotaTargetPercent: number        // Target quota usage (50-90%)
  scanHorizonHours: number          // How far ahead to scan (12-72h)
  imminentPollIntervalSeconds: number
  arbBoostDurationMinutes: number
  arbBoostPollIntervalSeconds: number
  maxBoostedEvents: number
  maxCachedEvents: number
  tierWeights: Record<EventTier, number>
  tierBoundaries: {
    imminent: number   // minutes
    soon: number
    today: number
    later: number
    tomorrow: number
  }
}
```

### Cold Start Process

1. **Discovery Phase**: Fetch all events within horizon
2. **Tier Assignment**: Categorize events by kickoff time
3. **Budget Calculation**: Allocate quota per tier
4. **Polling Loop Start**: Begin tier-specific intervals
5. **Continuous Optimization**: Promote events between tiers as time passes

---

## Frontend Architecture

### State Management

Uses **Zustand** for state management with separate stores for different concerns:

```typescript
// Feed Store - Main opportunity feed
interface FeedState {
  opportunities: ArbitrageOpportunity[]
  enabledProviderIds: ProviderId[]
  selectedOpportunityId: string | null
  sortBy: FeedSortKey
  sortDirection: FeedSortDirection
  // ... actions
}

// Filter Store - Active filters
interface FeedFiltersState {
  selectedSports: string[]
  selectedMarketGroups: MarketGroup[]
  selectedRegions: RegionCode[]
  minRoi: number
  searchQuery: string
}

// Deep Scan Store - Scan progress
interface DeepScanStore {
  progress: DeepScanProgress | null
  isRunning: boolean
  results: ArbitrageOpportunity[]
}
```

### tRPC Integration

Type-safe IPC calls from renderer:

```typescript
// Example: Refresh feed
const result = await trpcClient.pollAndGetFeedSnapshot.mutate()

// Example: Start deep scan
await trpcClient.deepScanStart.mutate({
  sportSlug: 'football',
  minRoi: 0.01
})

// Example: Get bookmakers
const { bookmakers } = await trpcClient.oddsApiIoGetSupportedBookmakers.query()
```

### Key UI Features

1. **Dashboard**: Feed of arbitrage opportunities with sorting/filtering
2. **Calculator**: Stake calculation per bookmaker
3. **Settings**: Provider configuration, API keys, bookmaker selection
4. **Odds Browser**: Raw odds exploration
5. **Deep Scan Panel**: Scan progress and results
6. **Quota Dashboard**: API usage statistics

---

## Data Models & Types

### Core Types

```typescript
// Arbitrage Opportunity
interface ArbitrageOpportunity {
  id: string
  sport: string
  event: {
    name: string
    date: string
    league: string
  }
  legs: [
    { bookmaker: string; market: string; odds: number; outcome: string },
    { bookmaker: string; market: string; odds: number; outcome: string }
  ]
  roi: number                    // Decimal (0.02 = 2%)
  foundAt: string
  providerId?: ProviderId
  mergedFrom?: ProviderId[]      // After deduplication
  isCrossProvider?: boolean
  cardRulesWarning?: CardRulesWarning
}

// Market Groups
export const MARKET_GROUPS = ['goals', 'handicap', 'corners', 'cards', 'shots', 'other'] as const
export type MarketGroup = (typeof MARKET_GROUPS)[number]

// Market Metadata
interface MarketMetadata {
  group: MarketGroup
  key: string
  label: string
  period?: 'ft' | '1h' | '2h'
  line?: number
  side?: 'home' | 'away' | 'match'
}
```

### Market Pattern Recognition

The system recognizes 100+ market patterns:

```typescript
export const MARKET_PATTERNS: Record<string, { group: MarketGroup; baseType: string }> = {
  // Goals
  h2h: { group: 'goals', baseType: 'moneyline' },
  totals: { group: 'goals', baseType: 'totals' },
  btts: { group: 'goals', baseType: 'btts' },
  
  // Corners
  corners: { group: 'corners', baseType: 'corners' },
  corners_over: { group: 'corners', baseType: 'corners_over' },
  
  // Cards
  cards: { group: 'cards', baseType: 'cards' },
  red_card: { group: 'cards', baseType: 'red_card' },
  booking_points: { group: 'cards', baseType: 'booking_points' },
  
  // ... 100+ more patterns
}
```

---

## Storage & Security

### Credential Storage

API keys are stored using Electron's `safeStorage`:

```typescript
// Encryption path
if (isSafeStorageAvailable()) {
  const encrypted = safeStorage.encryptString(apiKey)
  secrets[providerId] = `enc:${encrypted.toString('base64')}`
} else {
  // Fallback: base64 encoding (with warning)
  secrets[providerId] = `b64:${Buffer.from(apiKey).toString('base64')}`
}
```

### Configuration Storage

Other settings stored via `electron-store`:
- Enabled providers
- Bookmaker selections
- Card counting rules per bookmaker
- Deep scan settings
- UI preferences

### Card Counting Rules

Configurable per bookmaker for cards market arbitrage:

```typescript
type CardCountingRule = 'conservative' | 'standard'
// conservative: 2 cards for YY+R (counts only red)
// standard: 3 cards for YY+R (counts each card)
```

---

## Configuration & Settings

### Bookmaker Selection (Odds-API.io)

Free plans include 2 bookmakers. Selection process:

```bash
# List available bookmakers
GET https://api.odds-api.io/v3/bookmakers

# Select bookmakers for your account
PUT https://api.odds-api.io/v3/bookmakers/selected/select?apiKey=XXX&bookmakers=Bet365,SingBet

# Clear selection (limited to once per 12 hours)
PUT https://api.odds-api.io/v3/bookmakers/selected/clear?apiKey=XXX
```

### League Presets

Pre-configured league sets for quick configuration:

```typescript
const LEAGUE_PRESETS = [
  { id: 'top-5-european', leagues: ['england-premier-league', 'spain-la-liga', ...] },
  { id: 'european-elite', leagues: [...] },
  { id: 'major-european', leagues: [...] },
  { id: 'english-football', leagues: [...] },
  { id: 'international', leagues: [...] }
]
```

### Environment Variables

Not typically used; configuration is via:
1. In-app Settings UI
2. Direct storage manipulation (advanced)
3. API calls for bookmaker selection

---

## Summary

The Arbitrage Finder App is a sophisticated Electron application that:

1. **Fetches odds** from multiple providers (primarily Odds-API.io)
2. **Detects arbitrage** opportunities using mathematical models
3. **Aggregates cross-provider** data for enhanced coverage
4. **Deep scans** individual events for hidden opportunities
5. **Aggressively monitors** pre-match events with intelligent quota management
6. **Presents data** through a React-based dashboard with real-time updates

The architecture prioritizes:
- **Type safety** via TypeScript and tRPC
- **Rate limiting** to respect API quotas
- **Extensibility** through the adapter pattern
- **Data quality** via normalization and validation
- **User experience** through real-time updates and rich filtering

---

*Report generated for technical review and developer onboarding.*
