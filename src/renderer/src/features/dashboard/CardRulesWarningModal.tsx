import * as React from 'react'
import type { CardRulesWarning } from '../../../../../shared/types'
import { CARD_COUNTING_RULE_DISPLAY } from '../../../../../shared/types'

interface CardRulesWarningModalProps {
  warning: CardRulesWarning | null
  isOpen: boolean
  onClose: () => void
}

/**
 * Get display label for card counting rule.
 */
function getCardRuleLabel(rule: 'conservative' | 'standard'): string {
  return CARD_COUNTING_RULE_DISPLAY[rule]?.label ?? 'Unknown'
}

/**
 * Format card counting rule description.
 */
function formatCardRuleDescription(rule: 'conservative' | 'standard'): string {
  return CARD_COUNTING_RULE_DISPLAY[rule]?.example ?? ''
}

/**
 * Card Rules Warning Modal Component
 * 
 * Story 6.5: Displays detailed information about card counting rule differences
 * between bookmakers. Explains the risk and provides an example scenario where
 * this could cause a loss.
 */
export function CardRulesWarningModal({ warning, isOpen, onClose }: CardRulesWarningModalProps): React.JSX.Element | null {
  if (!isOpen || !warning) {
    return null
  }

  const conservativeBookmaker = warning.bookmakerA.rule === 'conservative' 
    ? warning.bookmakerA 
    : warning.bookmakerB.rule === 'conservative'
      ? warning.bookmakerB
      : null

  const standardBookmaker = warning.bookmakerA.rule === 'standard'
    ? warning.bookmakerA
    : warning.bookmakerB.rule === 'standard'
      ? warning.bookmakerB
      : null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      data-testid="card-rules-warning-modal"
    >
      <div 
        className="w-full max-w-md rounded-lg border border-amber-500/30 bg-slate-900/95 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xl">⚠️</span>
          <h2 className="text-lg font-semibold text-amber-400">Card Counting Rules Differ</h2>
        </div>
        
        <p className="mb-4 text-sm text-slate-400">
          This arbitrage opportunity involves bookmakers with different card counting rules.
        </p>

        <div className="space-y-4">
          {/* Bookmaker Rules Comparison */}
          <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bookmaker Rules</h4>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-emerald-400">{warning.bookmakerA.name}</p>
                  <p className="text-xs text-slate-400">
                    {getCardRuleLabel(warning.bookmakerA.rule)}: {formatCardRuleDescription(warning.bookmakerA.rule)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-400">{warning.bookmakerB.name}</p>
                  <p className="text-xs text-slate-400">
                    {getCardRuleLabel(warning.bookmakerB.rule)}: {formatCardRuleDescription(warning.bookmakerB.rule)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Explanation */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">The Risk</h4>
            <p className="text-sm text-slate-200 leading-relaxed">
              In a scenario where a player receives <strong>2 yellow cards</strong> (resulting in a red), 
              the total card count depends on how each bookmaker counts:
            </p>
            <ul className="space-y-1 text-sm text-slate-200">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">•</span>
                <span><strong>Standard</strong> counts 3 cards (YY+R)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">•</span>
                <span><strong>Conservative</strong> counts 2 cards (only the red)</span>
              </li>
            </ul>
          </div>

          {/* Example Scenario */}
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-400">Example Scenario</h4>
            <p className="text-sm text-slate-200 leading-relaxed">
              If you bet <strong>Over 2.5 cards</strong> with {conservativeBookmaker?.name ?? 'Bookmaker A'} 
              and <strong>Under 2.5 cards</strong> with {standardBookmaker?.name ?? 'Bookmaker B'}, 
              and the match ends with exactly <strong>2 yellows + 1 red</strong>:
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>{standardBookmaker?.name ?? 'Standard bookmaker'} settles as <strong>3 cards</strong> (Over wins)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-red-400">✗</span>
                <span>{conservativeBookmaker?.name ?? 'Conservative bookmaker'} settles as <strong>2 cards</strong> (Under wins)</span>
              </li>
            </ul>
            <p className="mt-2 text-sm font-medium text-red-400">
              Both bets lose! The &quot;guaranteed profit&quot; becomes a loss.
            </p>
          </div>

          {/* Recommendation */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-400">Recommendation</h4>
            <p className="text-sm text-slate-200 leading-relaxed">
              Before placing bets, <strong>verify both bookmakers&apos; settlement rules</strong> for this specific match. 
              Consider avoiding this opportunity if you cannot confirm the rules or if the line is close to the 
              potential discrepancy (e.g., Over/Under 2.5 when the difference is between 2 and 3 cards).
            </p>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            data-testid="card-rules-warning-close"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
