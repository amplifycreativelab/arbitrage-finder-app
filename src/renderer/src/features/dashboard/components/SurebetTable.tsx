import * as React from 'react'
import { cn } from '../../../lib/utils'
import type { ArbitrageOpportunity } from '../../../../../../shared/types'
import { SurebetRow } from './SurebetRow'
import type { FeedSortKey, FeedSortDirection } from '../stores/feedStore'

export interface SurebetTableProps {
  opportunities: ArbitrageOpportunity[]
  selectedId: string | null
  expandedId: string | null
  onSelect: (id: string) => void
  onToggleExpand: (id: string) => void
  onDelete?: (id: string) => void
  sortBy: FeedSortKey
  sortDirection: FeedSortDirection
  onSortChange: (key: FeedSortKey, direction: FeedSortDirection) => void
  className?: string
}

export function SurebetTable({
  opportunities,
  selectedId,
  expandedId,
  onSelect,
  onToggleExpand,
  onDelete,
  sortBy,
  sortDirection,
  onSortChange,
  className
}: SurebetTableProps): React.JSX.Element {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  const handleSort = (key: FeedSortKey): void => {
    // Toggle direction if clicking the same key
    const newDirection =
      sortBy === key ? (sortDirection === 'asc' ? 'desc' : 'asc') : key === 'roi' ? 'desc' : 'asc'
    onSortChange(key, newDirection)
  }

  const getSortIcon = (key: FeedSortKey): string => {
    if (sortBy !== key) return 'â‡…'
    return sortDirection === 'asc' ? 'â†‘' : 'â†“'
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-ot-surface rounded-lg border border-ot-border overflow-hidden',
        className
      )}
      data-testid="surebet-table"
    >
      {/* Table Header */}
      <div className="flex items-center bg-ot-background border-b border-ot-border text-xs font-medium text-ot-muted uppercase tracking-wider shrink-0">
        {/* Profit Header */}
        <button
          type="button"
          onClick={() => handleSort('roi')}
          className={cn(
            'w-[100px] shrink-0 py-2.5 px-3 text-center hover:bg-ot-surface-hover transition-colors border-r border-ot-border',
            sortBy === 'roi' && 'text-ot-accent'
          )}
        >
          Profit {getSortIcon('roi')}
        </button>

        {/* Outcome Headers */}
        <div className="flex-1 flex min-w-0">
          <div className="w-[120px] shrink-0 py-2.5 px-3">Bookmaker</div>
          <div className="w-[70px] shrink-0 py-2.5 px-3 text-center">Date</div>
          <div className="flex-1 min-w-0 py-2.5 px-3">Event</div>
          <div className="w-[140px] shrink-0 py-2.5 px-3">Market</div>
          <div className="w-[70px] shrink-0 py-2.5 px-3 text-right">Odds</div>
        </div>

        {/* Details Header */}
        <div className="w-[40px] shrink-0 py-2.5 text-center border-l border-ot-border">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 mx-auto"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
      </div>

      {/* Table Body */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0"
        data-testid="surebet-table-body"
      >
        {opportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-ot-muted py-12">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-12 w-12 mb-4 opacity-40"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-sm">No surebets found</p>
            <p className="text-xs mt-1 opacity-60">Adjust filters or wait for new opportunities</p>
          </div>
        ) : (
          opportunities.map((opportunity) => (
            <SurebetRow
              key={opportunity.id}
              opportunity={opportunity}
              isSelected={selectedId === opportunity.id}
              isExpanded={expandedId === opportunity.id}
              onSelect={() => onSelect(opportunity.id)}
              onToggleExpand={() => onToggleExpand(opportunity.id)}
              onDelete={onDelete ? () => onDelete(opportunity.id) : undefined}
            />
          ))
        )}
      </div>
    </div>
  )
}
