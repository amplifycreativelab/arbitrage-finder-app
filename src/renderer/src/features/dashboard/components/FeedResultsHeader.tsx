import * as React from 'react'
import { cn } from '../../../lib/utils'
import { getStalenessInfo } from '../staleness'

export interface FeedResultsHeaderProps {
  count: number
  filteredCount: number
  fetchedAt: string | null
  stalenessNow: number
  isLoading?: boolean
  className?: string
}

export function FeedResultsHeader({
  count,
  filteredCount,
  fetchedAt,
  stalenessNow,
  isLoading,
  className
}: FeedResultsHeaderProps): React.JSX.Element {
  const hasFilters = filteredCount !== count

  const stalenessLabel = React.useMemo(() => {
    if (!fetchedAt) return 'never'
    const info = getStalenessInfo({ foundAt: fetchedAt }, stalenessNow)
    return info.label || 'just now'
  }, [fetchedAt, stalenessNow])

  return (
    <div
      className={cn(
        'flex items-center justify-between py-2 px-3 bg-ot-surface border-b border-ot-border',
        className
      )}
      data-testid="feed-results-header"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-ot-foreground">
          {hasFilters ? `${filteredCount} of ${count}` : count} surebets
        </span>
        {hasFilters && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-ot-accent-subtle text-ot-accent border border-ot-accent/20">
            filtered
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-ot-muted">
        {isLoading ? (
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-ot-border border-t-ot-accent" />
            Updating...
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
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
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Updated {stalenessLabel}
          </span>
        )}
      </div>
    </div>
  )
}
