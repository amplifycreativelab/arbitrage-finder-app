import * as React from 'react'

import { useFeedStore } from './stores/feedStore'
import { FeedTable } from './FeedTable'
import {
  ALL_MARKET_FILTERS,
  ALL_REGION_CODES,
  ALL_SPORT_FILTERS,
  applyDashboardFilters,
  inferRegionFromOpportunity
} from './filters'
import { useFeedFiltersStore } from './stores/feedFiltersStore'
import { useStalenessTicker } from './useStalenessTicker'
import type { MarketFilterValue, SportFilterValue } from './filters'
import type { RegionCode } from '../../../../../shared/filters'
import type {
  DashboardStatusSnapshot,
  ProviderStatus,
  ProviderId,
  SystemStatus
} from '../../../../../shared/types'
import { PROVIDERS } from '../../../../../shared/types'
import { Input } from '../../components/ui/input'
import { cn } from '../../lib/utils'
import StatusBar from './StatusBar'
import { getStalenessInfo } from './staleness'

interface FeedFiltersProps {
  totalCount: number
  filteredCount: number
}

interface FeedFiltersPropsInternal extends FeedFiltersProps {
  availableBookmakers: string[]
}

function FeedFilters({
  totalCount,
  filteredCount,
  availableBookmakers
}: FeedFiltersPropsInternal): React.JSX.Element {
  const [filterState, setFilterState] = React.useState(() => useFeedFiltersStore.getState())

  React.useEffect(() => {
    const unsubscribe = useFeedFiltersStore.subscribe((nextState) => {
      setFilterState(nextState)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const {
    regions,
    sports,
    markets,
    bookmakers,
    minRoi,
    toggleRegion,
    toggleSport,
    toggleMarket,
    toggleBookmaker,
    setMinRoi,
    resetFilters
  } = filterState

  const hasActiveRoi = minRoi > 0
  const hasNonDefaultRegions =
    regions.length !== ALL_REGION_CODES.length ||
    !ALL_REGION_CODES.every((code) => regions.includes(code))
  const hasNonDefaultSports =
    sports.length !== ALL_SPORT_FILTERS.length ||
    !ALL_SPORT_FILTERS.every((sport) => sports.includes(sport))
  const hasNonDefaultMarkets =
    markets.length !== ALL_MARKET_FILTERS.length ||
    !ALL_MARKET_FILTERS.every((market) => markets.includes(market))
  const hasBookmakerFilters = Array.isArray(bookmakers) && bookmakers.length > 0

  const hasActiveFilters =
    hasNonDefaultRegions ||
    hasNonDefaultSports ||
    hasNonDefaultMarkets ||
    hasBookmakerFilters ||
    hasActiveRoi

  const handleToggleRegion = (region: RegionCode): void => {
    toggleRegion(region)
  }

  const handleToggleSport = (sport: SportFilterValue): void => {
    toggleSport(sport)
  }

  const handleToggleMarket = (market: MarketFilterValue): void => {
    toggleMarket(market)
  }

  const handleToggleBookmaker = (bookmaker: string): void => {
    toggleBookmaker(bookmaker)
  }

  const handleMinRoiChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value.trim()

    if (!value) {
      setMinRoi(0)
      return
    }

    const numeric = Number.parseFloat(value)

    if (!Number.isFinite(numeric) || numeric <= 0) {
      setMinRoi(0)
      return
    }

    setMinRoi(numeric / 100)
  }

  const minRoiPercent = hasActiveRoi ? (minRoi * 100).toFixed(1) : ''

  const renderFilterChip = (
    label: string,
    active: boolean,
    onClick: () => void,
    testId: string
  ): React.JSX.Element => {
    return (
      <button
        key={testId}
        type="button"
        className={cn(
          'rounded-full border px-2 py-[2px] text-[9px] font-medium',
          active
            ? 'border-ot-accent bg-ot-accent/20 text-ot-accent'
            : 'border-white/20 text-ot-foreground/60 hover:border-ot-accent/60 hover:text-ot-accent'
        )}
        data-testid={testId}
        aria-pressed={active ? 'true' : 'false'}
        onClick={onClick}
      >
        {label}
      </button>
    )
  }

  return (
    <section
      className="mb-2 space-y-2 border-b border-white/10 pb-2 text-[10px]"
      aria-label="Feed filters"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ot-foreground/60">
          Filters
        </span>
        <span className="text-[10px] text-ot-foreground/60">
          {filteredCount} of {totalCount} shown
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-ot-foreground/60">Region</span>
          {(['AU', 'UK', 'IT', 'RO'] as RegionCode[]).map((code) =>
            renderFilterChip(
              code,
              regions.includes(code),
              () => handleToggleRegion(code),
              `feed-filters-region-${code}`
            )
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-ot-foreground/60">Sport</span>
          {(['soccer', 'tennis'] as SportFilterValue[]).map((sport) =>
            renderFilterChip(
              sport === 'soccer' ? 'Soccer' : 'Tennis',
              sports.includes(sport),
              () => handleToggleSport(sport),
              `feed-filters-sport-${sport}`
            )
          )}
        </div>

        {availableBookmakers.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] text-ot-foreground/60">Bookmaker</span>
            {availableBookmakers.map((name) =>
              renderFilterChip(
                name,
                bookmakers.includes(name),
                () => handleToggleBookmaker(name),
                `feed-filters-bookmaker-${name.replace(/[^a-zA-Z0-9]/g, '_')}`
              )
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-ot-foreground/60">Market</span>
          {(['moneyline', 'draw-no-bet', 'totals'] as MarketFilterValue[]).map((market) =>
            renderFilterChip(
              market === 'moneyline'
                ? 'Moneyline'
                : market === 'draw-no-bet'
                  ? 'Draw No Bet'
                  : 'Totals',
              markets.includes(market),
              () => handleToggleMarket(market),
              `feed-filters-market-${market}`
            )
          )}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-ot-foreground/60">Min ROI</span>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              className="h-6 w-16 px-1 py-0 text-[10px]"
              value={minRoiPercent}
              onChange={handleMinRoiChange}
              placeholder="0.0"
              min="0"
              step="0.5"
              data-testid="feed-filters-min-roi"
            />
            <span className="text-[10px] text-ot-foreground/60">%</span>
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center justify-between gap-2 text-[10px] text-ot-foreground/60">
          <span>Active filters applied.</span>
          <button
            type="button"
            className="text-[10px] text-ot-accent hover:underline"
            onClick={() => resetFilters()}
            data-testid="feed-filters-reset"
          >
            Reset
          </button>
        </div>
      )}
    </section>
  )
}

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
      className="mb-2 space-y-1 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-2 text-[10px] text-yellow-100"
      data-testid="provider-failure-banner"
      aria-label="Provider health issues"
    >
      <div className="font-semibold uppercase tracking-[0.14em]">Provider issues</div>
      <ul className="space-y-1">
        {problematic.map((entry) => (
          <li key={entry.providerId} className="leading-snug">
            <span className="font-semibold">
              {providerLabelById.get(entry.providerId as ProviderId) ?? entry.providerId}
            </span>
            <span className="mx-1">- {entry.status}</span>
            <span className="mx-1">
              Last success: {formatLastSuccess(entry.lastSuccessfulFetchAt, stalenessNow)}
            </span>
            <span className="block text-[9px] text-yellow-200/90">
              Recommended action: {getProviderRecommendedAction(entry.status as ProviderStatus)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FeedPane(): React.JSX.Element {
  const [feedState, setFeedState] = React.useState(() => useFeedStore.getState())
  const refreshSnapshot = useFeedStore((state) => state.refreshSnapshot)
  const syncSelectionWithVisibleIds = useFeedStore(
    (state) => state.syncSelectionWithVisibleIds
  )

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
    const seen = new Set<string>()
    const result: string[] = []

    const hasRegionFilter =
      regions.length !== ALL_REGION_CODES.length ||
      !ALL_REGION_CODES.every((code) => regions.includes(code))

    for (const opportunity of safeOpportunities) {
      const region = inferRegionFromOpportunity(opportunity)

      if (hasRegionFilter) {
        if (!region || !regions.includes(region)) {
          continue
        }
      }

      for (const leg of opportunity.legs) {
        const name = leg.bookmaker
        if (!seen.has(name)) {
          seen.add(name)
          result.push(name)
        }
      }
    }

    return result.sort((a, b) => a.localeCompare(b))
  }, [safeOpportunities, regions])

  const filteredOpportunities = React.useMemo(
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

  let content: React.ReactNode

  if (error && noUnderlyingData) {
    content = (
      <div
        className="flex h-full items-center justify-center text-[11px] text-red-400"
        role="status"
        data-testid="feed-error"
      >
        Unable to load opportunities. {error}
      </div>
    )
  } else if (isLoading && !hasUnderlyingData) {
    content = (
      <div
        className="flex h-full items-center justify-center text-[11px] text-ot-foreground/60"
        role="status"
        data-testid="feed-loading"
      >
        Loading opportunities...
      </div>
    )
  } else if (hasUnderlyingData && filteredCount === 0) {
    content = (
      <div
        className="flex h-full items-center justify-center text-[11px] text-ot-foreground/60"
        data-testid="feed-empty-filters"
      >
        No opportunities match the current filters.
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
          className="flex h-full flex-col items-center justify-center space-y-1 text-center text-[11px] text-yellow-100"
          data-testid="feed-empty-unhealthy"
        >
          <p>Data unavailable or stale. System health is degraded.</p>
          <p>
            Current status: <span className="font-semibold">{systemStatus}</span>
            {lastUpdatedLabel && (
              <span className="ml-1 text-[10px] text-yellow-200/90">(last update {lastUpdatedLabel})</span>
            )}
          </p>
        </div>
      )
    } else {
      const lastUpdatedLabel =
        fetchedAt != null
          ? getStalenessInfo({ foundAt: fetchedAt }, stalenessNow).label || ''
          : ''

      content = (
        <div
          className="flex h-full flex-col items-center justify-center space-y-1 text-center text-[11px] text-ot-foreground/60"
          data-testid="feed-empty-healthy"
        >
          <p>No current surebets. System and providers are healthy.</p>
          {lastUpdatedLabel && (
            <p className="text-[10px] text-ot-foreground/50">Last update {lastUpdatedLabel}.</p>
          )}
        </div>
      )
    }
  } else {
    content = <FeedTable opportunities={filteredOpportunities} stalenessNow={stalenessNow} />
  }

  return (
    <div className="flex h-full flex-col">
      <StatusBar stalenessNow={stalenessNow} statusSnapshot={status ?? null} fetchedAt={fetchedAt} />
      <ProviderFailureBanner statusSnapshot={status ?? null} stalenessNow={stalenessNow} />
      <FeedFilters
        totalCount={totalCount}
        filteredCount={filteredCount}
        availableBookmakers={availableBookmakersForRegions}
      />
      <div className="flex-1">{content}</div>
    </div>
  )
}

export default FeedPane
