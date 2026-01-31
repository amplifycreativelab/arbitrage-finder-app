import type { ArbitrageOpportunity } from '../../../../../../shared/types'
import type { Currency } from '../../../../../../shared/lib/currency'
import { CURRENCY_DETAILS } from '../../../../../../shared/lib/currency'

export interface BetSlipData {
  bookmakerA: string
  stakeA: number
  oddsA: number
  bookmakerB: string
  stakeB: number
  oddsB: number
  totalStake: number
  profit: number
  roi: number
  // NEW: Multi-currency fields (Story 8.5)
  currencyA: Currency
  currencyB: Currency
  baseCurrency: Currency
}

/**
 * Formats bet slip data into a readable string for copying.
 * Format: "Bookmaker A: Stake $X @ Odds Y | Bookmaker B: Stake $X @ Odds Y | Total: $X | Profit: $X (X%)"
 * NEW (Story 8.5): Includes currency symbols for each stake
 */
export function formatBetSlip(data: BetSlipData): string {
  const {
    bookmakerA,
    stakeA,
    oddsA,
    bookmakerB,
    stakeB,
    oddsB,
    totalStake,
    profit,
    roi,
    currencyA,
    currencyB,
    baseCurrency
  } = data

  const symbolA = CURRENCY_DETAILS[currencyA]?.symbol || '$'
  const symbolB = CURRENCY_DETAILS[currencyB]?.symbol || '$'
  const baseSymbol = CURRENCY_DETAILS[baseCurrency]?.symbol || '$'

  return (
    `${bookmakerA}: ${symbolA}${stakeA.toFixed(2)} @ ${oddsA.toFixed(2)} | ` +
    `${bookmakerB}: ${symbolB}${stakeB.toFixed(2)} @ ${oddsB.toFixed(2)} | ` +
    `Total: ${baseSymbol}${totalStake.toFixed(2)} ${baseCurrency} | ` +
    `Profit: ${baseSymbol}${profit.toFixed(2)} ${baseCurrency} (${(roi * 100).toFixed(2)}%)`
  )
}

/**
 * Creates bet slip data from an opportunity and calculated stakes.
 * NEW (Story 8.5): Includes currency information
 */
export function createBetSlipData(
  opportunity: ArbitrageOpportunity,
  stakeA: number,
  stakeB: number,
  profit: number,
  currencyA: Currency = 'USD',
  currencyB: Currency = 'USD',
  baseCurrency: Currency = 'USD'
): BetSlipData {
  const legA = opportunity.legs[0]
  const legB = opportunity.legs[1]
  const totalStake = stakeA + stakeB

  return {
    bookmakerA: legA.bookmaker,
    stakeA,
    oddsA: legA.odds,
    bookmakerB: legB.bookmaker,
    stakeB,
    oddsB: legB.odds,
    totalStake,
    profit,
    roi: totalStake > 0 ? profit / totalStake : 0,
    currencyA,
    currencyB,
    baseCurrency
  }
}

/**
 * Copies formatted bet slip to clipboard.
 * Returns true if successful, false otherwise.
 */
export async function copyBetSlipToClipboard(data: BetSlipData): Promise<boolean> {
  try {
    const text = formatBetSlip(data)
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * Creates and copies bet slip from opportunity and stakes in one call.
 */
export async function copyOpportunityBetSlip(
  opportunity: ArbitrageOpportunity,
  stakeA: number,
  stakeB: number,
  profit: number
): Promise<boolean> {
  const data = createBetSlipData(opportunity, stakeA, stakeB, profit)
  return copyBetSlipToClipboard(data)
}
