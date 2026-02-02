/**
 * Aggressive Scan Presets Configuration
 *
 * Defines pre-configured sport/league combinations for aggressive scanning.
 * Each preset estimates the number of API requests it will consume.
 */

/**
 * Represents a single league within a sport.
 */
export interface LeagueDefinition {
  id: string
  name: string
  /** Estimated average events per day for this league */
  avgEventsPerDay: number
}

/**
 * Represents a sport category with its leagues.
 */
export interface SportDefinition {
  id: string
  name: string
  icon: string
  leagues: LeagueDefinition[]
}

/**
 * A preset combining multiple sports/leagues for quick selection.
 */
export interface AggressiveScanPreset {
  id: string
  name: string
  description: string
  /** List of sport IDs included in this preset */
  sports: string[]
  /** Optional specific league IDs (if empty, all leagues for selected sports) */
  leagues?: string[]
  /** Estimated events this preset will scan */
  estimatedEvents: number
  /** Preset category for UI grouping */
  category: 'major' | 'minor' | 'regional' | 'custom'
}

/**
 * Available sports and their leagues for aggressive scanning.
 */
export const SCAN_SPORTS: SportDefinition[] = [
  {
    id: 'soccer',
    name: 'Soccer',
    icon: '⚽',
    leagues: [
      // Major European Leagues
      { id: 'soccer_epl', name: 'English Premier League', avgEventsPerDay: 3 },
      { id: 'soccer_spain_la_liga', name: 'La Liga (Spain)', avgEventsPerDay: 3 },
      { id: 'soccer_germany_bundesliga', name: 'Bundesliga (Germany)', avgEventsPerDay: 3 },
      { id: 'soccer_italy_serie_a', name: 'Serie A (Italy)', avgEventsPerDay: 3 },
      { id: 'soccer_france_ligue_one', name: 'Ligue 1 (France)', avgEventsPerDay: 3 },
      { id: 'soccer_uefa_champs_league', name: 'UEFA Champions League', avgEventsPerDay: 4 },
      { id: 'soccer_uefa_europa_league', name: 'UEFA Europa League', avgEventsPerDay: 4 },
      // Secondary European Leagues
      { id: 'soccer_netherlands_eredivisie', name: 'Eredivisie (Netherlands)', avgEventsPerDay: 2 },
      { id: 'soccer_portugal_primeira_liga', name: 'Primeira Liga (Portugal)', avgEventsPerDay: 2 },
      { id: 'soccer_turkey_super_league', name: 'Super Lig (Turkey)', avgEventsPerDay: 2 },
      { id: 'soccer_belgium_first_div', name: 'First Division A (Belgium)', avgEventsPerDay: 2 },
      { id: 'soccer_scotland_premiership', name: 'Scottish Premiership', avgEventsPerDay: 2 },
      // Lower Divisions
      { id: 'soccer_efl_champ', name: 'EFL Championship (England)', avgEventsPerDay: 4 },
      { id: 'soccer_germany_bundesliga2', name: '2. Bundesliga (Germany)', avgEventsPerDay: 3 },
      { id: 'soccer_spain_segunda_division', name: 'La Liga 2 (Spain)', avgEventsPerDay: 3 },
      { id: 'soccer_italy_serie_b', name: 'Serie B (Italy)', avgEventsPerDay: 3 },
      { id: 'soccer_france_ligue_two', name: 'Ligue 2 (France)', avgEventsPerDay: 3 },
      // South American
      { id: 'soccer_brazil_campeonato', name: 'Brasileirao Serie A', avgEventsPerDay: 4 },
      { id: 'soccer_argentina_primera_division', name: 'Argentina Primera Division', avgEventsPerDay: 4 },
      { id: 'soccer_conmebol_libertadores', name: 'Copa Libertadores', avgEventsPerDay: 2 },
      // Other
      { id: 'soccer_usa_mls', name: 'MLS (USA)', avgEventsPerDay: 3 },
      { id: 'soccer_australia_aleague', name: 'A-League (Australia)', avgEventsPerDay: 2 },
      { id: 'soccer_japan_j_league', name: 'J1 League (Japan)', avgEventsPerDay: 3 }
    ]
  },
  {
    id: 'tennis',
    name: 'Tennis',
    icon: '🎾',
    leagues: [
      { id: 'tennis_atp_aus_open', name: 'Australian Open', avgEventsPerDay: 30 },
      { id: 'tennis_atp_french_open', name: 'French Open', avgEventsPerDay: 30 },
      { id: 'tennis_atp_wimbledon', name: 'Wimbledon', avgEventsPerDay: 30 },
      { id: 'tennis_atp_us_open', name: 'US Open', avgEventsPerDay: 30 },
      { id: 'tennis_atp_1000', name: 'ATP Masters 1000', avgEventsPerDay: 20 },
      { id: 'tennis_atp_500', name: 'ATP 500', avgEventsPerDay: 15 },
      { id: 'tennis_atp_250', name: 'ATP 250', avgEventsPerDay: 15 },
      { id: 'tennis_wta_1000', name: 'WTA 1000', avgEventsPerDay: 15 },
      { id: 'tennis_wta_500', name: 'WTA 500', avgEventsPerDay: 12 },
      { id: 'tennis_wta_250', name: 'WTA 250', avgEventsPerDay: 12 },
      { id: 'tennis_challenger', name: 'ATP Challenger Tour', avgEventsPerDay: 25 },
      { id: 'tennis_itf', name: 'ITF Tournaments', avgEventsPerDay: 40 }
    ]
  },
  {
    id: 'basketball',
    name: 'Basketball',
    icon: '🏀',
    leagues: [
      { id: 'basketball_nba', name: 'NBA', avgEventsPerDay: 8 },
      { id: 'basketball_ncaab', name: 'NCAA Basketball', avgEventsPerDay: 20 },
      { id: 'basketball_euroleague', name: 'EuroLeague', avgEventsPerDay: 4 },
      { id: 'basketball_eurocup', name: 'EuroCup', avgEventsPerDay: 4 },
      { id: 'basketball_spain_acb', name: 'Liga ACB (Spain)', avgEventsPerDay: 3 },
      { id: 'basketball_germany_bbl', name: 'BBL (Germany)', avgEventsPerDay: 3 },
      { id: 'basketball_france_lnb', name: 'LNB Pro A (France)', avgEventsPerDay: 3 },
      { id: 'basketball_italy_lega', name: 'Lega Basket (Italy)', avgEventsPerDay: 3 },
      { id: 'basketball_turkey_bsl', name: 'BSL (Turkey)', avgEventsPerDay: 3 },
      { id: 'basketball_australia_nbl', name: 'NBL (Australia)', avgEventsPerDay: 2 },
      { id: 'basketball_wnba', name: 'WNBA', avgEventsPerDay: 3 }
    ]
  }
]

/**
 * Helper to get league IDs for a sport category.
 */
function getLeagueIdsForSport(sportId: string, majorOnly: boolean = false): string[] {
  const sport = SCAN_SPORTS.find((s) => s.id === sportId)
  if (!sport) return []

  if (!majorOnly) {
    return sport.leagues.map((l) => l.id)
  }

  // Major leagues are the first 6-8 leagues in each sport
  const majorCounts: Record<string, number> = {
    soccer: 7, // Top 5 leagues + UCL + UEL
    tennis: 6, // Grand Slams + ATP/WTA 1000
    basketball: 4 // NBA, NCAAB, EuroLeague, EuroCup
  }

  const count = majorCounts[sportId] || 4
  return sport.leagues.slice(0, count).map((l) => l.id)
}

/**
 * Pre-configured presets for quick selection.
 */
export const AGGRESSIVE_SCAN_PRESETS: AggressiveScanPreset[] = [
  // Major Presets
  {
    id: 'major_soccer',
    name: 'Major Soccer Leagues',
    description: 'Top 5 European leagues + UEFA competitions',
    sports: ['soccer'],
    leagues: getLeagueIdsForSport('soccer', true),
    estimatedEvents: 25,
    category: 'major'
  },
  {
    id: 'major_tennis',
    name: 'Major Tennis',
    description: 'Grand Slams + ATP/WTA 1000 tournaments',
    sports: ['tennis'],
    leagues: getLeagueIdsForSport('tennis', true),
    estimatedEvents: 80,
    category: 'major'
  },
  {
    id: 'major_basketball',
    name: 'Major Basketball',
    description: 'NBA, NCAAB, and EuroLeague',
    sports: ['basketball'],
    leagues: getLeagueIdsForSport('basketball', true),
    estimatedEvents: 35,
    category: 'major'
  },
  {
    id: 'major_all',
    name: 'All Major Sports',
    description: 'Combined major leagues across all sports',
    sports: ['soccer', 'tennis', 'basketball'],
    leagues: [
      ...getLeagueIdsForSport('soccer', true),
      ...getLeagueIdsForSport('tennis', true),
      ...getLeagueIdsForSport('basketball', true)
    ],
    estimatedEvents: 140,
    category: 'major'
  },

  // Minor/Secondary Presets
  {
    id: 'minor_soccer',
    name: 'Secondary Soccer Leagues',
    description: 'European second divisions + smaller leagues',
    sports: ['soccer'],
    leagues: getLeagueIdsForSport('soccer', false).slice(7), // Skip major leagues
    estimatedEvents: 45,
    category: 'minor'
  },
  {
    id: 'minor_tennis',
    name: 'Minor Tennis',
    description: 'ATP 250/500, WTA 250/500, Challengers, ITF',
    sports: ['tennis'],
    leagues: getLeagueIdsForSport('tennis', false).slice(6), // Skip major tournaments
    estimatedEvents: 105,
    category: 'minor'
  },
  {
    id: 'minor_basketball',
    name: 'Minor Basketball',
    description: 'European national leagues + WNBA',
    sports: ['basketball'],
    leagues: getLeagueIdsForSport('basketball', false).slice(4), // Skip major leagues
    estimatedEvents: 20,
    category: 'minor'
  },
  {
    id: 'minor_all',
    name: 'All Minor Leagues',
    description: 'Combined secondary leagues across all sports',
    sports: ['soccer', 'tennis', 'basketball'],
    leagues: [
      ...getLeagueIdsForSport('soccer', false).slice(7),
      ...getLeagueIdsForSport('tennis', false).slice(6),
      ...getLeagueIdsForSport('basketball', false).slice(4)
    ],
    estimatedEvents: 170,
    category: 'minor'
  },

  // Full Sport Presets
  {
    id: 'all_soccer',
    name: 'All Soccer',
    description: 'Every available soccer league',
    sports: ['soccer'],
    leagues: getLeagueIdsForSport('soccer', false),
    estimatedEvents: 70,
    category: 'regional'
  },
  {
    id: 'all_tennis',
    name: 'All Tennis',
    description: 'Every available tennis tournament',
    sports: ['tennis'],
    leagues: getLeagueIdsForSport('tennis', false),
    estimatedEvents: 185,
    category: 'regional'
  },
  {
    id: 'all_basketball',
    name: 'All Basketball',
    description: 'Every available basketball league',
    sports: ['basketball'],
    leagues: getLeagueIdsForSport('basketball', false),
    estimatedEvents: 55,
    category: 'regional'
  },

  // Everything
  {
    id: 'all_sports',
    name: 'All Sports & Leagues',
    description: 'Maximum coverage - all sports and leagues',
    sports: ['soccer', 'tennis', 'basketball'],
    leagues: [
      ...getLeagueIdsForSport('soccer', false),
      ...getLeagueIdsForSport('tennis', false),
      ...getLeagueIdsForSport('basketball', false)
    ],
    estimatedEvents: 310,
    category: 'regional'
  }
]

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
 * Estimate API requests for a given selection.
 *
 * Formula:
 * - Each event requires ~1 request per poll cycle
 * - Imminent events (< 30 min): poll every 45 seconds = 80 polls/hour
 * - Soon events (30-120 min): poll every 3 minutes = 20 polls/hour
 * - Today events (2-6 hours): poll every 10 minutes = 6 polls/hour
 * - Later events (6-24 hours): poll every 30 minutes = 2 polls/hour
 *
 * Estimation uses weighted average assuming events distribute across tiers.
 */
export function estimateRequestsPerHour(
  selection: AggressiveScanSelection,
  quotaTargetPercent: number = 75
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
  }
} {
  const HOURLY_LIMIT = 5000
  const targetRequests = Math.floor(HOURLY_LIMIT * (quotaTargetPercent / 100))

  // Gather all selected leagues
  const selectedLeagueIds = new Set<string>()

  for (const presetId of selection.presetIds) {
    const preset = AGGRESSIVE_SCAN_PRESETS.find((p) => p.id === presetId)
    if (preset?.leagues) {
      for (const leagueId of preset.leagues) {
        selectedLeagueIds.add(leagueId)
      }
    }
  }

  for (const leagueId of selection.customLeagueIds) {
    selectedLeagueIds.add(leagueId)
  }

  // Calculate estimated events
  let totalEstimatedEvents = 0
  for (const sport of SCAN_SPORTS) {
    for (const league of sport.leagues) {
      if (selectedLeagueIds.has(league.id)) {
        // Scale events by scan horizon (assuming avgEventsPerDay is for 24h)
        const scaledEvents = Math.ceil(league.avgEventsPerDay * (selection.scanHorizonHours / 24))
        totalEstimatedEvents += scaledEvents
      }
    }
  }

  // Distribute events across tiers (typical distribution)
  // Based on 48-hour horizon: imminent ~5%, soon ~10%, today ~25%, later ~60%
  const tierDistribution = {
    imminent: 0.05,
    soon: 0.1,
    today: 0.25,
    later: 0.6
  }

  // Polls per hour for each tier (based on default poll intervals)
  const pollsPerHour = {
    imminent: 80, // 45s interval
    soon: 20, // 3min interval
    today: 6, // 10min interval
    later: 2 // 30min interval
  }

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
    }
  }

  // Calculate requests for each tier
  // Batch requests: up to 10 events per request
  const BATCH_SIZE = 10
  for (const tier of Object.keys(breakdown) as Array<keyof typeof breakdown>) {
    const batchesPerPoll = Math.ceil(breakdown[tier].events / BATCH_SIZE)
    breakdown[tier].requests = batchesPerPoll * pollsPerHour[tier]
  }

  const estimatedRequestsPerHour =
    breakdown.imminent.requests +
    breakdown.soon.requests +
    breakdown.today.requests +
    breakdown.later.requests

  const percentOfQuota = Math.round((estimatedRequestsPerHour / HOURLY_LIMIT) * 100)

  return {
    estimatedEvents: totalEstimatedEvents,
    estimatedRequestsPerHour,
    percentOfQuota,
    isWithinQuota: estimatedRequestsPerHour <= targetRequests,
    breakdown
  }
}

/**
 * Get preset by ID.
 */
export function getPresetById(id: string): AggressiveScanPreset | undefined {
  return AGGRESSIVE_SCAN_PRESETS.find((p) => p.id === id)
}

/**
 * Get all presets by category.
 */
export function getPresetsByCategory(
  category: AggressiveScanPreset['category']
): AggressiveScanPreset[] {
  return AGGRESSIVE_SCAN_PRESETS.filter((p) => p.category === category)
}

/**
 * Get all unique league IDs from selected presets.
 */
export function getLeagueIdsFromPresets(presetIds: string[]): string[] {
  const leagueIds = new Set<string>()

  for (const presetId of presetIds) {
    const preset = AGGRESSIVE_SCAN_PRESETS.find((p) => p.id === presetId)
    if (preset?.leagues) {
      for (const leagueId of preset.leagues) {
        leagueIds.add(leagueId)
      }
    }
  }

  return Array.from(leagueIds)
}
