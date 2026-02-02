import * as React from 'react'
import { cn } from '../../../lib/utils'
import { useFeedStore } from '../stores/feedStore'

export interface FeedToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onClearAll?: () => void
  onExport?: () => void
  className?: string
}

export function FeedToolbar({
  searchQuery,
  onSearchChange,
  onClearAll,
  onExport,
  className
}: FeedToolbarProps): React.JSX.Element {
  const refreshSnapshot = useFeedStore((state) => state.refreshSnapshot)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const handleRefresh = async (): Promise<void> => {
    setIsRefreshing(true)
    await refreshSnapshot()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const handleClearSearch = (): void => {
    onSearchChange('')
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 py-2 px-3 border-b border-ot-border bg-ot-surface',
        className
      )}
      data-testid="feed-toolbar"
    >
      {/* Left cluster: Actions + Search */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Clear/Delete All */}
        {onClearAll && (
          <button
            type="button"
            onClick={onClearAll}
            className="p-1.5 rounded-md text-ot-muted hover:text-ot-error hover:bg-ot-error-dim transition-colors"
            title="Clear all surebets"
            data-testid="toolbar-clear-all"
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
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        )}

        {/* Refresh/Rescan */}
        <button
          type="button"
          onClick={handleRefresh}
          className={cn(
            'p-1.5 rounded-md text-ot-muted hover:text-ot-accent hover:bg-ot-accent-subtle transition-colors',
            isRefreshing && 'animate-spin'
          )}
          title="Refresh feed"
          data-testid="toolbar-refresh"
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
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>

        <div className="w-px h-6 bg-ot-border mx-1" />

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ot-muted"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search events, bookmakers, markets..."
            className="w-full h-8 pl-9 pr-8 text-xs bg-ot-background border border-ot-border rounded-md text-ot-foreground placeholder:text-ot-muted focus:outline-none focus:ring-1 focus:ring-ot-accent focus:border-ot-accent"
            data-testid="toolbar-search"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ot-muted hover:text-ot-foreground"
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Right cluster: Utility icons */}
      <div className="flex items-center gap-1">
        {/* Export */}
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="p-1.5 rounded-md text-ot-muted hover:text-ot-foreground hover:bg-ot-surface-hover transition-colors"
            title="Export to CSV/JSON"
            data-testid="toolbar-export"
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        )}

        {/* Settings/Options */}
        <button
          type="button"
          className="p-1.5 rounded-md text-ot-muted hover:text-ot-foreground hover:bg-ot-surface-hover transition-colors"
          title="More options"
          data-testid="toolbar-options"
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
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </div>
    </div>
  )
}
