export const PROVIDER_IDS = ['odds-api-io', 'the-odds-api'] as const

export type ProviderId = (typeof PROVIDER_IDS)[number]

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
