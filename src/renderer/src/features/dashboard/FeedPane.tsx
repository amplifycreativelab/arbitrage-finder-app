import * as React from 'react'

import { useFeedStore, type FeedSortKey, type FeedSortDirection } from './stores/feedStore'
import { useFeedFiltersStore } from './stores/feedFiltersStore'
import { useDeepScanStore } from './stores/deepScanStore'
import { useStalenessTicker } from './useStalenessTicker'
import { useAutoRefresh } from './hooks/useAutoRefresh'
import { applyDashboardFilters } from './filters'
import type { ArbitrageOpportunity } from '../../../../../shared/types'
import type { AggressiveScanSelection } from '../../../../../shared/aggressiveScanPresets'

import StatusBar from './StatusBar'
import { FeedToolbar } from './components/FeedToolbar'
import { FeedResultsHeader } from './components/FeedResultsHeader'
import { SurebetTable } from './components/SurebetTable'
import { FilterSidebar } from './components/FilterSidebar'
import SignalPreview from './SignalPreview'
import { AggressiveScanPresetDialog } from './AggressiveScanPresetDialog'
import { DeepScanConfigDialog } from './DeepScanConfigDialog'
import { Button } from '../../components/ui/button'

// Notification type for scan actions
interface Notification {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

// ScanActionButtons component
interface ScanActionButtonsProps {
  onAggressiveScan: () => void
  onDeepScan: () => void
  isAggressiveScanning: boolean
  isDeepScanning: boolean
  deepScanProgress: ReturnType<typeof useDeepScanStore.getState>['progress']
  continuousEnabled: boolean
  continuousActive: boolean
  onToggleContinuous: () => void
  isContinuousUpdating: boolean
}

function ScanActionButtons({
  onAggressiveScan,
  onDeepScan,
  isAggressiveScanning,
  isDeepScanning,
  deepScanProgress,
  continuousEnabled,
  continuousActive,
  onToggleContinuous,
  isContinuousUpdating
}: ScanActionButtonsProps): React.JSX.Element {
  const isAnyScanning = isAggressiveScanning || isDeepScanning || deepScanProgress.status === 'scanning'

  return (
    <div className="flex items-center gap-2 py-2 px-3 border-t border-ot-border bg-ot-surface">
      {/* Continuous Scan Toggle */}
      <button
        type="button"
        onClick={onToggleContinuous}
        disabled={isContinuousUpdating}
        className={`
          relative inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-medium transition-all
          ${continuousEnabled
            ? 'bg-emerald-500/10 border border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/20'
            : 'bg-ot-surface border border-ot-border text-ot-muted hover:bg-ot-surface-hover hover:text-ot-foreground'
          }
          ${isContinuousUpdating ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        data-testid="continuous-scan-toggle"
        title={continuousEnabled ? 'Auto-fetch is ON - Click to disable' : 'Auto-fetch is OFF - Click to enable'}
      >
        {/* Status indicator dot */}
        <span
          className={`h-2 w-2 rounded-full ${
            continuousActive
              ? 'bg-emerald-500 animate-pulse'
              : continuousEnabled
                ? 'bg-emerald-500'
                : 'bg-ot-muted'
          }`}
        />
        {isContinuousUpdating ? (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <span>Auto</span>
        )}
        {/* ON/OFF label */}
        <span className={`text-[10px] font-bold ${continuousEnabled ? 'text-emerald-600' : 'text-ot-muted'}`}>
          {continuousEnabled ? 'ON' : 'OFF'}
        </span>
      </button>

      <div className="h-4 w-px bg-ot-border" />

      <Button
        variant="outline"
        size="sm"
        onClick={onAggressiveScan}
        disabled={isAnyScanning}
        loading={isAggressiveScanning}
        className="border-amber-500/50 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
        data-testid="aggressive-scan-button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 mr-1.5"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        Aggressive Scan
      </Button>

      <Button
        variant="primary"
        size="sm"
        onClick={onDeepScan}
        disabled={isAnyScanning}
        loading={isDeepScanning || deepScanProgress.status === 'scanning'}
        data-testid="deep-scan-button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 mr-1.5"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        {deepScanProgress.status === 'scanning' ? 'Scanning...' : 'Deep Scan'}
      </Button>

      {deepScanProgress.status === 'scanning' && (
        <div className="flex items-center gap-2 text-xs text-ot-muted ml-2">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-ot-border border-t-ot-accent" />
          {deepScanProgress.eventsScanned}/{deepScanProgress.eventsTotal || '?'} events
          {deepScanProgress.opportunitiesFound > 0 && (
            <span className="text-ot-accent">({deepScanProgress.opportunitiesFound} found)</span>
          )}
        </div>
      )}
    </div>
  )
}

// Notification Toast component
interface NotificationToastProps {
  notifications: Notification[]
  onDismiss: (id: string) => void
}

function NotificationToast({ notifications, onDismiss }: NotificationToastProps): React.JSX.Element {
  React.useEffect(() => {
    notifications.forEach((notification) => {
      const timer = setTimeout(() => {
        onDismiss(notification.id)
      }, 4000)
      return () => clearTimeout(timer)
    })
  }, [notifications, onDismiss])

  if (notifications.length === 0) return <></>

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg animate-fade-in ${
            notification.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
              : notification.type === 'error'
                ? 'border-red-500/30 bg-red-500/10 text-red-700'
                : 'border-ot-accent/30 bg-ot-accent/10 text-ot-accent'
          }`}
          data-testid={`notification-${notification.type}`}
        >
          {notification.type === 'success' && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {notification.type === 'error' && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          )}
          {notification.type === 'info' && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          )}
          <span className="text-sm font-medium">{notification.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(notification.id)}
            className="ml-2 text-current opacity-60 hover:opacity-100"
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}

function FeedPane(): React.JSX.Element {
  const [feedState, setFeedState] = React.useState(() => useFeedStore.getState())
  const refreshSnapshot = useFeedStore((state) => state.refreshSnapshot)
  const syncSelectionWithVisibleIds = useFeedStore((state) => state.syncSelectionWithVisibleIds)
  const selectedOpportunityId = useFeedStore((state) => state.selectedOpportunityId)
  const setSelectedOpportunityId = useFeedStore((state) => state.setSelectedOpportunityId)

  // Deep scan store
  const deepScanStore = useDeepScanStore()
  const {
    setDialogOpen,
    isDialogOpen,
    lastConfig,
    progress: deepScanProgress,
    startScan,
    continuousStatus,
    setContinuousEnabled,
    isContinuousUpdating,
    refreshContinuousStatus
  } = deepScanStore

  // Search query state
  const [searchQuery, setSearchQuery] = React.useState('')

  // Expanded row state
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  // Sort state
  const [sortBy, setSortBy] = React.useState<FeedSortKey>('roi')
  const [sortDirection, setSortDirection] = React.useState<FeedSortDirection>('desc')

  // Notification state
  const [notifications, setNotifications] = React.useState<Notification[]>([])

  // Aggressive scan dialog state
  const [showAggressivePresetDialog, setShowAggressivePresetDialog] = React.useState(false)

  // Scan loading states
  const [isAggressiveScanning, setIsAggressiveScanning] = React.useState(false)

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

  // Apply search filter
  const searchFiltered = React.useMemo(() => {
    if (!searchQuery.trim()) return dashboardFiltered

    const query = searchQuery.toLowerCase()
    return dashboardFiltered.filter((opp: ArbitrageOpportunity) => {
      const eventName = opp.event.name.toLowerCase()
      const league = opp.event.league?.toLowerCase() || ''
      const bookmakerNames = opp.legs.map((leg) => leg.bookmaker.toLowerCase()).join(' ')
      const market = opp.legs[0]?.market?.toLowerCase() || ''

      return (
        eventName.includes(query) ||
        league.includes(query) ||
        bookmakerNames.includes(query) ||
        market.includes(query)
      )
    })
  }, [dashboardFiltered, searchQuery])

  // Sync selection with visible IDs
  React.useEffect(() => {
    const visibleIds = Array.isArray(searchFiltered)
      ? searchFiltered.map((opportunity) => opportunity.id)
      : []

    syncSelectionWithVisibleIds(visibleIds)
  }, [searchFiltered, syncSelectionWithVisibleIds])

  const totalCount = safeOpportunities.length
  const filteredCount = Array.isArray(searchFiltered) ? searchFiltered.length : 0
  const hasUnderlyingData = totalCount > 0
  const noUnderlyingData = !hasUnderlyingData

  // Extract unique bookmakers from all opportunities
  const availableBookmakers = React.useMemo(() => {
    const bookmakerSet = new Set<string>()
    for (const opp of safeOpportunities) {
      for (const leg of opp.legs) {
        if (leg.bookmaker) {
          bookmakerSet.add(leg.bookmaker)
        }
      }
    }
    return Array.from(bookmakerSet).sort()
  }, [safeOpportunities])

  // Handle sort change
  const handleSortChange = (key: FeedSortKey, direction: FeedSortDirection): void => {
    setSortBy(key)
    setSortDirection(direction)
  }

  // Handle row selection
  const handleSelect = (id: string): void => {
    setSelectedOpportunityId(id)
  }

  // Handle row expand toggle
  const handleToggleExpand = (id: string): void => {
    setExpandedId((current) => (current === id ? null : id))
  }

  // Handle aggressive scan
  const handleAggressiveScan = (): void => {
    setShowAggressivePresetDialog(true)
  }

  const startAggressiveScan = async (selection: AggressiveScanSelection): Promise<void> => {
    setShowAggressivePresetDialog(false)
    setIsAggressiveScanning(true)

    try {
      // Start aggressive scan with selected presets/leagues
      await window.api.deepScan.startAggressiveScanWithSelection(selection)

      addNotification({
        id: Date.now().toString(),
        message: `Aggressive scan started with ${selection.presetIds.length} preset(s)`,
        type: 'success'
      })
    } catch (err) {
      addNotification({
        id: Date.now().toString(),
        message: 'Failed to start aggressive scan',
        type: 'error'
      })
    } finally {
      setIsAggressiveScanning(false)
    }
  }

  // Handle deep scan
  const handleDeepScan = (): void => {
    setDialogOpen(true)
  }

  // Handle continuous scan toggle
  const handleToggleContinuous = async (): Promise<void> => {
    const newEnabled = !continuousStatus.enabled
    await setContinuousEnabled(newEnabled)

    addNotification({
      id: Date.now().toString(),
      message: newEnabled ? 'Auto-fetch enabled' : 'Auto-fetch disabled',
      type: 'info'
    })
  }

  // Refresh continuous status on mount
  React.useEffect(() => {
    void refreshContinuousStatus()
  }, [refreshContinuousStatus])

  // Notification helper
  const addNotification = (notification: Notification): void => {
    setNotifications((prev) => [...prev, notification])
  }

  const dismissNotification = (id: string): void => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  // Empty state content
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
          onClick={() => {
            useFeedFiltersStore.getState().resetFilters()
            setSearchQuery('')
          }}
        >
          Reset All Filters
        </button>
      </div>
    )
  } else if (noUnderlyingData) {
    content = (
      <div
        className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-ot-border/60 bg-ot-surface p-6 text-center"
        data-testid="feed-empty"
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
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div className="text-[12px] font-medium text-ot-foreground">No surebets found</div>
        <div className="text-[11px] text-ot-muted">
          Try running a scan to find arbitrage opportunities
        </div>
      </div>
    )
  } else {
    content = (
      <SurebetTable
        opportunities={searchFiltered}
        selectedId={selectedOpportunityId}
        expandedId={expandedId}
        onSelect={handleSelect}
        onToggleExpand={handleToggleExpand}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
      />
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* StatusBar at top */}
      <div className="px-3 pt-3">
        <StatusBar stalenessNow={stalenessNow} statusSnapshot={status ?? null} fetchedAt={fetchedAt} />
      </div>

      {/* Main 2-column layout */}
      <div className="flex flex-1 min-h-0 gap-3 p-3">
        {/* Left column - Feed */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden rounded-lg border border-ot-border bg-ot-surface">
          {/* FeedToolbar with search */}
          <FeedToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClearAll={() => {
              // Clear all opportunities logic here
              addNotification({
                id: Date.now().toString(),
                message: 'All opportunities cleared',
                type: 'info'
              })
            }}
          />

          {/* FeedResultsHeader */}
          <FeedResultsHeader
            count={totalCount}
            filteredCount={filteredCount}
            fetchedAt={fetchedAt}
            stalenessNow={stalenessNow}
            isLoading={isLoading}
          />

          {/* SurebetTable or empty state */}
          <div className="flex-1 min-h-0 overflow-hidden">{content}</div>

          {/* SignalPreview inline when opportunity selected */}
          {selectedOpportunityId && filteredCount > 0 && (
            <div className="border-t border-ot-border h-64 shrink-0">
              <div className="h-full p-3">
                <SignalPreview />
              </div>
            </div>
          )}

          {/* ScanActionButtons at bottom */}
          <ScanActionButtons
            onAggressiveScan={handleAggressiveScan}
            onDeepScan={handleDeepScan}
            isAggressiveScanning={isAggressiveScanning}
            isDeepScanning={deepScanStore.isStarting}
            deepScanProgress={deepScanProgress}
            continuousEnabled={continuousStatus.enabled}
            continuousActive={continuousStatus.isActive}
            onToggleContinuous={handleToggleContinuous}
            isContinuousUpdating={isContinuousUpdating}
          />
        </div>

        {/* Right column - FilterSidebar (320px width) */}
        <div className="w-[320px] shrink-0 overflow-hidden rounded-lg border border-ot-border bg-ot-surface">
          <FilterSidebar
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            totalCount={totalCount}
            filteredCount={filteredCount}
            availableBookmakers={availableBookmakers}
          />
        </div>
      </div>

      {/* Aggressive Scan Preset Dialog */}
      <AggressiveScanPresetDialog
        open={showAggressivePresetDialog}
        onClose={() => setShowAggressivePresetDialog(false)}
        onStart={startAggressiveScan}
      />

      {/* Deep Scan Config Dialog */}
      <DeepScanConfigDialog
        open={isDialogOpen}
        initialConfig={lastConfig}
        onClose={() => setDialogOpen(false)}
        onStart={startScan}
      />

      {/* Notification Toasts */}
      <NotificationToast notifications={notifications} onDismiss={dismissNotification} />
    </div>
  )
}

export default FeedPane



