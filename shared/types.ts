export const PROVIDER_IDS = ['odds-api-io', 'the-odds-api'] as const

export type ProviderId = (typeof PROVIDER_IDS)[number]

// ============================================================================
// Market Groups and Metadata (Story 6.1: Expanded Two-Way Market Types)
// ============================================================================

/**
 * Market groups for categorizing arbitrage opportunity market types.
 * Each market belongs to exactly one group for filtering purposes.
 */
export const MARKET_GROUPS = ['goals', 'handicap', 'corners', 'cards', 'shots', 'other'] as const

export type MarketGroup = (typeof MARKET_GROUPS)[number]

/**
 * Time period for a market.
 */
export type MarketPeriod = 'ft' | '1h' | '2h'

/**
 * Rich metadata describing a market type.
 * Used for filtering, display, and categorization.
 */
export interface MarketMetadata {
  /** Market group for filtering (e.g., 'goals', 'corners') */
  group: MarketGroup
  /** Canonical market key (e.g., 'corners_over_9.5_ft') */
  key: string
  /** Human-readable label (e.g., 'Corners Over 9.5 (Full Time)') */
  label: string
  /** Time period (optional - some markets are whole-match only) */
  period?: MarketPeriod
  /** Line/point value for O/U or handicap markets (optional) */
  line?: number
  /** Side for team-specific markets: 'home', 'away', or 'match' */
  side?: 'home' | 'away' | 'match'
}

/**
 * Market subcategory for more granular market organization.
 * Each subcategory belongs to a parent MarketGroup.
 */
export interface MarketSubcategory {
  id: string
  label: string
  description: string
  periods: MarketPeriod[]
  teamScope: ('match' | 'home' | 'away')[]
  hasLine: boolean
}

/**
 * Market group display metadata for UI with subcategories.
 */
export interface MarketGroupDisplay {
  group: MarketGroup
  label: string
  description: string
  icon?: string
  subcategories: MarketSubcategory[]
}

/**
 * Comprehensive market group displays with subcategories.
 * Organized for soccer/football arbitrage betting.
 */
export const MARKET_GROUP_DISPLAYS: MarketGroupDisplay[] = [
  {
    group: 'goals',
    label: 'Goals',
    description: 'Goal-related markets including totals, BTTS, team goals',
    icon: '⚽',
    subcategories: [
      {
        id: 'goals_total_ou',
        label: 'Goals Over/Under',
        description: 'Total match goals over/under a line',
        periods: ['ft', '1h', '2h'],
        teamScope: ['match'],
        hasLine: true
      },
      {
        id: 'btts',
        label: 'Both Teams To Score',
        description: 'Yes/No on both teams scoring',
        periods: ['ft', '1h', '2h'],
        teamScope: ['match'],
        hasLine: false
      },
      {
        id: 'team_goals_ou',
        label: 'Team Goals Over/Under',
        description: 'Home or away team goals over/under',
        periods: ['ft', '1h', '2h'],
        teamScope: ['home', 'away'],
        hasLine: true
      },
      {
        id: 'clean_sheet',
        label: 'Clean Sheet',
        description: 'Team to keep a clean sheet',
        periods: ['ft'],
        teamScope: ['home', 'away'],
        hasLine: false
      },
      {
        id: 'moneyline',
        label: 'Match Winner (1X2)',
        description: 'Three-way result betting',
        periods: ['ft', '1h', '2h'],
        teamScope: ['match'],
        hasLine: false
      },
      {
        id: 'draw_no_bet',
        label: 'Draw No Bet',
        description: 'Two-way result, stake returned on draw',
        periods: ['ft', '1h', '2h'],
        teamScope: ['match'],
        hasLine: false
      }
    ]
  },
  {
    group: 'handicap',
    label: 'Handicaps',
    description: 'Asian handicap and spread betting markets',
    icon: '📊',
    subcategories: [
      {
        id: 'asian_handicap',
        label: 'Asian Handicap',
        description: 'Two-way handicap with quarter/half lines',
        periods: ['ft', '1h', '2h'],
        teamScope: ['match'],
        hasLine: true
      },
      {
        id: 'european_handicap',
        label: 'European Handicap',
        description: 'Three-way handicap including draw',
        periods: ['ft', '1h', '2h'],
        teamScope: ['match'],
        hasLine: true
      }
    ]
  },
  {
    group: 'corners',
    label: 'Corners',
    description: 'Corner kick totals, handicaps, and team corners',
    icon: '🚩',
    subcategories: [
      {
        id: 'corners_total_ou',
        label: 'Corners Over/Under',
        description: 'Total match corners over/under',
        periods: ['ft', '1h', '2h'],
        teamScope: ['match'],
        hasLine: true
      },
      {
        id: 'team_corners_ou',
        label: 'Team Corners Over/Under',
        description: 'Home or away team corners over/under',
        periods: ['ft', '1h', '2h'],
        teamScope: ['home', 'away'],
        hasLine: true
      },
      {
        id: 'corners_handicap',
        label: 'Corners Handicap',
        description: 'Asian handicap on corners',
        periods: ['ft', '1h', '2h'],
        teamScope: ['match'],
        hasLine: true
      }
    ]
  },
  {
    group: 'cards',
    label: 'Cards',
    description: 'Booking points, card totals, red cards',
    icon: '🟨',
    subcategories: [
      {
        id: 'cards_total_ou',
        label: 'Cards Over/Under',
        description: 'Total match cards over/under',
        periods: ['ft', '1h', '2h'],
        teamScope: ['match'],
        hasLine: true
      },
      {
        id: 'team_cards_ou',
        label: 'Team Cards Over/Under',
        description: 'Home or away team cards over/under',
        periods: ['ft', '1h', '2h'],
        teamScope: ['home', 'away'],
        hasLine: true
      },
      {
        id: 'red_card',
        label: 'Red Card Yes/No',
        description: 'Red card to be shown in match',
        periods: ['ft', '1h', '2h'],
        teamScope: ['match'],
        hasLine: false
      },
      {
        id: 'booking_points',
        label: 'Booking Points',
        description: 'Total booking points (10 yellow, 25 red)',
        periods: ['ft'],
        teamScope: ['match'],
        hasLine: true
      }
    ]
  },
  {
    group: 'shots',
    label: 'Shots',
    description: 'Shot totals, shots on target',
    icon: '🎯',
    subcategories: [
      {
        id: 'shots_total_ou',
        label: 'Shots Over/Under',
        description: 'Total match shots over/under',
        periods: ['ft', '1h', '2h'],
        teamScope: ['match'],
        hasLine: true
      },
      {
        id: 'team_shots_ou',
        label: 'Team Shots Over/Under',
        description: 'Home or away team shots over/under',
        periods: ['ft', '1h', '2h'],
        teamScope: ['home', 'away'],
        hasLine: true
      },
      {
        id: 'shots_on_target_ou',
        label: 'Shots on Target Over/Under',
        description: 'Total shots on target over/under',
        periods: ['ft', '1h', '2h'],
        teamScope: ['match'],
        hasLine: true
      },
      {
        id: 'team_sot_ou',
        label: 'Team Shots on Target O/U',
        description: 'Home or away team SOT over/under',
        periods: ['ft', '1h', '2h'],
        teamScope: ['home', 'away'],
        hasLine: true
      }
    ]
  },
  {
    group: 'other',
    label: 'Other',
    description: 'Offsides, fouls, penalties, and miscellaneous',
    icon: '📋',
    subcategories: [
      {
        id: 'offsides_total_ou',
        label: 'Offsides Over/Under',
        description: 'Total match offsides over/under',
        periods: ['ft', '1h', '2h'],
        teamScope: ['match'],
        hasLine: true
      },
      {
        id: 'team_offsides_ou',
        label: 'Team Offsides Over/Under',
        description: 'Home or away team offsides over/under',
        periods: ['ft', '1h', '2h'],
        teamScope: ['home', 'away'],
        hasLine: true
      },
      {
        id: 'fouls_total_ou',
        label: 'Fouls Over/Under',
        description: 'Total match fouls over/under',
        periods: ['ft', '1h', '2h'],
        teamScope: ['match'],
        hasLine: true
      },
      {
        id: 'team_fouls_ou',
        label: 'Team Fouls Over/Under',
        description: 'Home or away team fouls over/under',
        periods: ['ft', '1h', '2h'],
        teamScope: ['home', 'away'],
        hasLine: true
      },
      {
        id: 'penalty_awarded',
        label: 'Penalty Awarded Yes/No',
        description: 'Penalty to be awarded in match',
        periods: ['ft', '1h', '2h'],
        teamScope: ['match'],
        hasLine: false
      }
    ]
  }
]

/**
 * Creates a canonical market key from components.
 */
export function createMarketKey(
  group: MarketGroup,
  type: string,
  options: { line?: number; period?: MarketPeriod; side?: 'home' | 'away' | 'match' } = {}
): string {
  const parts = [group, type]
  if (options.side && options.side !== 'match') {
    parts.push(options.side)
  }
  if (options.line !== undefined) {
    parts.push(options.line.toString())
  }
  if (options.period) {
    parts.push(options.period)
  }
  return parts.join('_')
}

/**
 * Parses a canonical market key into its components.
 */
export function parseMarketKey(key: string): Partial<MarketMetadata> {
  const parts = key.split('_')
  const group = parts[0] as MarketGroup

  if (!MARKET_GROUPS.includes(group)) {
    return { group: 'other', key }
  }

  const result: Partial<MarketMetadata> = { group, key }

  // Parse period from last part if valid
  const lastPart = parts[parts.length - 1]
  if (['ft', '1h', '2h'].includes(lastPart)) {
    result.period = lastPart as MarketPeriod
  }

  // Parse line (numeric value in parts)
  for (const part of parts) {
    const num = parseFloat(part)
    if (!isNaN(num)) {
      result.line = num
      break
    }
  }

  // Parse side
  if (parts.includes('home')) {
    result.side = 'home'
  } else if (parts.includes('away')) {
    result.side = 'away'
  }

  return result
}

/**
 * Known market type patterns for inference.
 * Maps provider market strings to canonical group assignments.
 * Story 7.4: Extended with comprehensive two-way market patterns.
 */
export const MARKET_PATTERNS: Record<string, { group: MarketGroup; baseType: string }> = {
  // Goals group - existing patterns
  h2h: { group: 'goals', baseType: 'moneyline' },
  moneyline: { group: 'goals', baseType: 'moneyline' },
  'match-winner': { group: 'goals', baseType: 'moneyline' },
  totals: { group: 'goals', baseType: 'totals' },
  'over/under': { group: 'goals', baseType: 'totals' },
  over_under: { group: 'goals', baseType: 'totals' },
  btts: { group: 'goals', baseType: 'btts' },
  'both-teams-to-score': { group: 'goals', baseType: 'btts' },
  both_teams_to_score: { group: 'goals', baseType: 'btts' },
  btts_yes: { group: 'goals', baseType: 'btts' },
  btts_no: { group: 'goals', baseType: 'btts' },
  'draw-no-bet': { group: 'goals', baseType: 'draw_no_bet' },
  draw_no_bet: { group: 'goals', baseType: 'draw_no_bet' },
  dnb: { group: 'goals', baseType: 'draw_no_bet' },
  clean_sheet: { group: 'goals', baseType: 'clean_sheet' },
  cleansheet: { group: 'goals', baseType: 'clean_sheet' },
  goal_in_match: { group: 'goals', baseType: 'goal_occurrence' },
  team_totals: { group: 'goals', baseType: 'team_totals' },
  home_totals: { group: 'goals', baseType: 'team_totals' },
  away_totals: { group: 'goals', baseType: 'team_totals' },
  // Task 1.1: Goal in 1H/2H binaries and team-specific variants
  goal_in_1h: { group: 'goals', baseType: 'goal_occurrence_1h' },
  goal_in_2h: { group: 'goals', baseType: 'goal_occurrence_2h' },
  goal_in_match_yes: { group: 'goals', baseType: 'goal_occurrence' },
  goal_in_match_no: { group: 'goals', baseType: 'goal_occurrence' },
  first_half_goal: { group: 'goals', baseType: 'goal_occurrence_1h' },
  second_half_goal: { group: 'goals', baseType: 'goal_occurrence_2h' },
  home_to_score: { group: 'goals', baseType: 'team_to_score' },
  away_to_score: { group: 'goals', baseType: 'team_to_score' },
  home_clean_sheet: { group: 'goals', baseType: 'clean_sheet' },
  away_clean_sheet: { group: 'goals', baseType: 'clean_sheet' },
  goals_1h: { group: 'goals', baseType: 'totals_1h' },
  goals_2h: { group: 'goals', baseType: 'totals_2h' },
  first_half_totals: { group: 'goals', baseType: 'totals_1h' },
  second_half_totals: { group: 'goals', baseType: 'totals_2h' },

  // Handicap group - existing patterns
  handicap: { group: 'handicap', baseType: 'handicap' },
  spreads: { group: 'handicap', baseType: 'handicap' },
  spread: { group: 'handicap', baseType: 'handicap' },
  asian_handicap: { group: 'handicap', baseType: 'asian_handicap' },
  ah: { group: 'handicap', baseType: 'asian_handicap' },
  '0-handicap': { group: 'handicap', baseType: 'handicap' },
  '0_handicap': { group: 'handicap', baseType: 'handicap' },
  european_handicap: { group: 'handicap', baseType: 'european_handicap' },

  // Corners group - comprehensive patterns (Task 1.2)
  corners: { group: 'corners', baseType: 'corners' },
  corner_totals: { group: 'corners', baseType: 'corners_totals' },
  corners_over: { group: 'corners', baseType: 'corners_over' },
  corners_under: { group: 'corners', baseType: 'corners_under' },
  corner_handicap: { group: 'corners', baseType: 'corners_handicap' },
  corners_handicap: { group: 'corners', baseType: 'corners_handicap' },
  corner_race: { group: 'corners', baseType: 'corners_race' },
  race_to_corners: { group: 'corners', baseType: 'corners_race' },
  team_corners: { group: 'corners', baseType: 'team_corners' },
  home_corners: { group: 'corners', baseType: 'team_corners' },
  away_corners: { group: 'corners', baseType: 'team_corners' },
  match_corners: { group: 'corners', baseType: 'corners_totals' },
  match_corners_over: { group: 'corners', baseType: 'corners_over' },
  match_corners_under: { group: 'corners', baseType: 'corners_under' },
  first_half_corners: { group: 'corners', baseType: 'corners_1h' },
  second_half_corners: { group: 'corners', baseType: 'corners_2h' },
  corners_1h: { group: 'corners', baseType: 'corners_1h' },
  corners_2h: { group: 'corners', baseType: 'corners_2h' },
  corner_match_bet: { group: 'corners', baseType: 'corners_winner' },
  corners_totals: { group: 'corners', baseType: 'corners_totals' },

  // Cards group - comprehensive patterns (Task 1.3)
  cards: { group: 'cards', baseType: 'cards' },
  card_totals: { group: 'cards', baseType: 'cards_totals' },
  cards_over: { group: 'cards', baseType: 'cards_over' },
  cards_under: { group: 'cards', baseType: 'cards_under' },
  booking_totals: { group: 'cards', baseType: 'cards_totals' },
  bookings: { group: 'cards', baseType: 'cards_totals' },
  red_card: { group: 'cards', baseType: 'red_card' },
  red_card_yes: { group: 'cards', baseType: 'red_card' },
  red_card_no: { group: 'cards', baseType: 'red_card' },
  team_cards: { group: 'cards', baseType: 'team_cards' },
  home_cards: { group: 'cards', baseType: 'team_cards' },
  away_cards: { group: 'cards', baseType: 'team_cards' },
  player_booked: { group: 'cards', baseType: 'player_booked' },
  match_cards: { group: 'cards', baseType: 'cards_totals' },
  match_bookings: { group: 'cards', baseType: 'cards_totals' },
  booking_points: { group: 'cards', baseType: 'booking_points' },
  first_half_cards: { group: 'cards', baseType: 'cards_1h' },
  cards_1h: { group: 'cards', baseType: 'cards_1h' },
  cards_2h: { group: 'cards', baseType: 'cards_2h' },
  any_player_red: { group: 'cards', baseType: 'red_card' },
  red_card_shown: { group: 'cards', baseType: 'red_card' },
  cards_totals: { group: 'cards', baseType: 'cards_totals' },

  // Shots group - comprehensive patterns (Task 1.4)
  shots: { group: 'shots', baseType: 'shots' },
  shot_totals: { group: 'shots', baseType: 'shots_totals' },
  shots_over: { group: 'shots', baseType: 'shots_over' },
  shots_under: { group: 'shots', baseType: 'shots_under' },
  shots_on_target: { group: 'shots', baseType: 'shots_on_target' },
  sot: { group: 'shots', baseType: 'shots_on_target' },
  team_shots: { group: 'shots', baseType: 'team_shots' },
  home_shots: { group: 'shots', baseType: 'team_shots' },
  away_shots: { group: 'shots', baseType: 'team_shots' },
  match_shots: { group: 'shots', baseType: 'shots_totals' },
  total_shots: { group: 'shots', baseType: 'shots_totals' },
  shots_total: { group: 'shots', baseType: 'shots_totals' },
  sot_over: { group: 'shots', baseType: 'shots_on_target_over' },
  sot_under: { group: 'shots', baseType: 'shots_on_target_under' },
  shots_on_target_total: { group: 'shots', baseType: 'shots_on_target' },
  shots_on_target_over: { group: 'shots', baseType: 'shots_on_target_over' },
  shots_on_target_under: { group: 'shots', baseType: 'shots_on_target_under' },
  shots_totals: { group: 'shots', baseType: 'shots_totals' },

  // Other group - comprehensive patterns (Task 1.5)
  offsides: { group: 'other', baseType: 'offsides' },
  offside_totals: { group: 'other', baseType: 'offsides' },
  fouls: { group: 'other', baseType: 'fouls' },
  foul_totals: { group: 'other', baseType: 'fouls' },
  penalty: { group: 'other', baseType: 'penalty' },
  penalty_yes: { group: 'other', baseType: 'penalty' },
  penalty_no: { group: 'other', baseType: 'penalty' },
  own_goal: { group: 'other', baseType: 'own_goal' },
  own_goal_yes: { group: 'other', baseType: 'own_goal' },
  own_goal_no: { group: 'other', baseType: 'own_goal' },
  throw_ins: { group: 'other', baseType: 'throw_ins' },
  goal_kicks: { group: 'other', baseType: 'goal_kicks' },
  total_offsides: { group: 'other', baseType: 'offsides' },
  match_fouls: { group: 'other', baseType: 'fouls' },
  total_fouls: { group: 'other', baseType: 'fouls' },
  penalty_awarded: { group: 'other', baseType: 'penalty' },
  penalty_scored: { group: 'other', baseType: 'penalty' },
  own_goal_scored: { group: 'other', baseType: 'own_goal' },
  throw_in_totals: { group: 'other', baseType: 'throw_ins' },
  goal_kick_totals: { group: 'other', baseType: 'goal_kicks' },

  // ============================================================================
  // Tennis-specific 2-way markets
  // ============================================================================
  // Tennis uses games/sets instead of goals, but we map to 'goals' group for consistency

  // Tennis match winner (h2h) - 2-way market (no draws in tennis)
  tennis_h2h: { group: 'goals', baseType: 'moneyline' },
  tennis_moneyline: { group: 'goals', baseType: 'moneyline' },
  match_winner: { group: 'goals', baseType: 'moneyline' },

  // Tennis game totals (over/under total games in match)
  game_totals: { group: 'goals', baseType: 'game_totals' },
  games_over: { group: 'goals', baseType: 'game_totals' },
  games_under: { group: 'goals', baseType: 'game_totals' },
  total_games: { group: 'goals', baseType: 'game_totals' },
  games_over_under: { group: 'goals', baseType: 'game_totals' },
  match_games: { group: 'goals', baseType: 'game_totals' },

  // Tennis set totals (over/under total sets)
  set_totals: { group: 'goals', baseType: 'set_totals' },
  sets_over: { group: 'goals', baseType: 'set_totals' },
  sets_under: { group: 'goals', baseType: 'set_totals' },
  total_sets: { group: 'goals', baseType: 'set_totals' },
  match_sets: { group: 'goals', baseType: 'set_totals' },

  // Tennis game spreads/handicaps
  game_spread: { group: 'handicap', baseType: 'game_spread' },
  game_spreads: { group: 'handicap', baseType: 'game_spread' },
  games_handicap: { group: 'handicap', baseType: 'game_spread' },
  tennis_handicap: { group: 'handicap', baseType: 'game_spread' },
  tennis_spread: { group: 'handicap', baseType: 'game_spread' },

  // Tennis set spreads/handicaps
  set_spread: { group: 'handicap', baseType: 'set_spread' },
  set_spreads: { group: 'handicap', baseType: 'set_spread' },
  sets_handicap: { group: 'handicap', baseType: 'set_spread' },
  set_handicap: { group: 'handicap', baseType: 'set_spread' },

  // Tennis player games (individual player totals)
  player_games: { group: 'goals', baseType: 'player_games' },
  player1_games: { group: 'goals', baseType: 'player_games' },
  player2_games: { group: 'goals', baseType: 'player_games' },
  player_games_over: { group: 'goals', baseType: 'player_games' },
  player_games_under: { group: 'goals', baseType: 'player_games' },

  // Tennis first set winner
  first_set_winner: { group: 'goals', baseType: 'first_set_winner' },
  set_1_winner: { group: 'goals', baseType: 'first_set_winner' },
  set1_winner: { group: 'goals', baseType: 'first_set_winner' },
  second_set_winner: { group: 'goals', baseType: 'set_winner' },
  set_2_winner: { group: 'goals', baseType: 'set_winner' },
  third_set_winner: { group: 'goals', baseType: 'set_winner' },

  // Tennis tie-break markets (2-way yes/no)
  tie_break: { group: 'other', baseType: 'tie_break' },
  tiebreak: { group: 'other', baseType: 'tie_break' },
  tie_break_yes: { group: 'other', baseType: 'tie_break' },
  tie_break_no: { group: 'other', baseType: 'tie_break' },
  tiebreak_in_match: { group: 'other', baseType: 'tie_break' },
  any_tiebreak: { group: 'other', baseType: 'tie_break' },
  tie_break_1st_set: { group: 'other', baseType: 'tie_break_set' },
  tiebreak_set_1: { group: 'other', baseType: 'tie_break_set' },

  // Tennis aces (over/under)
  aces: { group: 'other', baseType: 'aces' },
  total_aces: { group: 'other', baseType: 'aces' },
  aces_over: { group: 'other', baseType: 'aces' },
  aces_under: { group: 'other', baseType: 'aces' },
  match_aces: { group: 'other', baseType: 'aces' },
  player_aces: { group: 'other', baseType: 'player_aces' },
  player1_aces: { group: 'other', baseType: 'player_aces' },
  player2_aces: { group: 'other', baseType: 'player_aces' },

  // Tennis double faults (over/under)
  double_faults: { group: 'other', baseType: 'double_faults' },
  total_double_faults: { group: 'other', baseType: 'double_faults' },
  double_faults_over: { group: 'other', baseType: 'double_faults' },
  double_faults_under: { group: 'other', baseType: 'double_faults' },
  player_double_faults: { group: 'other', baseType: 'player_double_faults' },

  // Tennis break of serve (yes/no)
  break_of_serve: { group: 'other', baseType: 'break_of_serve' },
  break_in_match: { group: 'other', baseType: 'break_of_serve' },
  service_break: { group: 'other', baseType: 'break_of_serve' },
  player_to_be_broken: { group: 'other', baseType: 'break_of_serve' },

  // Tennis set betting (exact set score)
  set_betting: { group: 'other', baseType: 'set_betting' },
  correct_set_score: { group: 'other', baseType: 'set_betting' },
  exact_sets: { group: 'other', baseType: 'set_betting' },
  set_score: { group: 'other', baseType: 'set_betting' },

  // Tennis first set games (over/under games in set 1)
  first_set_games: { group: 'goals', baseType: 'first_set_games' },
  set_1_games: { group: 'goals', baseType: 'first_set_games' },
  set1_games_over: { group: 'goals', baseType: 'first_set_games' },
  set1_games_under: { group: 'goals', baseType: 'first_set_games' },

  // ============================================================================
  // Basketball-specific 2-way markets
  // ============================================================================
  // Basketball h2h (match winner) - 2-way market (no draw possible)
  basketball_h2h: { group: 'goals', baseType: 'moneyline' },
  basketball_moneyline: { group: 'goals', baseType: 'moneyline' },

  // Basketball points totals (over/under)
  points_totals: { group: 'goals', baseType: 'points_totals' },
  points_over: { group: 'goals', baseType: 'points_totals' },
  points_under: { group: 'goals', baseType: 'points_totals' },
  total_points: { group: 'goals', baseType: 'points_totals' },
  points_over_under: { group: 'goals', baseType: 'points_totals' },
  match_points: { group: 'goals', baseType: 'points_totals' },
  game_total: { group: 'goals', baseType: 'points_totals' },

  // Basketball spreads (point handicaps)
  point_spread: { group: 'handicap', baseType: 'point_spread' },
  point_spreads: { group: 'handicap', baseType: 'point_spread' },
  points_spread: { group: 'handicap', baseType: 'point_spread' },
  points_handicap: { group: 'handicap', baseType: 'point_spread' },
  basketball_spread: { group: 'handicap', baseType: 'point_spread' },
  basketball_handicap: { group: 'handicap', baseType: 'point_spread' },

  // Basketball team totals (over/under per team)
  team_points: { group: 'goals', baseType: 'team_points' },
  home_points: { group: 'goals', baseType: 'team_points' },
  away_points: { group: 'goals', baseType: 'team_points' },
  team_points_over: { group: 'goals', baseType: 'team_points' },
  team_points_under: { group: 'goals', baseType: 'team_points' },
  home_team_total: { group: 'goals', baseType: 'team_points' },
  away_team_total: { group: 'goals', baseType: 'team_points' },

  // Basketball quarter markets
  quarter_totals: { group: 'goals', baseType: 'quarter_totals' },
  q1_totals: { group: 'goals', baseType: 'quarter_totals' },
  q2_totals: { group: 'goals', baseType: 'quarter_totals' },
  q3_totals: { group: 'goals', baseType: 'quarter_totals' },
  q4_totals: { group: 'goals', baseType: 'quarter_totals' },
  quarter_1_total: { group: 'goals', baseType: 'quarter_totals' },
  quarter_2_total: { group: 'goals', baseType: 'quarter_totals' },
  quarter_3_total: { group: 'goals', baseType: 'quarter_totals' },
  quarter_4_total: { group: 'goals', baseType: 'quarter_totals' },
  q1_over_under: { group: 'goals', baseType: 'quarter_totals' },

  // Basketball half markets
  half_totals: { group: 'goals', baseType: 'half_totals' },
  first_half_points: { group: 'goals', baseType: 'half_totals' },
  second_half_points: { group: 'goals', baseType: 'half_totals' },
  first_half_total: { group: 'goals', baseType: 'half_totals' },
  second_half_total: { group: 'goals', baseType: 'half_totals' },
  h1_totals: { group: 'goals', baseType: 'half_totals' },
  h2_totals: { group: 'goals', baseType: 'half_totals' },

  // Basketball quarter/half spreads
  quarter_spread: { group: 'handicap', baseType: 'quarter_spread' },
  half_spread: { group: 'handicap', baseType: 'half_spread' },
  q1_spread: { group: 'handicap', baseType: 'quarter_spread' },
  q2_spread: { group: 'handicap', baseType: 'quarter_spread' },
  q3_spread: { group: 'handicap', baseType: 'quarter_spread' },
  q4_spread: { group: 'handicap', baseType: 'quarter_spread' },
  first_half_spread: { group: 'handicap', baseType: 'half_spread' },
  second_half_spread: { group: 'handicap', baseType: 'half_spread' },
  h1_spread: { group: 'handicap', baseType: 'half_spread' },
  h2_spread: { group: 'handicap', baseType: 'half_spread' },

  // Basketball quarter/half winner
  quarter_winner: { group: 'goals', baseType: 'quarter_winner' },
  q1_winner: { group: 'goals', baseType: 'quarter_winner' },
  q2_winner: { group: 'goals', baseType: 'quarter_winner' },
  q3_winner: { group: 'goals', baseType: 'quarter_winner' },
  q4_winner: { group: 'goals', baseType: 'quarter_winner' },
  first_half_winner: { group: 'goals', baseType: 'half_winner' },
  second_half_winner: { group: 'goals', baseType: 'half_winner' },
  half_winner: { group: 'goals', baseType: 'half_winner' },

  // Basketball player points (over/under)
  player_points: { group: 'other', baseType: 'player_points' },
  player_points_over: { group: 'other', baseType: 'player_points' },
  player_points_under: { group: 'other', baseType: 'player_points' },

  // Basketball player rebounds (over/under)
  player_rebounds: { group: 'other', baseType: 'player_rebounds' },
  rebounds: { group: 'other', baseType: 'player_rebounds' },
  rebounds_over: { group: 'other', baseType: 'player_rebounds' },
  rebounds_under: { group: 'other', baseType: 'player_rebounds' },
  total_rebounds: { group: 'other', baseType: 'player_rebounds' },

  // Basketball player assists (over/under)
  player_assists: { group: 'other', baseType: 'player_assists' },
  assists: { group: 'other', baseType: 'player_assists' },
  assists_over: { group: 'other', baseType: 'player_assists' },
  assists_under: { group: 'other', baseType: 'player_assists' },
  total_assists: { group: 'other', baseType: 'player_assists' },

  // Basketball 3-pointers made (over/under)
  three_pointers: { group: 'other', baseType: 'three_pointers' },
  threes: { group: 'other', baseType: 'three_pointers' },
  three_pointers_made: { group: 'other', baseType: 'three_pointers' },
  threes_made: { group: 'other', baseType: 'three_pointers' },
  player_threes: { group: 'other', baseType: 'player_threes' },
  player_3pm: { group: 'other', baseType: 'player_threes' },

  // Basketball steals (over/under)
  player_steals: { group: 'other', baseType: 'player_steals' },
  steals: { group: 'other', baseType: 'player_steals' },
  steals_over: { group: 'other', baseType: 'player_steals' },
  steals_under: { group: 'other', baseType: 'player_steals' },

  // Basketball blocks (over/under)
  player_blocks: { group: 'other', baseType: 'player_blocks' },
  blocks: { group: 'other', baseType: 'player_blocks' },
  blocks_over: { group: 'other', baseType: 'player_blocks' },
  blocks_under: { group: 'other', baseType: 'player_blocks' },

  // Basketball combo markets (PRA = Points + Rebounds + Assists)
  points_rebounds_assists: { group: 'other', baseType: 'pra' },
  pra: { group: 'other', baseType: 'pra' },
  pra_over: { group: 'other', baseType: 'pra' },
  pra_under: { group: 'other', baseType: 'pra' },
  player_pra: { group: 'other', baseType: 'pra' },

  // Basketball Points + Rebounds
  points_rebounds: { group: 'other', baseType: 'points_rebounds' },
  pr: { group: 'other', baseType: 'points_rebounds' },
  player_pr: { group: 'other', baseType: 'points_rebounds' },

  // Basketball Points + Assists
  points_assists: { group: 'other', baseType: 'points_assists' },
  pa: { group: 'other', baseType: 'points_assists' },
  player_pa: { group: 'other', baseType: 'points_assists' },

  // Basketball Rebounds + Assists
  rebounds_assists: { group: 'other', baseType: 'rebounds_assists' },
  ra: { group: 'other', baseType: 'rebounds_assists' },
  player_ra: { group: 'other', baseType: 'rebounds_assists' },

  // Basketball overtime (yes/no)
  overtime: { group: 'other', baseType: 'overtime' },
  overtime_yes: { group: 'other', baseType: 'overtime' },
  overtime_no: { group: 'other', baseType: 'overtime' },
  will_there_be_overtime: { group: 'other', baseType: 'overtime' },

  // Basketball winning margin
  winning_margin: { group: 'other', baseType: 'winning_margin' },
  margin: { group: 'other', baseType: 'winning_margin' },
  win_margin: { group: 'other', baseType: 'winning_margin' },

  // Basketball race to X points
  race_to_points: { group: 'other', baseType: 'race_to_points' },
  race_to_20: { group: 'other', baseType: 'race_to_points' },
  race_to_10: { group: 'other', baseType: 'race_to_points' },
  first_to_score: { group: 'other', baseType: 'race_to_points' },

  // Basketball double-double/triple-double (yes/no)
  double_double: { group: 'other', baseType: 'double_double' },
  player_double_double: { group: 'other', baseType: 'double_double' },
  triple_double: { group: 'other', baseType: 'triple_double' },
  player_triple_double: { group: 'other', baseType: 'triple_double' },

  // Basketball alternate lines
  alternate_spread: { group: 'handicap', baseType: 'alternate_spread' },
  alternate_total: { group: 'goals', baseType: 'alternate_total' },
  alt_spread: { group: 'handicap', baseType: 'alternate_spread' },
  alt_total: { group: 'goals', baseType: 'alternate_total' }
}

/**
 * Alias map for fuzzy matching common abbreviations and variants (Task 2.5).
 * Maps shorthand/alternate names to canonical pattern keys.
 */
const MARKET_ALIAS_MAP: Record<string, string> = {
  btts: 'both_teams_to_score',
  sot: 'shots_on_target',
  dnb: 'draw_no_bet',
  ah: 'asian_handicap',
  'o/u': 'over_under',
  ou: 'over_under',
  gg: 'btts', // Goal-Goal (European term for BTTS)
  ng: 'btts_no', // No Goal (BTTS No)
  cs: 'clean_sheet',
  '1x2': 'h2h',
  ml: 'moneyline'
}

/**
 * Normalizes provider market strings into a canonical lookup key.
 * Preserves minus signs in numeric values (e.g., -1.5).
 */
function normalizeMarketString(marketString: string): string {
  return marketString
    .toLowerCase()
    .trim()
    .replace(/([a-z])-([a-z])/g, '$1_$2') // word-word hyphens to underscores
    .replace(/ /g, '_')
}

/**
 * Extracts period from a market key suffix (Task 2.1).
 * Detects _1h, _2h, _ft, first_half_, second_half_ patterns.
 */
function extractPeriodFromKey(key: string): MarketPeriod | undefined {
  // Check suffix patterns
  if (key.endsWith('_ft') || key.endsWith('_full_time')) {
    return 'ft'
  }
  if (key.endsWith('_1h') || key.endsWith('_first_half')) {
    return '1h'
  }
  if (key.endsWith('_2h') || key.endsWith('_second_half')) {
    return '2h'
  }
  // Check prefix patterns
  if (key.startsWith('first_half_') || key.startsWith('1h_')) {
    return '1h'
  }
  if (key.startsWith('second_half_') || key.startsWith('2h_')) {
    return '2h'
  }
  return undefined
}

/**
 * Extracts line value from a market key (Task 2.2).
 * Handles patterns like over_2.5, under_9.5, handicap_-1.5.
 */
function extractLineFromKey(key: string): number | undefined {
  // Match patterns like _2.5, _-1.5, _+0.5, _10.5
  // Search for the LAST numeric value in the key which is typically the line
  const parts = key.split('_')
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]
    // Check if this part is a number (with optional sign and decimal)
    // Note: [-+] not [+-] because minus must be first or last in character class
    const numMatch = part.match(/^([-+]?\d+(?:\.\d+)?)$/)
    if (numMatch) {
      const parsed = parseFloat(numMatch[1])
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }
  return undefined
}

/**
 * Extracts side (home/away/match) from a market key (Task 2.3).
 * Detects home_, away_, team1_, team2_ prefixes.
 */
function extractSideFromKey(key: string): 'home' | 'away' | 'match' | undefined {
  if (key.startsWith('home_') || key.startsWith('team1_') || key.includes('_home_')) {
    return 'home'
  }
  if (key.startsWith('away_') || key.startsWith('team2_') || key.includes('_away_')) {
    return 'away'
  }
  if (key.startsWith('match_') || key.includes('_match_')) {
    return 'match'
  }
  return undefined
}

/**
 * Resolves aliases to canonical patterns (Task 2.5).
 */
function resolveAlias(key: string): string {
  // Check exact alias match
  if (MARKET_ALIAS_MAP[key]) {
    return MARKET_ALIAS_MAP[key]
  }
  // Check if key starts with an alias
  for (const [alias, canonical] of Object.entries(MARKET_ALIAS_MAP)) {
    if (key.startsWith(alias + '_')) {
      return key.replace(alias, canonical)
    }
  }
  return key
}

/**
 * Attempts to resolve a normalized market key to a known pattern.
 * Returns the matched pattern metadata or null when no match exists.
 */
function findMarketPattern(resolvedKey: string): { group: MarketGroup; baseType: string } | null {
  const exactMatch = MARKET_PATTERNS[resolvedKey]
  if (exactMatch) {
    return exactMatch
  }

  // Progressive prefix matching for compound keys like corners_totals_over_9.5_ft
  const parts = resolvedKey.split('_')
  for (let len = parts.length - 1; len >= 1; len--) {
    const prefix = parts.slice(0, len).join('_')
    const match = MARKET_PATTERNS[prefix]
    if (match) {
      return match
    }
  }

  // Broad prefix scan fallback
  for (const [pattern, meta] of Object.entries(MARKET_PATTERNS)) {
    if (resolvedKey.startsWith(pattern)) {
      return meta
    }
  }

  return null
}

/**
 * Determines whether a provider market key matches any known market pattern.
 * Used to distinguish known "other" markets from truly unknown markets.
 */
export function isKnownMarketPattern(marketString: string): boolean {
  if (!marketString || typeof marketString !== 'string') {
    return false
  }

  const normalized = normalizeMarketString(marketString)
  const resolved = resolveAlias(normalized)
  return findMarketPattern(resolved) !== null
}

/**
 * Infers MarketMetadata from a raw market string.
 * Falls back to 'other' group if pattern is not recognized.
 * Story 7.4: Enhanced with period/line/side detection, improved prefix matching, and fuzzy alias resolution.
 */
export function inferMarketMetadata(marketString: string): MarketMetadata {
  // Guard against undefined/null input
  if (!marketString || typeof marketString !== 'string') {
    return {
      group: 'other',
      key: 'unknown',
      label: 'Unknown'
    }
  }

  const normalized = normalizeMarketString(marketString)
  // Resolve aliases first (Task 2.5)
  const resolved = resolveAlias(normalized)

  const matchedPattern = findMarketPattern(resolved)
  if (matchedPattern) {
    const period = extractPeriodFromKey(resolved)
    const line = extractLineFromKey(resolved)
    const side = extractSideFromKey(resolved)
    return {
      group: matchedPattern.group,
      key: resolved,
      label: formatMarketLabelFromKey(resolved),
      ...(period && { period }),
      ...(line !== undefined && { line }),
      ...(side && { side })
    }
  }

  // Fallback to 'other' group with all available metadata
  const period = extractPeriodFromKey(resolved)
  const line = extractLineFromKey(resolved)
  const side = extractSideFromKey(resolved)
  return {
    group: 'other',
    key: resolved,
    label: formatMarketLabelFromKey(resolved),
    ...(period && { period }),
    ...(line !== undefined && { line }),
    ...(side && { side })
  }
}

/**
 * Converts a canonical market key to human-readable label.
 * Story 7.4 Task 4: Enhanced with comprehensive label mappings and dynamic formatting.
 */
export function formatMarketLabelFromKey(key: string): string {
  const labelMap: Record<string, string> = {
    // Goals group
    h2h: 'Moneyline',
    moneyline: 'Moneyline',
    'match-winner': 'Match Winner',
    totals: 'Goals O/U',
    goals_totals: 'Goals O/U',
    goals_totals_1h: 'Goals O/U (1H)',
    goals_totals_2h: 'Goals O/U (2H)',
    btts: 'BTTS (Both Teams to Score)',
    both_teams_to_score: 'BTTS (Both Teams to Score)',
    btts_yes: 'BTTS Yes',
    btts_no: 'BTTS No',
    btts_yes_ft: 'BTTS Yes (FT)',
    btts_no_ft: 'BTTS No (FT)',
    btts_yes_1h: 'BTTS Yes (1H)',
    btts_no_1h: 'BTTS No (1H)',
    'draw-no-bet': 'Draw No Bet',
    draw_no_bet: 'Draw No Bet',
    dnb: 'Draw No Bet',
    clean_sheet: 'Clean Sheet',
    home_clean_sheet: 'Home Clean Sheet',
    away_clean_sheet: 'Away Clean Sheet',
    goal_occurrence: 'Goal in Match',
    goal_occurrence_1h: 'Goal in 1H',
    goal_occurrence_2h: 'Goal in 2H',
    goal_in_1h: 'Goal in 1H',
    goal_in_2h: 'Goal in 2H',
    team_to_score: 'Team to Score',
    home_to_score: 'Home to Score',
    away_to_score: 'Away to Score',
    totals_1h: 'Goals O/U (1H)',
    totals_2h: 'Goals O/U (2H)',

    // Handicap group
    handicap: 'Handicap',
    spreads: 'Handicap/Spread',
    spread: 'Handicap/Spread',
    asian_handicap: 'Asian Handicap',
    ah: 'Asian Handicap',
    european_handicap: 'European Handicap',

    // Corners group
    corners: 'Corners',
    corners_over: 'Corners Over',
    corners_under: 'Corners Under',
    corners_totals: 'Corners O/U',
    corner_totals: 'Corners O/U',
    corners_handicap: 'Corner Handicap',
    corner_handicap: 'Corner Handicap',
    corners_race: 'Corner Race',
    corner_race: 'Corner Race',
    corners_1h: 'Corners (1H)',
    corners_2h: 'Corners (2H)',
    first_half_corners: 'Corners (1H)',
    second_half_corners: 'Corners (2H)',
    corners_winner: 'Corner Match Bet',
    corner_match_bet: 'Corner Match Bet',
    team_corners: 'Team Corners',
    home_corners: 'Home Team Corners',
    away_corners: 'Away Team Corners',

    // Cards group
    cards: 'Cards',
    cards_over: 'Cards Over',
    cards_under: 'Cards Under',
    cards_totals: 'Cards O/U',
    card_totals: 'Cards O/U',
    red_card: 'Red Card',
    red_card_yes: 'Red Card Yes',
    red_card_no: 'Red Card No',
    bookings: 'Bookings',
    booking_totals: 'Bookings O/U',
    booking_points: 'Booking Points',
    cards_1h: 'Cards (1H)',
    cards_2h: 'Cards (2H)',
    first_half_cards: 'Cards (1H)',
    team_cards: 'Team Cards',
    home_cards: 'Home Team Cards',
    away_cards: 'Away Team Cards',

    // Shots group
    shots: 'Shots',
    shots_over: 'Shots Over',
    shots_under: 'Shots Under',
    shots_totals: 'Shots O/U',
    shot_totals: 'Shots O/U',
    shots_on_target: 'Shots on Target',
    sot: 'Shots on Target',
    shots_on_target_over: 'Shots on Target Over',
    shots_on_target_under: 'Shots on Target Under',
    sot_over: 'Shots on Target Over',
    sot_under: 'Shots on Target Under',
    team_shots: 'Team Shots',
    home_shots: 'Home Team Shots',
    away_shots: 'Away Team Shots',

    // Other group
    offsides: 'Offsides',
    offside_totals: 'Offsides O/U',
    fouls: 'Fouls',
    foul_totals: 'Fouls O/U',
    penalty: 'Penalty',
    penalty_yes: 'Penalty Yes',
    penalty_no: 'Penalty No',
    penalty_awarded: 'Penalty Awarded',
    penalty_scored: 'Penalty Scored',
    own_goal: 'Own Goal',
    own_goal_yes: 'Own Goal Yes',
    own_goal_no: 'Own Goal No',
    throw_ins: 'Throw-ins',
    goal_kicks: 'Goal Kicks',

    // Tennis markets
    tennis_h2h: 'Match Winner',
    tennis_moneyline: 'Match Winner',
    match_winner: 'Match Winner',
    game_totals: 'Games O/U',
    games_over: 'Games Over',
    games_under: 'Games Under',
    total_games: 'Games O/U',
    games_over_under: 'Games O/U',
    match_games: 'Games O/U',
    set_totals: 'Sets O/U',
    sets_over: 'Sets Over',
    sets_under: 'Sets Under',
    total_sets: 'Sets O/U',
    match_sets: 'Sets O/U',
    game_spread: 'Game Spread',
    game_spreads: 'Game Spread',
    games_handicap: 'Game Handicap',
    tennis_handicap: 'Tennis Handicap',
    tennis_spread: 'Tennis Spread',
    set_spread: 'Set Spread',
    set_spreads: 'Set Spread',
    sets_handicap: 'Set Handicap',
    set_handicap: 'Set Handicap',
    player_games: 'Player Games O/U',
    player1_games: 'Player 1 Games O/U',
    player2_games: 'Player 2 Games O/U',
    player_games_over: 'Player Games Over',
    player_games_under: 'Player Games Under',
    first_set_winner: '1st Set Winner',
    set_1_winner: '1st Set Winner',
    set1_winner: '1st Set Winner',
    second_set_winner: '2nd Set Winner',
    set_2_winner: '2nd Set Winner',
    third_set_winner: '3rd Set Winner',
    set_winner: 'Set Winner',
    tie_break: 'Tie-Break in Match',
    tiebreak: 'Tie-Break in Match',
    tie_break_yes: 'Tie-Break Yes',
    tie_break_no: 'Tie-Break No',
    tiebreak_in_match: 'Tie-Break in Match',
    any_tiebreak: 'Any Tie-Break',
    tie_break_1st_set: 'Tie-Break in 1st Set',
    tiebreak_set_1: 'Tie-Break in Set 1',
    tie_break_set: 'Tie-Break in Set',
    aces: 'Aces O/U',
    total_aces: 'Total Aces O/U',
    aces_over: 'Aces Over',
    aces_under: 'Aces Under',
    match_aces: 'Match Aces O/U',
    player_aces: 'Player Aces O/U',
    player1_aces: 'Player 1 Aces O/U',
    player2_aces: 'Player 2 Aces O/U',
    double_faults: 'Double Faults O/U',
    total_double_faults: 'Total Double Faults O/U',
    double_faults_over: 'Double Faults Over',
    double_faults_under: 'Double Faults Under',
    player_double_faults: 'Player Double Faults O/U',
    break_of_serve: 'Break of Serve',
    break_in_match: 'Break in Match',
    service_break: 'Service Break',
    player_to_be_broken: 'Player to be Broken',
    set_betting: 'Set Betting',
    correct_set_score: 'Correct Set Score',
    exact_sets: 'Exact Sets',
    set_score: 'Set Score',
    first_set_games: '1st Set Games O/U',
    set_1_games: 'Set 1 Games O/U',
    set1_games_over: 'Set 1 Games Over',
    set1_games_under: 'Set 1 Games Under',

    // Basketball markets
    basketball_h2h: 'Match Winner',
    basketball_moneyline: 'Match Winner',
    points_totals: 'Points O/U',
    points_over: 'Points Over',
    points_under: 'Points Under',
    total_points: 'Points O/U',
    points_over_under: 'Points O/U',
    match_points: 'Match Points O/U',
    game_total: 'Game Total O/U',
    point_spread: 'Point Spread',
    point_spreads: 'Point Spread',
    points_spread: 'Point Spread',
    points_handicap: 'Point Handicap',
    basketball_spread: 'Basketball Spread',
    basketball_handicap: 'Basketball Handicap',
    team_points: 'Team Points O/U',
    home_points: 'Home Points O/U',
    away_points: 'Away Points O/U',
    team_points_over: 'Team Points Over',
    team_points_under: 'Team Points Under',
    home_team_total: 'Home Team Total',
    away_team_total: 'Away Team Total',
    quarter_totals: 'Quarter Points O/U',
    half_totals: 'Half Points O/U',
    q1_totals: 'Q1 Points O/U',
    q2_totals: 'Q2 Points O/U',
    q3_totals: 'Q3 Points O/U',
    q4_totals: 'Q4 Points O/U',
    quarter_1_total: 'Q1 Points O/U',
    quarter_2_total: 'Q2 Points O/U',
    quarter_3_total: 'Q3 Points O/U',
    quarter_4_total: 'Q4 Points O/U',
    q1_over_under: 'Q1 Points O/U',
    first_half_points: '1H Points O/U',
    second_half_points: '2H Points O/U',
    first_half_total: '1H Total',
    second_half_total: '2H Total',
    h1_totals: '1H Points O/U',
    h2_totals: '2H Points O/U',
    quarter_spread: 'Quarter Spread',
    half_spread: 'Half Spread',
    q1_spread: 'Q1 Spread',
    q2_spread: 'Q2 Spread',
    q3_spread: 'Q3 Spread',
    q4_spread: 'Q4 Spread',
    first_half_spread: '1H Spread',
    second_half_spread: '2H Spread',
    h1_spread: '1H Spread',
    h2_spread: '2H Spread',
    quarter_winner: 'Quarter Winner',
    q1_winner: 'Q1 Winner',
    q2_winner: 'Q2 Winner',
    q3_winner: 'Q3 Winner',
    q4_winner: 'Q4 Winner',
    first_half_winner: '1H Winner',
    second_half_winner: '2H Winner',
    half_winner: 'Half Winner',
    player_points: 'Player Points O/U',
    player_points_over: 'Player Points Over',
    player_points_under: 'Player Points Under',
    player_rebounds: 'Player Rebounds O/U',
    rebounds: 'Rebounds O/U',
    rebounds_over: 'Rebounds Over',
    rebounds_under: 'Rebounds Under',
    total_rebounds: 'Total Rebounds O/U',
    player_assists: 'Player Assists O/U',
    assists: 'Assists O/U',
    assists_over: 'Assists Over',
    assists_under: 'Assists Under',
    total_assists: 'Total Assists O/U',
    three_pointers: '3-Pointers O/U',
    threes: '3-Pointers O/U',
    three_pointers_made: '3-Pointers Made O/U',
    threes_made: '3-Pointers Made O/U',
    player_threes: 'Player 3-Pointers O/U',
    player_3pm: 'Player 3PM O/U',
    player_steals: 'Player Steals O/U',
    steals: 'Steals O/U',
    steals_over: 'Steals Over',
    steals_under: 'Steals Under',
    player_blocks: 'Player Blocks O/U',
    blocks: 'Blocks O/U',
    blocks_over: 'Blocks Over',
    blocks_under: 'Blocks Under',
    points_rebounds_assists: 'Points+Rebounds+Assists O/U',
    pra: 'PRA O/U',
    pra_over: 'PRA Over',
    pra_under: 'PRA Under',
    player_pra: 'Player PRA O/U',
    points_rebounds: 'Points+Rebounds O/U',
    pr: 'P+R O/U',
    player_pr: 'Player P+R O/U',
    points_assists: 'Points+Assists O/U',
    pa: 'P+A O/U',
    player_pa: 'Player P+A O/U',
    rebounds_assists: 'Rebounds+Assists O/U',
    ra: 'R+A O/U',
    player_ra: 'Player R+A O/U',
    overtime: 'Overtime',
    overtime_yes: 'Overtime Yes',
    overtime_no: 'Overtime No',
    will_there_be_overtime: 'Will There Be Overtime',
    winning_margin: 'Winning Margin',
    margin: 'Margin',
    win_margin: 'Win Margin',
    race_to_points: 'Race to Points',
    race_to_20: 'Race to 20',
    race_to_10: 'Race to 10',
    first_to_score: 'First to Score',
    double_double: 'Double-Double',
    player_double_double: 'Player Double-Double',
    triple_double: 'Triple-Double',
    player_triple_double: 'Player Triple-Double',
    alternate_spread: 'Alternate Spread',
    alt_spread: 'Alt Spread',
    alternate_total: 'Alternate Total',
    alt_total: 'Alt Total'
  }

  // Check exact match first
  const normalized = key.toLowerCase()
  if (labelMap[normalized]) {
    return labelMap[normalized]
  }

  // Parse and format dynamically (Task 4.2)
  const parsed = parseMarketKey(normalized)

  // Extract line value from key if present
  const lineMatch = key.match(/([+-]?\d+(?:\.\d+)?)/)
  const lineValue = lineMatch ? parseFloat(lineMatch[0]) : undefined
  const formattedLine =
    lineValue !== undefined && Number.isFinite(lineValue)
      ? lineValue % 1 === 0
        ? lineValue.toString()
        : lineValue.toFixed(1).replace(/\.0$/, '')
      : null

  // Try to match base key (without line) against labelMap for better labels
  if (formattedLine && lineMatch) {
    // Remove line value from key to find base key
    const baseKey = normalized.replace(
      new RegExp(`_?${lineMatch[0].replace(/[.+]/g, '\\$&')}$`),
      ''
    )
    if (labelMap[baseKey]) {
      // Insert line value into the base label
      let baseLabel = labelMap[baseKey]
      // Add line after "O/U" or at the end
      if (baseLabel.includes('O/U')) {
        baseLabel = baseLabel.replace('O/U', `O/U ${formattedLine}`)
      } else if (baseLabel.includes('Over')) {
        baseLabel = baseLabel.replace(/Over$/, `Over ${formattedLine}`)
      } else if (baseLabel.includes('Under')) {
        baseLabel = baseLabel.replace(/Under$/, `Under ${formattedLine}`)
      } else if (baseLabel.includes('Handicap')) {
        // formattedLine already contains sign for negative values
        const sign = lineValue !== undefined && lineValue >= 0 ? '+' : ''
        baseLabel = `${baseLabel} ${sign}${formattedLine}`
      } else {
        baseLabel = `${baseLabel} ${formattedLine}`
      }
      return baseLabel
    }
  }

  // Build base label from key parts (fallback)
  let label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  // Task 4.2: Handle compound keys like "corners_over_9.5_ft"
  // Replace "Totals" with "O/U" for readability
  label = label.replace(/\bTotals\b/gi, 'O/U')
  label = label.replace(/\bOver Under\b/gi, 'O/U')

  // Clean up numeric formatting in label
  if (formattedLine && lineMatch) {
    label = label.replace(new RegExp(lineMatch[0].replace(/[.+]/g, '\\$&'), 'g'), formattedLine)
  }

  // Add period suffix if present (Task 4.2)
  if (parsed.period) {
    const periodLabels: Record<MarketPeriod, string> = {
      ft: '(FT)',
      '1h': '(1H)',
      '2h': '(2H)'
    }
    const periodSuffix = periodLabels[parsed.period]
    // Remove raw period from label and add formatted suffix
    if (!label.includes(periodSuffix)) {
      label = label.replace(/ Ft$/i, '')
      label = label.replace(/ 1h$/i, '')
      label = label.replace(/ 2h$/i, '')
      label = label.trim() + ' ' + periodSuffix
    }
  }

  return label.trim()
}

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

/**
 * Represents a single leg of an arbitrage opportunity.
 * Story 7.5: Added impliedProbability field for user insight.
 */
export interface ArbitrageLeg {
  bookmaker: string
  market: string
  odds: number
  outcome: string
  /** Implied probability as percentage: (1/odds) * 100. Story 7.5 */
  impliedProbability?: number
}

/**
 * Card counting rule for a bookmaker in an arbitrage opportunity.
 * Story 6.5: Card Rules Mismatch Warning Indicator
 */
export interface CardRulesWarning {
  bookmakerA: { name: string; rule: CardCountingRule }
  bookmakerB: { name: string; rule: CardCountingRule }
  mismatch: boolean
}

export interface ArbitrageOpportunity {
  id: string
  sport: string
  event: {
    name: string
    date: string
    league: string
  }
  legs: [ArbitrageLeg, ArbitrageLeg]
  roi: number
  foundAt: string
  /** Origin of the opportunity (feed poller vs deep scan) */
  source?: 'feed' | 'deepScan'
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
  /**
   * Story 7.8: Bookmaker URLs extracted from API response.
   * Maps bookmaker name to the direct bet placement URL.
   */
  bookmakerUrls?: Record<string, string>
  /**
   * Story 7.8: Most recent market update timestamp from API.
   * Allows distinguishing "we found it late" vs "odds are actually stale".
   */
  marketUpdatedAt?: string
  /**
   * Story 7.8: Odds movement trend indicator.
   * - 'improving': ROI is increasing (better opportunity)
   * - 'worsening': ROI is decreasing (opportunity fading)
   * - 'stable': ROI unchanged or minimal change
   */
  oddsTrend?: OddsTrend
  /**
   * Story 7.8: Historical odds snapshots for trend calculation.
   * Contains up to 3 most recent ROI values with timestamps.
   */
  oddsHistory?: OddsSnapshot[]
  /**
   * Story 6.5: Card counting rules warning for cards market group.
   * Only present when marketGroup is 'cards' and bookmakers have different rules.
   */
  cardRulesWarning?: CardRulesWarning
}

// ============================================================================
// Odds Movement Tracking (Story 7.8)
// ============================================================================

/**
 * Trend direction for odds movement.
 * Story 7.8: Used to indicate whether an opportunity is improving or fading.
 */
export type OddsTrend = 'improving' | 'worsening' | 'stable'

/**
 * A snapshot of odds at a specific point in time.
 * Story 7.8: Used for tracking odds movement history.
 */
export interface OddsSnapshot {
  /** ROI value at this snapshot */
  roi: number
  /** Timestamp when this snapshot was taken */
  timestamp: string
  /** Individual leg odds at this snapshot */
  legOdds: [number, number]
}

// ============================================================================
// Best Odds Comparison (Story 7.5)
// ============================================================================

/**
 * Best odds for a single outcome across all bookmakers.
 * Story 7.5: Enables value bet comparison even without arbitrage.
 */
export interface BestOddsForOutcome {
  outcome: string
  bestBookmaker: string
  bestOdds: number
  allBookmakers: Array<{ bookmaker: string; odds: number }>
}

/**
 * Best odds comparison for a market.
 * Shows which bookmaker offers best odds for each outcome.
 * Story 7.5: Exposes best odds data alongside arbitrage opportunities.
 */
export interface BestOddsComparison {
  eventId: string
  marketKey: string
  marketLabel: string
  marketGroup: MarketGroup
  outcomes: BestOddsForOutcome[]
  hasArbitrage: boolean
  arbitrageRoi?: number
}

// ============================================================================
// Deep Scan (Story 7.1)
// ============================================================================

/**
 * Raw odds payload from Deep Scan API.
 * Matches the structure returned by the odds endpoint.
 * Story 8.1: Shared between main process and renderer.
 */
export interface RawOddsPayload {
  event: {
    id: string
    name: string
    date: string
    league: string
    sport: string
  }
  bookmakers: Array<{
    name: string
    /** Story 7.8: Direct URL to place bet on this bookmaker */
    url?: string
    markets: Array<{
      key: string
      /** Story 7.8: Last update timestamp for this market */
      updatedAt?: string
      outcomes: Array<{
        name: string
        odds: number
      }>
    }>
  }>
}

export type DeepScanStatus = 'idle' | 'scanning' | 'completed' | 'cancelled' | 'error'

export type DeepScanScope = 'all-sports' | 'selected-sports' | 'selected-leagues'

export interface ScanHistoryEntry {
  startedAt: string
  completedAt: string
  eventsScanned: number
  opportunitiesFound: number
  durationMs: number
  mode: 'manual' | 'continuous'
}

export interface DeepScanQuotaStatus {
  hourlyUsed: number
  hourlyLimit: number
  percentUsed: number
  isThrottled: boolean
  throttleResumeAt?: string
  /**
   * Story 7.8: Actual rate limit values from API response headers.
   * When present, these override the estimated values above.
   */
  apiRateLimit?: {
    limit: number
    remaining: number
    resetAt: string // ISO timestamp when quota resets
  }
  /**
   * Story 7.8: Whether quota is from API headers (true) or estimated (false).
   */
  isApiQuota?: boolean
}

export interface DeepScanProgress {
  status: DeepScanStatus
  mode: 'manual' | 'continuous'
  eventsScanned: number
  eventsTotal: number
  requestsMade: number
  opportunitiesFound: number
  /**
   * Total markets scanned across events in the current run.
   * Optional to preserve backward compatibility with older progress payloads.
   */
  marketsScanned?: number
  /**
   * Market groups that produced arbitrage opportunities during the current run.
   * Optional for backward compatibility.
   */
  marketGroupsWithArbs?: string[]
  startedAt: string | null
  elapsedMs: number
  lastContinuousScanAt?: string
  isContinuousScanActive?: boolean
  isPaused?: boolean
  currentEventName?: string
  errorMessage?: string
  quotaStatus?: DeepScanQuotaStatus
}

export interface DeepScanConfig {
  eventIds?: string[] // Specific events to scan
  leagueId?: string // Scan all events in league
  sportSlug?: string // Scan all events in sport (use with caution)
  minRoi?: number // Global minimum ROI threshold (default: 0)
  marketGroupThresholds?: Record<MarketGroup, number> // Per-group ROI thresholds
  bookmakers?: string[] // Override bookmaker selection
  maxConcurrentRequests?: number // Rate limit control (default: 2)
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

// ============================================================================
// Card Counting Rules (Story 1.5)
// ============================================================================

/**
 * Card counting rule type for bookmakers.
 * - 'conservative': 2 yellows + 1 red = 2 cards total (Sportsbet style)
 * - 'standard': 2 yellows + 1 red = 3 cards total (default)
 */
export type CardCountingRule = 'conservative' | 'standard'

/**
 * Record of bookmaker card counting rules.
 * Key is the bookmaker identifier from feed data.
 * Value is the counting rule for that bookmaker.
 */
export type BookmakerCardRules = Record<string, CardCountingRule>

/**
 * Display metadata for card counting rules.
 */
export const CARD_COUNTING_RULE_DISPLAY: Record<
  CardCountingRule,
  { label: string; description: string; example: string }
> = {
  conservative: {
    label: 'Conservative (2 cards max)',
    description: 'Counts both yellows and the resulting red as just the red',
    example: '2 yellows + red = 2 cards total'
  },
  standard: {
    label: 'Standard (3 cards)',
    description: 'Counts each card shown individually',
    example: '2 yellows + red = 3 cards total'
  }
}

/**
 * Default card counting rule for new/unconfigured bookmakers.
 */
export const DEFAULT_CARD_COUNTING_RULE: CardCountingRule = 'standard'

// ============================================================================
// Aggressive Pre-Match Scanning (Story 8.7)
// ============================================================================

/**
 * Event tiers based on time to kickoff.
 * Story 8.7: Aggressive Pre-Match Scanning with Quota Maximization
 */
export type EventTier = 'imminent' | 'soon' | 'today' | 'later' | 'tomorrow' | 'distant'

/**
 * Tier configuration with polling parameters.
 * Story 8.7: Defines how each tier is managed in aggressive mode.
 */
export interface TierConfig {
  name: EventTier
  maxMinutesToKickoff: number
  weight: number
  minPollIntervalSeconds: number
  maxPollIntervalSeconds: number
}

/**
 * Default tier configurations for aggressive scanning.
 * Story 8.7: Pre-configured tier boundaries and weights.
 */
export const DEFAULT_TIER_CONFIGS: TierConfig[] = [
  {
    name: 'imminent',
    maxMinutesToKickoff: 30,
    weight: 50,
    minPollIntervalSeconds: 15,
    maxPollIntervalSeconds: 60
  },
  {
    name: 'soon',
    maxMinutesToKickoff: 120,
    weight: 25,
    minPollIntervalSeconds: 60,
    maxPollIntervalSeconds: 180
  },
  {
    name: 'today',
    maxMinutesToKickoff: 360,
    weight: 12,
    minPollIntervalSeconds: 180,
    maxPollIntervalSeconds: 600
  },
  {
    name: 'later',
    maxMinutesToKickoff: 1440,
    weight: 8,
    minPollIntervalSeconds: 600,
    maxPollIntervalSeconds: 1800
  },
  {
    name: 'tomorrow',
    maxMinutesToKickoff: 2880,
    weight: 3,
    minPollIntervalSeconds: 1800,
    maxPollIntervalSeconds: 3600
  },
  {
    name: 'distant',
    maxMinutesToKickoff: Infinity,
    weight: 2,
    minPollIntervalSeconds: 3600,
    maxPollIntervalSeconds: 7200
  }
]

/**
 * Tier boundaries in minutes for determining event tiers.
 * Story 8.7: Configurable tier boundaries.
 */
export interface TierBoundaries {
  imminent: number
  soon: number
  today: number
  later: number
  tomorrow: number
}

/**
 * Default tier boundaries (in minutes).
 * Story 8.7: Default time-to-kickoff boundaries for each tier.
 */
export const DEFAULT_TIER_BOUNDARIES: TierBoundaries = {
  imminent: 30,
  soon: 120,
  today: 360,
  later: 1440,
  tomorrow: 2880
}

/**
 * Tier weights for quota allocation.
 * Story 8.7: Percentage of quota budget allocated to each tier.
 */
export interface TierWeights {
  imminent: number
  soon: number
  today: number
  later: number
  tomorrow: number
  distant: number
}

/**
 * Default tier weights (% of quota budget).
 * Story 8.7: Default weights prioritize imminent events.
 */
export const DEFAULT_TIER_WEIGHTS: TierWeights = {
  imminent: 50,
  soon: 25,
  today: 12,
  later: 8,
  tomorrow: 3,
  distant: 2
}

/**
 * Tiered event with metadata for aggressive scanning.
 * Story 8.7: Extends DeepScanEvent with tier and polling metadata.
 */
export interface TieredEvent {
  id: string
  name: string
  date?: string
  league?: string
  sport?: string
  tier: EventTier
  minutesToKickoff: number
  lastPolledAt: string | null
  pollCount: number
  volatilityScore: number
  isBoosted: boolean
  boostExpiresAt: string | null
}

/**
 * Odds snapshot for historical tracking.
 * Story 8.7: Single odds snapshot with timestamp.
 */
export interface OddsHistorySnapshot {
  odds: RawOddsPayload
  fetchedAt: string
}

/**
 * Cached event with odds history.
 * Story 8.7: Stores event with current and historical odds.
 */
export interface CachedEventWithOdds {
  event: TieredEvent
  currentOdds: RawOddsPayload | null
  oddsHistory: OddsHistorySnapshot[]
  oddsChangeCount: number
  lastOddsChangeAt: string | null
  hasActiveArbs: boolean
  arbCount: number
}

/**
 * Budget allocation for a single tier.
 * Story 8.7: Tracks quota usage per tier.
 */
export interface TierBudget {
  tier: EventTier
  weight: number
  allocatedRequests: number
  usedThisHour: number
  eventCount: number
  currentPollIntervalSeconds: number
}

/**
 * Overall quota budget tracking.
 * Story 8.7: Manages API quota across all tiers.
 */
export interface QuotaBudget {
  totalHourlyLimit: number
  targetPercent: number
  targetRequestsPerHour: number
  bufferPercent: number
  bufferRequests: number
  usableRequests: number
  perTier: Record<EventTier, TierBudget>
  currentHourUsed: number
  currentHourRemaining: number
  hourResetAt: string
}

/**
 * Boost information for an event.
 * Story 8.7: Tracks temporary polling priority boost.
 */
export interface EventBoostInfo {
  eventId: string
  boostedAt: string
  expiresAt: string
  reason: 'arb_detected' | 'high_volatility' | 'manual'
}

/**
 * Aggressive scan statistics for dashboard.
 * Story 8.7: Real-time metrics display.
 */
export interface AggressiveScanStats {
  enabled: boolean
  quotaTargetPercent: number

  // Quota
  quotaUsedThisHour: number
  quotaRemainingThisHour: number
  quotaEfficiencyPercent: number

  // Events by tier
  eventsByTier: Record<EventTier, number>
  totalEvents: number

  // Polling
  pollIntervalsByTier: Record<EventTier, number>
  pollsThisHour: number
  avgPollLatencyMs: number

  // Arbitrage
  arbsFoundThisHour: number
  arbsFoundTotal: number
  boostedEvents: number
  avgArbDetectionTimeSeconds: number

  // Cache
  cachedEvents: number
  cacheMemoryMb: number

  // Timing
  lastPollAt: string | null
  scanStartedAt: string | null
  uptimeMinutes: number
}

/**
 * Aggressive scan configuration settings.
 * Story 8.7: User-configurable aggressive mode settings.
 */
export interface AggressiveScanConfig {
  enabled: boolean
  quotaTargetPercent: number
  scanHorizonHours: number
  imminentPollIntervalSeconds: number
  tierBoundaries: TierBoundaries
  tierWeights: TierWeights
  arbBoostDurationMinutes: number
  arbBoostPollIntervalSeconds: number
  maxBoostedEvents: number
  maxCachedEvents: number
  eventDiscoveryIntervalMinutes: number
}

/**
 * Default aggressive scan configuration.
 * Story 8.7: Sensible defaults for aggressive mode.
 */
export const DEFAULT_AGGRESSIVE_SCAN_CONFIG: AggressiveScanConfig = {
  enabled: false,
  quotaTargetPercent: 75,
  scanHorizonHours: 48,
  imminentPollIntervalSeconds: 45,
  tierBoundaries: DEFAULT_TIER_BOUNDARIES,
  tierWeights: DEFAULT_TIER_WEIGHTS,
  arbBoostDurationMinutes: 5,
  arbBoostPollIntervalSeconds: 20,
  maxBoostedEvents: 10,
  maxCachedEvents: 3000,
  eventDiscoveryIntervalMinutes: 10
}

/**
 * Progress information for cold start initialization.
 * Story 8.7: Tracks wide event discovery and initial fetch progress.
 */
export interface ColdStartProgress {
  phase: 'discovering' | 'fetching' | 'complete'
  totalEvents: number
  processedEvents: number
  percentComplete: number
  estimatedRemainingSeconds: number
  currentTier: EventTier | null
}

/**
 * Result of a tiered poll cycle.
 * Story 8.7: Tracks what happened during a poll cycle.
 */
export interface TieredPollResult {
  tier: EventTier
  eventsPolled: number
  arbsFound: number
  latencyMs: number
  timestamp: string
}
