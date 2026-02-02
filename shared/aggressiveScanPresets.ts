/**
 * Aggressive Scan Presets Configuration
 *
 * Defines pre-configured sport/league combinations for aggressive scanning.
 * Uses dynamic league data from Odds-API.io with preset templates.
 */

/**
 * Represents a discovered league from the API.
 * Must match the DiscoveredLeague interface in deepScan.ts
 */
export interface DiscoveredLeague {
  name: string
  slug: string
  eventsCount: number
  sport: string
}

/**
 * Represents a discovered sport from the API.
 */
export interface DiscoveredSport {
  name: string
  slug: string
}

/**
 * User's API plan tier - determines rate limits.
 */
export type ApiPlanTier = 'free' | 'paid'

/**
 * Rate limits by plan tier.
 */
export const RATE_LIMITS_BY_TIER: Record<ApiPlanTier, number> = {
  free: 100,   // Free tier: 100 requests/hour
  paid: 5000   // Paid tier: 5000 requests/hour
}

/**
 * A preset combining multiple sports/leagues for quick selection.
 */
export interface AggressiveScanPreset {
  id: string
  name: string
  description: string
  /** List of sport slugs included in this preset */
  sports: string[]
  /** Specific league slugs (generated from template rules) */
  leagues: string[]
  /** Estimated events based on API data */
  estimatedEvents: number
  /** Preset category for UI grouping */
  category: 'major' | 'minor' | 'regional' | 'custom'
}

/**
 * Template for generating presets from API data.
 * Rules define how to select leagues from discovered data.
 */
interface PresetTemplate {
  id: string
  name: string
  description: string
  category: 'major' | 'minor' | 'regional' | 'custom'
  /** Sports to include (uses API slugs like 'football', 'tennis', 'basketball') */
  sports: string[]
  /** Rules for selecting leagues */
  leagueRules: LeagueSelectionRule
}

type LeagueSelectionRule =
  | { type: 'explicit'; slugs: string[] }
  | { type: 'all' }
  | { type: 'topN'; count: number; sortBy: 'eventsCount' }
  | { type: 'exclude'; slugs: string[] }

/**
 * Known major leagues by sport (Odds-API.io slugs).
 * These are used when API data isn't yet available.
 */
export const KNOWN_MAJOR_LEAGUES: Record<string, string[]> = {
  football: [
    'england-premier-league',
    'spain-la-liga',
    'italy-serie-a',
    'germany-bundesliga',
    'france-ligue-1',
    'europe-champions-league',
    'europe-europa-league'
  ],
  tennis: [
    'atp-australian-open',
    'atp-french-open',
    'atp-wimbledon',
    'atp-us-open',
    'atp-masters-1000',
    'wta-1000'
  ],
  basketball: [
    'usa-nba',
    'usa-ncaab',
    'europe-euroleague',
    'europe-eurocup'
  ]
}

/**
 * Preset templates that get populated with real API data.
 */
const PRESET_TEMPLATES: PresetTemplate[] = [
  // Major presets
  {
    id: 'major_football',
    name: 'Major Football Leagues',
    description: 'Top 5 European leagues + UEFA competitions',
    category: 'major',
    sports: ['football'],
    leagueRules: {
      type: 'explicit',
      slugs: [
        'england-premier-league',
        'spain-la-liga',
        'italy-serie-a',
        'germany-bundesliga',
        'france-ligue-1',
        'europe-champions-league',
        'europe-europa-league'
      ]
    }
  },
  {
    id: 'major_tennis',
    name: 'Major Tennis',
    description: 'Grand Slams + ATP/WTA 1000 tournaments',
    category: 'major',
    sports: ['tennis'],
    leagueRules: { type: 'topN', count: 8, sortBy: 'eventsCount' }
  },
  {
    id: 'major_basketball',
    name: 'Major Basketball',
    description: 'NBA, NCAA, and EuroLeague',
    category: 'major',
    sports: ['basketball'],
    leagueRules: {
      type: 'explicit',
      slugs: ['usa-nba', 'usa-ncaab', 'europe-euroleague', 'europe-eurocup']
    }
  },
  {
    id: 'major_all',
    name: 'All Major Sports',
    description: 'Top leagues across football, tennis, and basketball',
    category: 'major',
    sports: ['football', 'tennis', 'basketball'],
    leagueRules: { type: 'topN', count: 6, sortBy: 'eventsCount' }
  },

  // Full sport presets
  {
    id: 'all_football',
    name: 'All Football',
    description: 'Every available football league',
    category: 'regional',
    sports: ['football'],
    leagueRules: { type: 'all' }
  },
  {
    id: 'all_tennis',
    name: 'All Tennis',
    description: 'Every available tennis tournament',
    category: 'regional',
    sports: ['tennis'],
    leagueRules: { type: 'all' }
  },
  {
    id: 'all_basketball',
    name: 'All Basketball',
    description: 'Every available basketball league',
    category: 'regional',
    sports: ['basketball'],
    leagueRules: { type: 'all' }
  },
  {
    id: 'all_sports',
    name: 'All Sports & Leagues',
    description: 'Maximum coverage - all available sports and leagues',
    category: 'regional',
    sports: ['football', 'tennis', 'basketball'],
    leagueRules: { type: 'all' }
  }
]

/**
 * Apply league selection rules to get matching league slugs.
 */
function applyLeagueRules(
  rules: LeagueSelectionRule,
  leagues: DiscoveredLeague[],
  sports: string[]
): string[] {
  // Filter to only leagues for the specified sports
  const sportLeagues = leagues.filter((l) => sports.includes(l.sport))

  switch (rules.type) {
    case 'explicit':
      // Return only the specified slugs that exist in discovered leagues
      return rules.slugs.filter((slug) => sportLeagues.some((l) => l.slug === slug))

    case 'all':
      return sportLeagues.map((l) => l.slug)

    case 'topN':
      return sportLeagues
        .slice()
        .sort((a, b) => b.eventsCount - a.eventsCount)
        .slice(0, rules.count)
        .map((l) => l.slug)

    case 'exclude':
      return sportLeagues.filter((l) => !rules.slugs.includes(l.slug)).map((l) => l.slug)

    default:
      return []
  }
}

/**
 * Generate presets from templates using discovered API data.
 * Falls back to known major leagues if no API data is available.
 */
export function generatePresets(
  discoveredLeagues: DiscoveredLeague[],
  _discoveredSports: DiscoveredSport[]
): AggressiveScanPreset[] {
  const hasApiData = discoveredLeagues.length > 0

  return PRESET_TEMPLATES.map((template) => {
    let leagues: string[]
    let estimatedEvents: number

    if (hasApiData) {
      // Use real API data
      leagues = applyLeagueRules(template.leagueRules, discoveredLeagues, template.sports)
      estimatedEvents = discoveredLeagues
        .filter((l) => leagues.includes(l.slug))
        .reduce((sum, l) => sum + l.eventsCount, 0)
    } else {
      // Fall back to known leagues
      if (template.leagueRules.type === 'explicit') {
        leagues = template.leagueRules.slugs
      } else {
        leagues = template.sports.flatMap((sport) => KNOWN_MAJOR_LEAGUES[sport] ?? [])
      }
      // Rough estimate when no API data
      estimatedEvents = leagues.length * 5
    }

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      sports: template.sports,
      leagues,
      estimatedEvents
    }
  })
}

/**
 * Get preset templates (for cases where you need the raw templates).
 */
export function getPresetTemplates(): PresetTemplate[] {
  return [...PRESET_TEMPLATES]
}

/**
 * Configuration for aggressive scan with selected presets.
 */
export interface AggressiveScanSelection {
  /** Selected preset IDs */
  presetIds: string[]
  /** Custom selected league IDs (in addition to presets) */
  customLeagueIds: string[]
  /** Scan horizon in hours */
  scanHorizonHours: number
}

/**
 * Quota configuration - should be set based on user's plan.
 */
export interface QuotaConfig {
  /** Requests per hour limit (100 for free, 5000 for paid) */
  hourlyLimit: number
  /** Target percentage of quota to use (default 75%) */
  targetPercent: number
  /** User's plan tier */
  planTier: ApiPlanTier
}

/**
 * Creates a quota config based on plan tier.
 */
export function createQuotaConfig(planTier: ApiPlanTier, targetPercent?: number): QuotaConfig {
  return {
    hourlyLimit: RATE_LIMITS_BY_TIER[planTier],
    targetPercent: targetPercent ?? (planTier === 'free' ? 80 : 75),
    planTier
  }
}

export const DEFAULT_QUOTA_CONFIG: QuotaConfig = createQuotaConfig('paid')

export const FREE_TIER_QUOTA_CONFIG: QuotaConfig = createQuotaConfig('free')

/**
 * Estimate API requests for a given selection.
 *
 * Formula:
 * - Each event requires ~1 request per poll cycle
 * - Imminent events (< 30 min): poll every 45 seconds = 80 polls/hour
 * - Soon events (30-120 min): poll every 3 minutes = 20 polls/hour
 * - Today events (2-6 hours): poll every 10 minutes = 6 polls/hour
 * - Later events (6-24 hours): poll every 30 minutes = 2 polls/hour
 * - Events discovery: ~1 request per sport every 5 minutes = 12/hour per sport
 * - Plus: initial event discovery requests (1 per league + 1 per sport)
 *
 * Estimation uses weighted average assuming events distribute across tiers.
 * Uses actual eventsCount from API when available.
 */
export function estimateRequestsPerHour(
  selection: AggressiveScanSelection,
  presets: AggressiveScanPreset[],
  quotaConfig: QuotaConfig = DEFAULT_QUOTA_CONFIG,
  discoveredLeagues?: DiscoveredLeague[]
): {
  estimatedEvents: number
  estimatedRequestsPerHour: number
  percentOfQuota: number
  isWithinQuota: boolean
  breakdown: {
    imminent: { events: number; requests: number }
    soon: { events: number; requests: number }
    today: { events: number; requests: number }
    later: { events: number; requests: number }
    discovery: { requests: number }
  }
} {
  const { hourlyLimit, targetPercent } = quotaConfig
  const targetRequests = Math.floor(hourlyLimit * (targetPercent / 100))

  // Gather all selected leagues and their events
  const selectedLeagues = new Set<string>()
  const selectedSports = new Set<string>()
  let totalEstimatedEvents = 0

  for (const presetId of selection.presetIds) {
    const preset = presets.find((p) => p.id === presetId)
    if (preset) {
      preset.leagues.forEach((l) => selectedLeagues.add(l))
      preset.sports.forEach((s) => selectedSports.add(s))
      totalEstimatedEvents += preset.estimatedEvents
    }
  }

  // Add custom leagues - use API eventsCount if available, else estimate
  selection.customLeagueIds.forEach((l) => selectedLeagues.add(l))
  for (const leagueId of selection.customLeagueIds) {
    const league = discoveredLeagues?.find((l) => l.slug === leagueId)
    if (league) {
      totalEstimatedEvents += league.eventsCount
    } else {
      // Fallback estimate when no API data
      totalEstimatedEvents += 5
    }
  }

  // Scale by scan horizon (base estimates assume 24h horizon)
  const horizonMultiplier = selection.scanHorizonHours / 24
  totalEstimatedEvents = Math.ceil(totalEstimatedEvents * horizonMultiplier)

  // Distribute events across tiers (typical distribution)
  const tierDistribution = {
    imminent: 0.05,
    soon: 0.1,
    today: 0.25,
    later: 0.6
  }

  // Polls per hour for each tier
  const pollsPerHour = {
    imminent: 80, // 45s interval
    soon: 20, // 3min interval
    today: 6, // 10min interval
    later: 2 // 30min interval
  }

  // Calculate discovery requests: 1 per sport + 1 per league for initial discovery
  // Plus ongoing polling for updates (12 per hour per sport)
  const discoveryRequests = selectedSports.size * 12 + // Ongoing sport polling
                           selectedLeagues.size * 1 +   // League discovery (one-time, amortized)
                           selectedSports.size * 1      // Sport discovery (one-time, amortized)

  const breakdown = {
    imminent: {
      events: Math.ceil(totalEstimatedEvents * tierDistribution.imminent),
      requests: 0
    },
    soon: {
      events: Math.ceil(totalEstimatedEvents * tierDistribution.soon),
      requests: 0
    },
    today: {
      events: Math.ceil(totalEstimatedEvents * tierDistribution.today),
      requests: 0
    },
    later: {
      events: Math.ceil(totalEstimatedEvents * tierDistribution.later),
      requests: 0
    },
    discovery: {
      requests: discoveryRequests
    }
  }

  // Calculate requests for each tier (batch 10 events per request)
  const BATCH_SIZE = 10
  for (const tier of ['imminent', 'soon', 'today', 'later'] as const) {
    const batchesPerPoll = Math.ceil(breakdown[tier].events / BATCH_SIZE)
    breakdown[tier].requests = batchesPerPoll * pollsPerHour[tier]
  }

  const estimatedRequestsPerHour =
    breakdown.imminent.requests +
    breakdown.soon.requests +
    breakdown.today.requests +
    breakdown.later.requests +
    breakdown.discovery.requests

  const percentOfQuota = Math.round((estimatedRequestsPerHour / hourlyLimit) * 100)

  return {
    estimatedEvents: totalEstimatedEvents,
    estimatedRequestsPerHour,
    percentOfQuota,
    isWithinQuota: estimatedRequestsPerHour <= targetRequests,
    breakdown
  }
}

/**
 * Get preset by ID from a list of presets.
 */
export function getPresetById(
  presets: AggressiveScanPreset[],
  id: string
): AggressiveScanPreset | undefined {
  return presets.find((p) => p.id === id)
}

/**
 * Get all presets by category.
 */
export function getPresetsByCategory(
  presets: AggressiveScanPreset[],
  category: AggressiveScanPreset['category']
): AggressiveScanPreset[] {
  return presets.filter((p) => p.category === category)
}

/**
 * Get all unique league slugs from selected presets.
 */
export function getLeagueIdsFromPresets(
  presets: AggressiveScanPreset[],
  presetIds: string[]
): string[] {
  const leagueIds = new Set<string>()

  for (const presetId of presetIds) {
    const preset = presets.find((p) => p.id === presetId)
    if (preset) {
      preset.leagues.forEach((l) => leagueIds.add(l))
    }
  }

  return Array.from(leagueIds)
}

// ============================================================================
// Sport Normalization Helpers
// ============================================================================

/**
 * Sport slug mappings to normalize different naming conventions.
 * Odds-API.io uses 'football' for soccer/football.
 */
const SPORT_SLUG_NORMALIZATION: Record<string, string> = {
  // Map common variations to Odds-API.io standard
  soccer: 'football',
  futbol: 'football',
  'association-football': 'football',
  // Standard sports
  football: 'football',
  tennis: 'tennis',
  basketball: 'basketball'
}

/**
 * Normalizes a sport slug to Odds-API.io standard.
 * @param slug - The sport slug to normalize
 * @returns Normalized sport slug
 */
export function normalizeSportSlug(slug: string): string {
  const normalized = slug.toLowerCase().trim()
  return SPORT_SLUG_NORMALIZATION[normalized] ?? normalized
}

/**
 * Sports available for scanning with their display info.
 * Uses Odds-API.io sport slugs.
 */
export const SCAN_SPORTS: Array<{
  id: string
  name: string
  icon: string
  leagues: Array<{ id: string; name: string }>
}> = [
  {
    id: 'football',
    name: 'Football (Soccer)',
    icon: '⚽',
    leagues: [
      { id: 'england-premier-league', name: 'Premier League' },
      { id: 'spain-la-liga', name: 'La Liga' },
      { id: 'italy-serie-a', name: 'Serie A' },
      { id: 'germany-bundesliga', name: 'Bundesliga' },
      { id: 'france-ligue-1', name: 'Ligue 1' },
      { id: 'europe-champions-league', name: 'Champions League' },
      { id: 'europe-europa-league', name: 'Europa League' }
    ]
  },
  {
    id: 'tennis',
    name: 'Tennis',
    icon: '🎾',
    leagues: [
      { id: 'atp-australian-open', name: 'Australian Open' },
      { id: 'atp-french-open', name: 'French Open' },
      { id: 'atp-wimbledon', name: 'Wimbledon' },
      { id: 'atp-us-open', name: 'US Open' },
      { id: 'atp-masters-1000', name: 'ATP Masters 1000' },
      { id: 'wta-1000', name: 'WTA 1000' }
    ]
  },
  {
    id: 'basketball',
    name: 'Basketball',
    icon: '🏀',
    leagues: [
      { id: 'usa-nba', name: 'NBA' },
      { id: 'usa-ncaab', name: 'NCAA' },
      { id: 'europe-euroleague', name: 'EuroLeague' },
      { id: 'europe-eurocup', name: 'EuroCup' }
    ]
  }
]

// ============================================================================
// Dynamic Preset Service
// ============================================================================

/**
 * Options for building dynamic presets.
 */
export interface DynamicPresetOptions {
  /** Discovered leagues from API */
  discoveredLeagues: DiscoveredLeague[]
  /** Discovered sports from API */
  discoveredSports: DiscoveredSport[]
  /** User's plan tier for quota calculation */
  planTier?: ApiPlanTier
  /** Custom hourly limit (overrides plan tier) */
  hourlyLimit?: number
  /** Target quota percentage */
  targetPercent?: number
}

/**
 * Result of building dynamic presets.
 */
export interface DynamicPresetResult {
  /** Generated presets with actual API data */
  presets: AggressiveScanPreset[]
  /** Quota configuration based on plan */
  quotaConfig: QuotaConfig
  /** Sports that were discovered */
  availableSports: DiscoveredSport[]
  /** Leagues that were discovered */
  availableLeagues: DiscoveredLeague[]
  /** Whether API data was used (true) or fell back to static (false) */
  usedApiData: boolean
}

/**
 * Builds dynamic presets using actual API data when available.
 * Falls back to static templates if API data is not available.
 * 
 * This is the recommended way to generate presets - it ensures:
 * 1. Presets use real league slugs from the API
 * 2. Event counts come from API's eventsCount field
 * 3. Quota limits match the user's plan tier
 * 
 * @param options - Configuration options
 * @returns Dynamic preset result with presets and quota config
 */
export function buildDynamicPresets(options: DynamicPresetOptions): DynamicPresetResult {
  const { 
    discoveredLeagues, 
    discoveredSports, 
    planTier = 'paid',
    hourlyLimit,
    targetPercent
  } = options

  // Create quota config (use explicit limit if provided, else derive from plan tier)
  const quotaConfig: QuotaConfig = hourlyLimit !== undefined
    ? { hourlyLimit, targetPercent: targetPercent ?? 75, planTier }
    : createQuotaConfig(planTier, targetPercent)

  const hasApiData = discoveredLeagues.length > 0

  // Generate presets using API data if available
  const presets = generatePresets(
    hasApiData ? discoveredLeagues : [],
    hasApiData ? discoveredSports : []
  )

  // If no API data, enhance presets with static league info
  if (!hasApiData) {
    // Add estimated events from known leagues
    for (const preset of presets) {
      if (preset.estimatedEvents === 0) {
        // Rough estimate: 5 events per league
        preset.estimatedEvents = preset.leagues.length * 5
      }
    }
  }

  return {
    presets,
    quotaConfig,
    availableSports: discoveredSports,
    availableLeagues: discoveredLeagues,
    usedApiData: hasApiData
  }
}

// ============================================================================
// Backward Compatibility Exports
// ============================================================================

/**
 * @deprecated Use buildDynamicPresets() with API data instead.
 * Static presets using known major leagues (for backward compatibility).
 */
export const AGGRESSIVE_SCAN_PRESETS: AggressiveScanPreset[] = generatePresets([], [])

/**
 * @deprecated Use getLeagueIdsFromPresets(presets, presetIds) instead.
 * Legacy function signature for backward compatibility.
 */
export function getLeagueIdsFromPresetsLegacy(presetIds: string[]): string[] {
  return getLeagueIdsFromPresets(AGGRESSIVE_SCAN_PRESETS, presetIds)
}
