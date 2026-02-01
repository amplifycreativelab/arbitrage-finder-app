import * as React from 'react'
import type { CardRulesWarning, CardCountingRule } from '../../../../../shared/types'
import { CARD_COUNTING_RULE_DISPLAY } from '../../../../../shared/types'

interface CardRulesWarningIconProps {
  warning: CardRulesWarning
  onClick?: () => void
}

/**
 * Get display label for card counting rule.
 */
function getCardRuleLabel(rule: CardCountingRule): string {
  return CARD_COUNTING_RULE_DISPLAY[rule]?.label ?? 'Unknown'
}

/**
 * Format card counting rule description for tooltip.
 * Shows the card count for "2 yellows + 1 red" scenario.
 */
function formatCardRuleDescription(rule: CardCountingRule): string {
  switch (rule) {
    case 'conservative':
      return '2 cards for YY+R (counts only the red)'
    case 'standard':
      return '3 cards for YY+R (counts each card)'
    default:
      return 'Unknown rule'
  }
}

/**
 * Card Rules Warning Icon Component
 * 
 * Story 6.5: Displays a warning icon for arbitrage opportunities where
 * bookmakers have different card counting rules. Shows a tooltip on hover
 * with the rule details for each bookmaker.
 */
export function CardRulesWarningIcon({ warning, onClick }: CardRulesWarningIconProps): React.JSX.Element {
  const [showTooltip, setShowTooltip] = React.useState(false)

  const tooltipContent = (
    <div className="space-y-2">
      <p className="font-semibold text-amber-300">Card counting rules differ between bookmakers</p>
      <div className="space-y-1 text-xs">
        <p>
          <span className="font-medium">{warning.bookmakerA.name}:</span>{' '}
          <span className={warning.bookmakerA.rule === 'conservative' ? 'text-amber-400' : 'text-emerald-400'}>
            {getCardRuleLabel(warning.bookmakerA.rule)}
          </span>
          {' '}- {formatCardRuleDescription(warning.bookmakerA.rule)}
        </p>
        <p>
          <span className="font-medium">{warning.bookmakerB.name}:</span>{' '}
          <span className={warning.bookmakerB.rule === 'conservative' ? 'text-amber-400' : 'text-emerald-400'}>
            {getCardRuleLabel(warning.bookmakerB.rule)}
          </span>
          {' '}- {formatCardRuleDescription(warning.bookmakerB.rule)}
        </p>
      </div>
      <p className="text-[10px] text-ot-muted italic">
        Click for more details
      </p>
    </div>
  )

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
        aria-label="Card counting rules differ between bookmakers"
        data-testid="card-rules-warning-icon"
      >
        ⚠️
      </button>
      
      {showTooltip && (
        <div 
          className="absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-md border border-amber-500/30 bg-slate-900/95 p-3 text-[11px] text-ot-foreground shadow-lg backdrop-blur-sm"
          data-testid="card-rules-warning-tooltip"
        >
          {tooltipContent}
          <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-r border-b border-amber-500/30 bg-slate-900/95" />
        </div>
      )}
    </div>
  )
}
