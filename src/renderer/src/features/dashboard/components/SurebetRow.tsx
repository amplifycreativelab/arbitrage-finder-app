import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { cn } from '../../../lib/utils'
import type { ArbitrageOpportunity } from '../../../../../../shared/types'
import { useCalculatorStore } from '../stores/calculatorStore'
import { useFeedStore } from '../stores/feedStore'
import { copyAndAdvanceCurrentOpportunity } from '../copyAndAdvance'

interface SurebetRowProps {
  opportunity: ArbitrageOpportunity
  isSelected: boolean
  isExpanded: boolean
  onSelect: () => void
  onToggleExpand: () => void
  onDelete?: () => void
}

function formatProfit(roi: number): string {
  return `${(roi * 100).toFixed(2)}%`
}

function formatAge(foundAt: string): string {
  const minutes = Math.floor((Date.now() - new Date(foundAt).getTime()) / 60000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function formatEventDate(dateStr: string): { date: string; time: string } {
  try {
    const date = parseISO(dateStr)
    return {
      date: format(date, 'dd/MM'),
      time: format(date, 'HH:mm')
    }
  } catch {
    return { date: '--/--', time: '--:--' }
  }
}

function getOddsTrendIndicator(
  currentOdds: number,
  history?: number[]
): { icon: string; color: string } | null {
  if (!history || history.length < 2) return null
  const prevOdds = history[history.length - 2]
  if (currentOdds > prevOdds) return { icon: 'â†‘', color: 'text-emerald-500' }
  if (currentOdds < prevOdds) return { icon: 'â†“', color: 'text-rose-500' }
  return null
}

export function SurebetRow({
  opportunity,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onDelete
}: SurebetRowProps): React.JSX.Element {
  const openCalculator = useCalculatorStore((state) => state.openCalculator)
  const setSelectedOpportunityId = useFeedStore((state) => state.setSelectedOpportunityId)
  const [showActions, setShowActions] = React.useState(false)

  const legs = opportunity.legs
  const profit = formatProfit(opportunity.roi)
  const age = formatAge(opportunity.foundAt)

  const { date, time } = formatEventDate(opportunity.event.date)

  const handleProfitClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    setSelectedOpportunityId(opportunity.id, 0)
    openCalculator(opportunity)
  }

  const handleCopySignal = (e: React.MouseEvent): void => {
    e.stopPropagation()
    setSelectedOpportunityId(opportunity.id, 0)
    void copyAndAdvanceCurrentOpportunity()
  }

  const handleRowClick = (): void => {
    onSelect()
  }

  const handleExpandClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    onToggleExpand()
  }

  const handleDeleteClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    onDelete?.()
  }

  return (
    <div
      className={cn(
        'group border-b border-ot-border last:border-b-0',
        isSelected ? 'bg-ot-accent/5' : 'hover:bg-ot-surface-hover'
      )}
      data-testid="surebet-row"
      data-selected={isSelected}
      data-expanded={isExpanded}
    >
      {/* Main Row - Grouped Layout */}
      <div
        className="flex items-stretch cursor-pointer"
        onClick={handleRowClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Profit Column - Spans all rows */}
        <div className="w-[100px] shrink-0 p-3 border-r border-ot-border bg-ot-surface/50 flex flex-col items-center justify-center gap-1">
          <div className="text-lg font-bold text-ot-accent">{profit}</div>
          <div className="text-[10px] text-ot-muted">{age}</div>

          {/* Action Icons */}
          <div
            className={cn(
              'flex items-center gap-1 mt-1 transition-opacity',
              showActions || isSelected ? 'opacity-100' : 'opacity-0'
            )}
          >
            <button
              type="button"
              onClick={handleProfitClick}
              className="p-1 rounded hover:bg-ot-accent-subtle text-ot-muted hover:text-ot-accent"
              title="Open calculator"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3"
              >
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="8" y1="6" x2="16" y2="6" />
                <line x1="16" y1="14" x2="16" y2="14.01" />
                <path d="M8 14h.01" />
                <path d="M12 14h.01" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleCopySignal}
              className="p-1 rounded hover:bg-ot-success-dim text-ot-muted hover:text-ot-success"
              title="Copy signal"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="p-1 rounded hover:bg-ot-error-dim text-ot-muted hover:text-ot-error"
                title="Delete"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Outcome Rows */}
        <div className="flex-1 flex flex-col min-w-0">
          {legs.map((leg, index) => {
            const trend = getOddsTrendIndicator(
              leg.odds,
              opportunity.oddsHistory?.map((h) => h.legOdds[index])
            )
            const isLast = index === legs.length - 1

            return (
              <div
                key={index}
                className={cn(
                  'flex items-center py-2 px-3 text-sm',
                  !isLast && 'border-b border-ot-border/50'
                )}
              >
                {/* Bookmaker */}
                <div className="w-[120px] shrink-0">
                  <div className="text-xs font-medium text-ot-foreground truncate">
                    {leg.bookmaker}
                  </div>
                  <div className="text-[10px] text-ot-muted capitalize">{opportunity.sport}</div>
                </div>

                {/* Date/Time */}
                <div className="w-[70px] shrink-0 text-center">
                  <div className="text-xs text-ot-foreground">{date}</div>
                  <div className="text-[10px] text-ot-muted">{time}</div>
                </div>

                {/* Event */}
                <div className="flex-1 min-w-0 px-2">
                  <div
                    className="text-xs font-medium text-ot-foreground truncate"
                    title={opportunity.event.name}
                  >
                    {opportunity.event.name}
                  </div>
                  <div
                    className="text-[10px] text-ot-muted truncate"
                    title={opportunity.event.league}
                  >
                    {opportunity.event.league}
                  </div>
                </div>

                {/* Market */}
                <div className="w-[140px] shrink-0 px-2">
                  <div className="text-xs text-ot-foreground truncate" title={leg.market}>
                    {leg.market}
                  </div>
                  <div className="text-[10px] text-ot-accent truncate">{leg.outcome}</div>
                </div>

                {/* Odds */}
                <div className="w-[70px] shrink-0 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-xs font-mono font-medium text-ot-foreground">
                      {leg.odds.toFixed(2)}
                    </span>
                    {trend && <span className={cn('text-[10px]', trend.color)}>{trend.icon}</span>}
                  </div>
                  {leg.impliedProbability && (
                    <div className="text-[9px] text-ot-muted">
                      {(leg.impliedProbability * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Details Column (Chevron) */}
        <div className="w-[40px] shrink-0 flex items-center justify-center border-l border-ot-border">
          <button
            type="button"
            onClick={handleExpandClick}
            className={cn(
              'p-1.5 rounded-md transition-all duration-200',
              isExpanded
                ? 'bg-ot-accent-subtle text-ot-accent rotate-90'
                : 'text-ot-muted hover:text-ot-foreground hover:bg-ot-surface-hover'
            )}
            title={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-ot-border bg-ot-background px-4 py-3 animate-slide-in">
          <SurebetDetails opportunity={opportunity} />
        </div>
      )}
    </div>
  )
}

// Expanded Details Component
function SurebetDetails({ opportunity }: { opportunity: ArbitrageOpportunity }): React.JSX.Element {
  const openCalculator = useCalculatorStore((state) => state.openCalculator)
  const { date, time } = formatEventDate(opportunity.event.date)

  return (
    <div className="space-y-3">
      {/* Event Summary */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-medium text-ot-foreground">{opportunity.event.name}</h4>
          <p className="text-xs text-ot-muted">
            {opportunity.event.league} â€¢ {date} {time}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {opportunity.isCrossProvider && (
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-ot-cross-provider-dim text-ot-cross-provider border border-ot-cross-provider/20">
              Cross-Provider
            </span>
          )}
          {opportunity.source === 'deepScan' && (
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-ot-deep-scan-dim text-ot-deep-scan border border-ot-deep-scan/20">
              Deep Scan
            </span>
          )}
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-ot-accent-subtle text-ot-accent border border-ot-accent/20">
            {(opportunity.roi * 100).toFixed(2)}% ROI
          </span>
        </div>
      </div>

      {/* Legs Detail */}
      <div className="grid gap-2">
        {opportunity.legs.map((leg, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 rounded-md bg-ot-surface border border-ot-border"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-ot-accent-subtle flex items-center justify-center text-ot-accent text-xs font-bold">
                {String.fromCharCode(65 + index)}
              </div>
              <div>
                <div className="text-xs font-medium text-ot-foreground">{leg.bookmaker}</div>
                <div className="text-[10px] text-ot-muted">
                  {leg.market} - {leg.outcome}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono font-bold text-ot-foreground">
                {leg.odds.toFixed(2)}
              </div>
              {leg.impliedProbability && (
                <div className="text-[10px] text-ot-muted">
                  {(leg.impliedProbability * 100).toFixed(1)}% implied
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={() => openCalculator(opportunity)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-md bg-ot-accent text-white hover:bg-ot-accent-hover transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="16" y1="14" x2="16" y2="14.01" />
            <path d="M8 14h.01" />
            <path d="M12 14h.01" />
          </svg>
          Calculate Stakes
        </button>
        <button
          type="button"
          onClick={() => void copyAndAdvanceCurrentOpportunity()}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-md bg-ot-surface text-ot-foreground border border-ot-border hover:bg-ot-surface-hover transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy Signal
        </button>
      </div>
    </div>
  )
}
