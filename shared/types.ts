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
