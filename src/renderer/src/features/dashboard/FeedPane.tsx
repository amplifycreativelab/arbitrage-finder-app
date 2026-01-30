import * as React from 'react'

import { useFeedStore } from './stores/feedStore'
import { FeedTable } from './FeedTable'
import type { FeedSortKey, FeedSortDirection } from './stores/feedStore'
import {
  applyDashboardFilters,
  getAvailableBookmakers
} from './filters'
import { useFeedFiltersStore } from './stores/feedFiltersStore'
import { useStalenessTicker } from './useStalenessTicker'
import { useAutoRefresh } from './hooks/useAutoRefresh'
import type {
  DashboardStatusSnapshot,
  ProviderStatus,
  ProviderId,
  SystemStatus,
  ArbitrageOpportunity
} from '../../../../../shared/types'
import { PROVIDERS } from '../../../../../shared/types'
import StatusBar from './StatusBar'
import { getStalenessInfo } from './staleness'
import { FilterBar, type SourceFilter, type SortOption } from './FilterBar'

interface ProviderFailureBannerProps {
  statusSnapshot: DashboardStatusSnapshot | null
  stalenessNow: number
}

function getProviderRecommendedAction(status: ProviderStatus): string {
  switch (status) {
    case 'QuotaLimited':
      return 'Quota reached or approaching; reduce polling frequency or check API quota dashboard.'
    case 'Degraded':
      return 'Provider responding slowly or with partial failures; inspect logs and consider temporary fallbacks.'
    case 'ConfigMissing':
      return 'Config missing: set or update API key in Provider Settings.'
    case 'Down':
      return 'Provider is unreachable or failing; check provider status page and network connectivity.'
    case 'OK':
    default:
      return 'No action required.'
  }
}

function formatLastSuccess(timestamp: string | null, stalenessNow: number): string {
  if (!timestamp) {
    return 'No successful fetch yet'
  }

  const info = getStalenessInfo({ foundAt: timestamp }, stalenessNow)
  return info.label ? `${info.label}` : 'Just now'
}

function ProviderFailureBanner({
  statusSnapshot,
  stalenessNow
}: ProviderFailureBannerProps): React.JSX.Element | null {
  if (!statusSnapshot?.providers?.length) {
    return null
  }

  const problematic = statusSnapshot.providers.filter((entry) =>
    ['Down', 'QuotaLimited', 'ConfigMissing'].includes(entry.status)
  )

  if (problematic.length === 0) {
    return null
  }

  const providerLabelById = new Map<ProviderId, string>(
    PROVIDERS.map((provider) => [provider.id, provider.displayName] as const)
  )

  return (
    <div
      className="mb-3 space-y-1 rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 p-3 text-[10px] text-amber-100"
      data-testid="provider-failure-banner"
      aria-label="Provider health issues"
    >
      <div className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 text-amber-400"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span className="font-semibold uppercase tracking-[0.14em]">Provider Issues</span>
      </div>
      <ul className="mt-2 space-y-1.5 pl-6">
        {problematic.map((entry) => (
          <li key={entry.providerId} className="leading-snug">
            <span className="font-semibold text-amber-200">
              {providerLabelById.get(entry.providerId as ProviderId) ?? entry.providerId}
            </span>
            <span className="mx-1.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-medium">
              {entry.status}
            </span>
            <span className="text-amber-100/70">
              · Last success: {formatLastSuccess(entry.lastSuccessfulFetchAt, stalenessNow)}
            </span>
            <span className="mt-0.5 block text-[9px] text-amber-200/70">
              → {getProviderRecommendedAction(entry.status as ProviderStatus)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Apply source filtering to opportunities
 */
function applySourceFilter(
  opportunities: ArbitrageOpportunity[],
  sourceFilter: SourceFilter
): ArbitrageOpportunity[] {
  if (sourceFilter === 'all') {
    return opportunities
  }

  return opportunities.filter((opp) => {
    switch (sourceFilter) {
      case 'live':
        return opp.source !== 'deepScan'
      case 'deepScan':
        return opp.source === 'deepScan'
      case 'crossProvider':
        return opp.isCrossProvider === true
      default:
        return true
    }
  })
}

/**
 * Parse sort option into key and direction
 */
function parseSortOption(sortOption: SortOption): { key: FeedSortKey; direction: FeedSortDirection } {
  const [key, direction] = sortOption.split('-') as [FeedSortKey, FeedSortDirection]
  return { key, direction }
}

function FeedPane(): React.JSX.Element {
  const [feedState, setFeedState] = React.useState(() => useFeedStore.getState())
  const refreshSnapshot = useFeedStore((state) => state.refreshSnapshot)
  const syncSelectionWithVisibleIds = useFeedStore(
    (state) => state.syncSelectionWithVisibleIds
  )

  // Local filter state
  const [sourceFilter, setSourceFilter] = React.useState<SourceFilter>('all')
  const [sortOption, setSortOption] = React.useState<SortOption>('roi-desc')

  // Enable auto-refresh polling
  useAutoRefresh()

  React.useEffect(() => {
    const unsubscribe = useFeedStore.subscribe((nextState) => {
      setFeedState(nextState)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const { opportunities, fetchedAt, isLoading, error, status } = feedState
  const [filterStateForTable, setFilterStateForTable] = React.useState(() =>
    useFeedFiltersStore.getState()
  )

  React.useEffect(() => {
    const unsubscribeFilters = useFeedFiltersStore.subscribe((nextState) => {
      setFilterStateForTable(nextState)
    })

    return () => {
      unsubscribeFilters()
    }
  }, [])

  const { regions, sports, markets, bookmakers, minRoi } = filterStateForTable
  const stalenessNow = useStalenessTicker()

  React.useEffect(() => {
    void refreshSnapshot()
  }, [refreshSnapshot])

  const safeOpportunities = Array.isArray(opportunities) ? opportunities : []

  const availableBookmakersForRegions = React.useMemo(() => {
    return getAvailableBookmakers(safeOpportunities, regions)
  }, [safeOpportunities, regions])

  // Apply dashboard filters first
  const dashboardFiltered = React.useMemo(
    () =>
      applyDashboardFilters(safeOpportunities, {
        regions,
        sports,
        markets,
        bookmakers,
        minRoi
      }),
    [safeOpportunities, regions, sports, markets, bookmakers, minRoi]
  )

  // Then apply source filter
  const filteredOpportunities = React.useMemo(
    () => applySourceFilter(dashboardFiltered, sourceFilter),
    [dashboardFiltered, sourceFilter]
  )

  React.useEffect(() => {
    const visibleIds = Array.isArray(filteredOpportunities)
      ? filteredOpportunities.map((opportunity) => opportunity.id)
      : []

    syncSelectionWithVisibleIds(visibleIds)
  }, [filteredOpportunities, syncSelectionWithVisibleIds])

  const totalCount = safeOpportunities.length
  const filteredCount = Array.isArray(filteredOpportunities)
    ? filteredOpportunities.length
    : 0
  const hasUnderlyingData = totalCount > 0
  const noUnderlyingData = !hasUnderlyingData

  const systemStatus: SystemStatus = status?.systemStatus ?? 'OK'
  const hasUnhealthyProvider =
    status?.providers?.some((entry) =>
      ['Degraded', 'Down', 'QuotaLimited', 'ConfigMissing'].includes(entry.status)
    ) ?? false
  const isSystemUnhealthy: boolean =
    systemStatus === 'Degraded' || systemStatus === 'Error' || systemStatus === 'Stale'
  const hasUnhealthyStatus = hasUnhealthyProvider || isSystemUnhealthy

  // Parse sort option for FeedTable
  const { key: sortBy, direction: sortDirection } = parseSortOption(sortOption)

  let content: React.ReactNode

  if (error && noUnderlyingData) {
    content = (
      <div
        className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-red-300/30 bg-red-50/50 p-6 text-center"
        role="status"
        data-testid="feed-error"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8 text-red-400"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div className="text-[12px] font-medium text-red-600">Unable to load opportunities</div>
        <div className="text-[11px] text-red-500/80">{error}</div>
      </div>
    )
  } else if (isLoading && !hasUnderlyingData) {
    content = (
      <div
        className="flex h-full flex-col items-center justify-center gap-3 p-6"
        role="status"
        data-testid="feed-loading"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ot-border border-t-ot-accent" />
        <div className="text-[11px] text-ot-muted">Loading opportunities...</div>
      </div>
    )
  } else if (hasUnderlyingData && filteredCount === 0) {
    content = (
      <div
        className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-ot-border/60 bg-ot-surface p-6 text-center"
        data-testid="feed-empty-filters"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8 text-ot-muted"
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        <div className="text-[12px] font-medium text-ot-foreground">No matches found</div>
        <div className="text-[11px] text-ot-muted">
          {totalCount} opportunities available, but none match current filters
        </div>
        <button
          type="button"
          className="mt-2 rounded-md border border-ot-accent/30 bg-ot-accent/10 px-3 py-1.5 text-[10px] font-medium text-ot-accent transition-colors hover:bg-ot-accent/20"
          onClick={() => useFeedFiltersStore.getState().resetFilters()}
        >
          Reset All Filters
        </button>
      </div>
    )
  } else if (noUnderlyingData) {
    if (hasUnhealthyStatus) {
      const lastUpdatedLabel =
        fetchedAt != null
          ? getStalenessInfo({ foundAt: fetchedAt }, stalenessNow).label || ''
          : ''

      content = (
        <div
          className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-amber-400/30 bg-amber-50/50 p-6 text-center"
          data-testid="feed-empty-unhealthy"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-amber-500"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div className="text-[12px] font-medium text-amber-700">System Health Degraded</div>
          <div className="text-[11px] text-amber-600/80">
            Status: <span className="font-semibold">{systemStatus}</span>
            {lastUpdatedLabel && (
              <span className="ml-1">· Last update {lastUpdatedLabel}</span>
            )}
          </div>
        </div>
      )
    } else {
      const lastUpdatedLabel =
        fetchedAt != null
          ? getStalenessInfo({ foundAt: fetchedAt }, stalenessNow).label || ''
          : ''

      content = (
        <div
          className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-emerald-300/30 bg-emerald-50/30 p-6 text-center"
          data-testid="feed-empty-healthy"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-emerald-500"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <div className="text-[12px] font-medium text-emerald-700">All Systems Healthy</div>
          <div className="text-[11px] text-ot-muted">
            No arbitrage opportunities detected at this time
          </div>
          {lastUpdatedLabel && (
            <div className="text-[10px] text-ot-muted/70">Last checked {lastUpdatedLabel}</div>
          )}
        </div>
      )
    }
  } else {
    content = (
      <FeedTable
        opportunities={filteredOpportunities}
        stalenessNow={stalenessNow}
        initialSortBy={sortBy}
        initialSortDirection={sortDirection}
      />
    )
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <StatusBar stalenessNow={stalenessNow} statusSnapshot={status ?? null} fetchedAt={fetchedAt} />
      <ProviderFailureBanner statusSnapshot={status ?? null} stalenessNow={stalenessNow} />
      <FilterBar
        totalCount={totalCount}
        filteredCount={filteredCount}
        availableBookmakers={availableBookmakersForRegions}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        sortBy={sortOption}
        onSortChange={setSortOption}
      />
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-ot-border bg-ot-surface p-3">
        {content}
      </div>
    </div>
  )
}

export default FeedPane
