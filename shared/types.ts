export const PROVIDER_IDS = ['odds-api-io', 'the-odds-api'] as const

export type ProviderId = (typeof PROVIDER_IDS)[number]

export type SystemStatus = 'OK' | 'Degraded' | 'Error' | 'Stale'

export type ProviderStatus = 'OK' | 'Degraded' | 'Down' | 'QuotaLimited' | 'ConfigMissing'

export interface ProviderStatusSummary {
  providerId: ProviderId
  status: ProviderStatus
  lastSuccessfulFetchAt: string | null
}

export interface DashboardStatusSnapshot {
  systemStatus: SystemStatus
  providers: ProviderStatusSummary[]
  lastUpdatedAt: string | null
}

export interface ArbitrageOpportunity {
  id: string
  sport: string
  event: {
    name: string
    date: string
    league: string
  }
  legs: [
    {
      bookmaker: string
      market: string
      odds: number
      outcome: string
    },
    {
      bookmaker: string
      market: string
      odds: number
      outcome: string
    }
  ]
  roi: number
  foundAt: string
  /** Provider that sourced this opportunity (Story 5.1 multi-provider support) */
  providerId?: ProviderId
  /**
   * All providers that returned this opportunity (Story 5.2 merged feed).
   * Populated only when the same opportunity was found from multiple providers
   * during deduplication. The `providerId` field contains the "winning" source
   * (highest ROI or first-seen), while `mergedFrom` contains all source providers.
   */
  mergedFrom?: ProviderId[]
  /**
   * Indicates this opportunity was created by combining odds from different providers.
   * Story 5.4: Cross-Provider Arbitrage Aggregator.
   */
  isCrossProvider?: boolean
}

/**
 * Represents a single market quote extracted from an arbitrage opportunity leg.
 * Used for cross-provider arbitrage detection where quotes from different
 * providers/bookmakers are combined to find new arbitrage opportunities.
 *
 * Story 5.4: Cross-Provider Arbitrage Aggregator
 */
export interface MarketQuote {
  /** Normalized event key for cross-provider matching */
  eventKey: string
  /** Source provider ID */
  providerId: ProviderId
  /** Bookmaker name */
  bookmaker: string
  /** Canonical market type (e.g., 'h2h', 'btts', 'handicap') */
  market: string
  /** Outcome identifier ('home', 'away', 'yes', 'no', etc.) */
  outcome: string
  /** Decimal odds */
  odds: number
  /** Original event name for display/debugging */
  originalEventName: string
  /** Original event date for staleness tracking */
  originalEventDate: string
  /** Original event league for cross-provider opportunity display */
  originalLeague: string
  /** When the quote was fetched */
  foundAt: string
  /** Handicap point value for spread markets (optional, future use) */
  point?: number
}

export interface ArbitrageAdapter {
  id: ProviderId
  fetchOpportunities(): Promise<ArbitrageOpportunity[]>
  /**
   * Marker indicating that this adapter's fetchOpportunities implementation
   * already routes all outbound HTTP calls through the centralized rate limiter.
   */
  __usesCentralRateLimiter?: true
}

export interface ProviderMetadata {
  id: ProviderId
  label: string
  kind: 'production' | 'test'
  displayName: string
}

export const PROVIDERS: ProviderMetadata[] = [
  {
    id: 'odds-api-io',
    label: 'Production (Odds-API.io)',
    kind: 'production',
    displayName: 'Odds-API.io'
  },
  {
    id: 'the-odds-api',
    label: 'Test (The-Odds-API.com)',
    kind: 'test',
    displayName: 'The-Odds-API.com'
  }
]

export const DEFAULT_PROVIDER_ID: ProviderId = 'the-odds-api'

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && (PROVIDER_IDS as readonly string[]).includes(value)
}
