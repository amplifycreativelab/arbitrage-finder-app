import * as React from 'react'

import type { DeepScanStatus } from '../../../../../shared/types'
import DeepScanButton from './DeepScanButton'
import DeepScanConfigDialog from './DeepScanConfigDialog'
import { useDeepScanStore } from './stores/deepScanStore'
import { useFeedFiltersStore } from './stores/feedFiltersStore'

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  if (totalSeconds < 60) {
    return `${totalSeconds}s`
  }
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds}s`
}

function statusPillClass(status: DeepScanStatus): string {
  switch (status) {
    case 'scanning':
      return 'border-ot-accent/60 bg-ot-accent/10 text-ot-accent'
    case 'completed':
      return 'border-emerald-400/60 bg-emerald-400/10 text-emerald-300'
    case 'cancelled':
      return 'border-amber-400/60 bg-amber-400/10 text-amber-300'
    case 'error':
      return 'border-red-400/60 bg-red-400/10 text-red-300'
    case 'idle':
    default:
      return 'border-ot-border bg-ot-border/40 text-ot-muted'
  }
}

function formatMinutesAgo(timestamp: string | null): string {
  if (!timestamp) return 'Never'
  const ms = new Date(timestamp).getTime()
  if (!Number.isFinite(ms)) return 'Unknown'
  const diffMs = Math.max(0, Date.now() - ms)
  const diffMinutes = Math.floor(diffMs / 60_000)
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes === 1) return '1m ago'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const hours = Math.floor(diffMinutes / 60)
  if (hours === 1) return '1h ago'
  return `${hours}h ago`
}

export function DeepScanPanel(): React.JSX.Element {
  const progress = useDeepScanStore((state) => state.progress)
  const continuousStatus = useDeepScanStore((state) => state.continuousStatus)
  const isDialogOpen = useDeepScanStore((state) => state.isDialogOpen)
  const lastConfig = useDeepScanStore((state) => state.lastConfig)
  const isPausing = useDeepScanStore((state) => state.isPausing)
  const setDialogOpen = useDeepScanStore((state) => state.setDialogOpen)
  const startScan = useDeepScanStore((state) => state.startScan)
  const refreshStatus = useDeepScanStore((state) => state.refreshStatus)
  const setContinuousEnabledRemote = useDeepScanStore((state) => state.setContinuousEnabled)
  const setMaxEventsRemote = useDeepScanStore((state) => state.setMaxEventsPerCycle)
  const pauseContinuous = useDeepScanStore((state) => state.pauseContinuous)
  const resumeContinuous = useDeepScanStore((state) => state.resumeContinuous)

  const continuousEnabled = useFeedFiltersStore((state) => state.continuousDeepScanEnabled)
  const setContinuousEnabledLocal = useFeedFiltersStore((state) => state.setContinuousDeepScanEnabled)
  const continuousMaxEvents = useFeedFiltersStore((state) => state.continuousDeepScanMaxEventsPerCycle)
  const setContinuousMaxEventsLocal = useFeedFiltersStore((state) => state.setContinuousDeepScanMaxEventsPerCycle)
  const cacheTtl = useFeedFiltersStore((state) => state.deepScanCacheTtlMinutes)
  const setCacheTtlLocal = useFeedFiltersStore((state) => state.setDeepScanCacheTtlMinutes)
  const batchSize = useFeedFiltersStore((state) => state.deepScanBatchSize)
  const setBatchSizeLocal = useFeedFiltersStore((state) => state.setDeepScanBatchSize)
  const intervalMinutes = useFeedFiltersStore((state) => state.deepScanIntervalMinutes)
  const setIntervalMinutesLocal = useFeedFiltersStore((state) => state.setDeepScanIntervalMinutes)
  const concurrentRequests = useFeedFiltersStore((state) => state.deepScanConcurrentRequests)
  const setConcurrentRequestsLocal = useFeedFiltersStore((state) => state.setDeepScanConcurrentRequests)
  const scanScope = useFeedFiltersStore((state) => state.deepScanScope)
  const setScanScopeLocal = useFeedFiltersStore((state) => state.setDeepScanScope)

  const [now, setNow] = React.useState(() => Date.now())
  const [maxEventsInput, setMaxEventsInput] = React.useState(() => String(continuousMaxEvents))
  const [cacheTtlInput, setCacheTtlInput] = React.useState(() => String(cacheTtl))
  const [batchSizeInput, setBatchSizeInput] = React.useState(() => String(batchSize))
  const [intervalInput, setIntervalInput] = React.useState(() => String(intervalMinutes))
  const [concurrentRequestsInput, setConcurrentRequestsInput] = React.useState(() => String(concurrentRequests))
  const [isClearingBookmakers, setIsClearingBookmakers] = React.useState(false)

  React.useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  React.useEffect(() => {
    if (continuousStatus.enabled !== continuousEnabled) {
      setContinuousEnabledLocal(continuousStatus.enabled)
    }
  }, [continuousStatus.enabled, continuousEnabled, setContinuousEnabledLocal])

  React.useEffect(() => {
    if (continuousStatus.maxEventsPerCycle !== continuousMaxEvents) {
      setContinuousMaxEventsLocal(continuousStatus.maxEventsPerCycle)
    }
  }, [continuousStatus.maxEventsPerCycle, continuousMaxEvents, setContinuousMaxEventsLocal])

  React.useEffect(() => {
    if (continuousStatus.cacheTtlMinutes !== undefined && continuousStatus.cacheTtlMinutes !== cacheTtl) {
      setCacheTtlLocal(continuousStatus.cacheTtlMinutes)
    }
  }, [continuousStatus.cacheTtlMinutes, cacheTtl, setCacheTtlLocal])

  React.useEffect(() => {
    if (continuousStatus.batchSize !== undefined && continuousStatus.batchSize !== batchSize) {
      setBatchSizeLocal(continuousStatus.batchSize)
    }
  }, [continuousStatus.batchSize, batchSize, setBatchSizeLocal])

  React.useEffect(() => {
    if (continuousStatus.intervalMinutes !== undefined && continuousStatus.intervalMinutes !== intervalMinutes) {
      setIntervalMinutesLocal(continuousStatus.intervalMinutes)
    }
  }, [continuousStatus.intervalMinutes, intervalMinutes, setIntervalMinutesLocal])

  React.useEffect(() => {
    if (continuousStatus.concurrentRequests !== undefined && continuousStatus.concurrentRequests !== concurrentRequests) {
      setConcurrentRequestsLocal(continuousStatus.concurrentRequests)
    }
  }, [continuousStatus.concurrentRequests, concurrentRequests, setConcurrentRequestsLocal])

  React.useEffect(() => {
    if (continuousStatus.scanScope !== undefined && continuousStatus.scanScope !== scanScope) {
      setScanScopeLocal(continuousStatus.scanScope)
    }
  }, [continuousStatus.scanScope, scanScope, setScanScopeLocal])

  React.useEffect(() => {
    setMaxEventsInput(String(continuousMaxEvents))
  }, [continuousMaxEvents])

  React.useEffect(() => {
    setCacheTtlInput(String(cacheTtl))
  }, [cacheTtl])

  React.useEffect(() => {
    setBatchSizeInput(String(batchSize))
  }, [batchSize])

  React.useEffect(() => {
    setIntervalInput(String(intervalMinutes))
  }, [intervalMinutes])

  React.useEffect(() => {
    setConcurrentRequestsInput(String(concurrentRequests))
  }, [concurrentRequests])

  React.useEffect(() => {
    if (progress.status !== 'scanning' || !progress.startedAt) {
      return
    }
    const handle = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(handle)
  }, [progress.status, progress.startedAt])

  const startedAtMs = progress.startedAt ? new Date(progress.startedAt).getTime() : 0
  const elapsedMs =
    progress.status === 'scanning' && startedAtMs > 0
      ? Math.max(0, now - startedAtMs)
      : progress.elapsedMs

  const eventsTotalSafe = progress.eventsTotal > 0 ? progress.eventsTotal : progress.eventsScanned

  const isContinuousMode = progress.mode === 'continuous'

  const handleContinuousToggle = (enabled: boolean): void => {
    setContinuousEnabledLocal(enabled)
    void setContinuousEnabledRemote(enabled)
  }

  const handleNumericInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    commit: () => void
  ): void => {
    if (event.key !== 'Enter') {
      return
    }
    event.preventDefault()
    commit()
    event.currentTarget.blur()
  }

  const handleMaxEventsChange = (value: number): void => {
    setContinuousMaxEventsLocal(value)
    void setMaxEventsRemote(value)
  }

  const commitMaxEventsInput = (): void => {
    const parsed = Number(maxEventsInput)
    if (!Number.isFinite(parsed)) {
      setMaxEventsInput(String(continuousMaxEvents))
      return
    }
    handleMaxEventsChange(parsed)
  }

  const handleCacheTtlChange = async (value: number): Promise<void> => {
    setCacheTtlLocal(value)
    try {
      await window.api.deepScan.setCacheTtl(value)
    } catch {
      // Best-effort sync
    }
  }

  const commitCacheTtlInput = (): void => {
    const parsed = Number(cacheTtlInput)
    if (!Number.isFinite(parsed)) {
      setCacheTtlInput(String(cacheTtl))
      return
    }
    void handleCacheTtlChange(parsed)
  }

  const handleBatchSizeChange = async (value: number): Promise<void> => {
    setBatchSizeLocal(value)
    try {
      await window.api.deepScan.setBatchSize(value)
    } catch {
      // Best-effort sync
    }
  }

  const commitBatchSizeInput = (): void => {
    const parsed = Number(batchSizeInput)
    if (!Number.isFinite(parsed)) {
      setBatchSizeInput(String(batchSize))
      return
    }
    void handleBatchSizeChange(parsed)
  }

  const handleIntervalChange = async (value: number): Promise<void> => {
    setIntervalMinutesLocal(value)
    try {
      await window.api.deepScan.setIntervalMinutes(value)
    } catch {
      // Best-effort sync
    }
  }

  const commitIntervalInput = (): void => {
    const parsed = Number(intervalInput)
    if (!Number.isFinite(parsed)) {
      setIntervalInput(String(intervalMinutes))
      return
    }
    void handleIntervalChange(parsed)
  }

  const handleConcurrentRequestsChange = async (value: number): Promise<void> => {
    setConcurrentRequestsLocal(value)
    try {
      await window.api.deepScan.setConcurrentRequests(value)
    } catch {
      // Best-effort sync
    }
  }

  const commitConcurrentRequestsInput = (): void => {
    const parsed = Number(concurrentRequestsInput)
    if (!Number.isFinite(parsed)) {
      setConcurrentRequestsInput(String(concurrentRequests))
      return
    }
    void handleConcurrentRequestsChange(parsed)
  }

  const handleScanScopeChange = async (value: 'all-sports' | 'selected-sports' | 'selected-leagues'): Promise<void> => {
    setScanScopeLocal(value)
    try {
      await window.api.deepScan.setScanScope(value)
    } catch {
      // Best-effort sync
    }
  }

  const handleClearCache = async (): Promise<void> => {
    try {
      await window.api.deepScan.clearCache('user_request')
      void refreshStatus()
    } catch {
      // Best-effort
    }
  }

  const getOddsApiIoApi = (): (typeof window.api)['oddsApiIo'] | null => {
    return (window as unknown as { api?: { oddsApiIo?: (typeof window.api)['oddsApiIo'] } }).api
      ?.oddsApiIo ?? null
  }

  const handleClearSelectedBookmakers = async (): Promise<void> => {
    const oddsApiIo = getOddsApiIoApi()
    if (!oddsApiIo) {
      window.alert('Odds-API.io API bridge is not available. Restart the app and try again.')
      return
    }

    const ok = window.confirm(
      'Clear your Odds-API.io selected bookmakers?\n\nNote: Odds-API.io limits clearing to once every 12 hours.'
    )
    if (!ok) return

    setIsClearingBookmakers(true)
    try {
      await oddsApiIo.clearSelectedBookmakers()
      void refreshStatus()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to clear selected bookmakers.')
    } finally {
      setIsClearingBookmakers(false)
    }
  }

  const handlePauseResume = async (): Promise<void> => {
    if (continuousStatus.isPaused) {
      await resumeContinuous()
    } else {
      await pauseContinuous()
    }
  }

  // Quota warning calculation
  const quotaPercent = continuousStatus.quotaStatus?.percentUsed ?? 0
  const showQuotaWarning = quotaPercent >= 0.8
  const showQuotaDanger = quotaPercent >= 0.9

  return (
    <section
      className="rounded-md border border-ot-border bg-ot-background/60 p-3"
      data-testid="deep-scan-panel"
      aria-label="Deep scan panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ot-accent">
            Deep Scan
          </span>
              <span
                className={`rounded-full border px-2 py-[2px] text-[9px] font-semibold uppercase tracking-[0.12em] ${statusPillClass(
                  progress.status
                )}`}
              >
                {progress.status}
              </span>
              {isContinuousMode && (
                <span className="rounded-full border border-sky-400/60 bg-sky-400/10 px-2 py-[2px] text-[9px] font-semibold uppercase tracking-[0.12em] text-sky-200">
                  Continuous
                </span>
              )}
            </div>
            <DeepScanButton />
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded border border-ot-border/60 bg-ot-border/10 p-2">
              <div>
                <div className="text-[10px] font-semibold text-ot-foreground">Continuous Deep Scan</div>
                <div className="text-[9px] text-ot-muted">
                  Automatically scan after each poll
                </div>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-[9px] uppercase tracking-[0.12em] text-ot-muted">
                <input
                  type="checkbox"
                  role="switch"
                  aria-checked={continuousEnabled}
                  checked={continuousEnabled}
                  onChange={(event) => handleContinuousToggle(event.target.checked)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleContinuousToggle(!continuousEnabled)
                    }
                  }}
                  className="h-4 w-4 cursor-pointer rounded border border-ot-border/80 bg-ot-surface accent-ot-accent"
                />
                {continuousEnabled ? 'On' : 'Off'}
              </label>
            </div>
            <div className="flex items-center justify-between gap-3 rounded border border-ot-border/60 bg-ot-border/10 p-2">
              <div>
                <div className="text-[10px] font-semibold text-ot-foreground">Scan Scope</div>
                <div className="text-[9px] text-ot-muted">
                  Which events to scan
                </div>
              </div>
              <select
                value={scanScope}
                onChange={(event) => void handleScanScopeChange(event.target.value as 'all-sports' | 'selected-sports' | 'selected-leagues')}
                className="h-7 rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground"
                aria-label="Scan scope selection"
              >
                <option value="all-sports">All Sports</option>
                <option value="selected-sports">Selected Sports</option>
                <option value="selected-leagues">Selected Leagues</option>
              </select>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div className="flex items-center justify-between gap-3 rounded border border-ot-border/60 bg-ot-border/10 p-2">
              <div>
                <div className="text-[10px] font-semibold text-ot-foreground">Scan Interval</div>
                <div className="text-[9px] text-ot-muted">Minutes</div>
              </div>
              <input
                type="number"
                min={1}
                max={30}
                value={intervalInput}
                onChange={(event) => setIntervalInput(event.target.value)}
                onBlur={commitIntervalInput}
                onKeyDown={(event) => handleNumericInputKeyDown(event, commitIntervalInput)}
                className="h-7 w-14 rounded border border-ot-border bg-ot-surface px-2 text-right text-[11px] text-ot-foreground"
                aria-label="Scan interval in minutes"
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded border border-ot-border/60 bg-ot-border/10 p-2">
              <div>
                <div className="text-[10px] font-semibold text-ot-foreground">Max Events</div>
                <div className="text-[9px] text-ot-muted">Per cycle</div>
              </div>
              <input
                type="number"
                min={1}
                max={500}
                value={maxEventsInput}
                onChange={(event) => setMaxEventsInput(event.target.value)}
                onBlur={commitMaxEventsInput}
                onKeyDown={(event) => handleNumericInputKeyDown(event, commitMaxEventsInput)}
                className="h-7 w-14 rounded border border-ot-border bg-ot-surface px-2 text-right text-[11px] text-ot-foreground"
                aria-label="Max events per continuous scan cycle"
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded border border-ot-border/60 bg-ot-border/10 p-2">
              <div>
                <div className="text-[10px] font-semibold text-ot-foreground">Concurrency</div>
                <div className="text-[9px] text-ot-muted">Parallel</div>
              </div>
              <input
                type="number"
                min={1}
                max={10}
                value={concurrentRequestsInput}
                onChange={(event) => setConcurrentRequestsInput(event.target.value)}
                onBlur={commitConcurrentRequestsInput}
                onKeyDown={(event) => handleNumericInputKeyDown(event, commitConcurrentRequestsInput)}
                className="h-7 w-14 rounded border border-ot-border bg-ot-surface px-2 text-right text-[11px] text-ot-foreground"
                aria-label="Concurrent requests for scanning"
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded border border-ot-border/60 bg-ot-border/10 p-2">
              <div>
                <div className="text-[10px] font-semibold text-ot-foreground">Cache TTL</div>
                <div className="text-[9px] text-ot-muted">Minutes</div>
              </div>
              <input
                type="number"
                min={1}
                max={60}
                value={cacheTtlInput}
                onChange={(event) => setCacheTtlInput(event.target.value)}
                onBlur={commitCacheTtlInput}
                onKeyDown={(event) => handleNumericInputKeyDown(event, commitCacheTtlInput)}
                className="h-7 w-14 rounded border border-ot-border bg-ot-surface px-2 text-right text-[11px] text-ot-foreground"
                aria-label="Cache TTL in minutes"
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded border border-ot-border/60 bg-ot-border/10 p-2">
              <div>
                <div className="text-[10px] font-semibold text-ot-foreground">Batch Size</div>
                <div className="text-[9px] text-ot-muted">Events/batch</div>
              </div>
              <input
                type="number"
                min={5}
                max={50}
                value={batchSizeInput}
                onChange={(event) => setBatchSizeInput(event.target.value)}
                onBlur={commitBatchSizeInput}
                onKeyDown={(event) => handleNumericInputKeyDown(event, commitBatchSizeInput)}
                className="h-7 w-14 rounded border border-ot-border bg-ot-surface px-2 text-right text-[11px] text-ot-foreground"
                aria-label="Batch size for continuous scan"
              />
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-ot-muted sm:grid-cols-4">
            <div className="rounded border border-ot-border/60 bg-ot-border/10 p-2">
              <div className="text-[9px] uppercase tracking-[0.12em]">Events</div>
              <div className="text-[11px] font-semibold text-ot-foreground">
                {progress.eventsScanned}/{eventsTotalSafe}
          </div>
        </div>
        <div className="rounded border border-ot-border/60 bg-ot-border/10 p-2">
          <div className="text-[9px] uppercase tracking-[0.12em]">Requests</div>
          <div className="text-[11px] font-semibold text-ot-foreground">{progress.requestsMade}</div>
        </div>
        <div className="rounded border border-ot-border/60 bg-ot-border/10 p-2">
          <div className="text-[9px] uppercase tracking-[0.12em]">Arbs</div>
          <div className="text-[11px] font-semibold text-ot-foreground">
            {progress.opportunitiesFound}
          </div>
        </div>
        <div className="rounded border border-ot-border/60 bg-ot-border/10 p-2">
              <div className="text-[9px] uppercase tracking-[0.12em]">Elapsed</div>
              <div className="text-[11px] font-semibold text-ot-foreground">{formatElapsed(elapsedMs)}</div>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-ot-muted sm:grid-cols-5">
            <div className="rounded border border-ot-border/60 bg-ot-border/10 p-2">
              <div className="text-[9px] uppercase tracking-[0.12em]">Last scan</div>
              <div className="text-[11px] font-semibold text-ot-foreground">
                {formatMinutesAgo(continuousStatus.lastContinuousScanAt)}
              </div>
            </div>
            <div className="rounded border border-ot-border/60 bg-ot-border/10 p-2">
              <div className="text-[9px] uppercase tracking-[0.12em]">Today events</div>
              <div className="text-[11px] font-semibold text-ot-foreground">
                {continuousStatus.eventsScannedToday}
              </div>
            </div>
            <div className="rounded border border-ot-border/60 bg-ot-border/10 p-2">
              <div className="text-[9px] uppercase tracking-[0.12em]">Today arbs</div>
              <div className="text-[11px] font-semibold text-ot-foreground">
                {continuousStatus.opportunitiesFoundToday}
              </div>
            </div>
            <div className="rounded border border-ot-border/60 bg-ot-border/10 p-2">
              <div className="text-[9px] uppercase tracking-[0.12em]">Today requests</div>
              <div className="text-[11px] font-semibold text-ot-foreground">
                {continuousStatus.requestsToday}
              </div>
            </div>
            <div className="flex items-center justify-between rounded border border-ot-border/60 bg-ot-border/10 p-2">
              <div>
                <div className="text-[9px] uppercase tracking-[0.12em]">Cache</div>
                <div className="text-[11px] font-semibold text-ot-foreground">
                  {continuousStatus.cacheEntries} events
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleClearCache()}
                className="rounded border border-ot-border bg-ot-surface px-2 py-1 text-[9px] text-ot-muted hover:border-ot-accent hover:text-ot-accent"
                title="Clear scan cache"
              >
                Clear
              </button>
            </div>
            <div className="flex items-center justify-between rounded border border-ot-border/60 bg-ot-border/10 p-2">
              <div>
                <div className="text-[9px] uppercase tracking-[0.12em]">Bookmakers</div>
                <div className="text-[11px] font-semibold text-ot-foreground">Reset selection</div>
              </div>
              <button
                type="button"
                onClick={() => void handleClearSelectedBookmakers()}
                disabled={isClearingBookmakers}
                className="rounded border border-ot-border bg-ot-surface px-2 py-1 text-[9px] text-ot-muted hover:border-ot-accent hover:text-ot-accent disabled:opacity-60"
                title="Clear Odds-API.io selected bookmakers (12h limit)"
              >
                {isClearingBookmakers ? 'Clearing…' : 'Reset'}
              </button>
            </div>
          </div>

          {/* Story 7.6: Pause/Resume Button */}
          {continuousEnabled && (
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handlePauseResume()}
                disabled={isPausing}
                className={`rounded border px-3 py-1 text-[10px] font-semibold transition-colors ${
                  continuousStatus.isPaused
                    ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20'
                    : 'border-amber-400/60 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20'
                } disabled:opacity-50`}
              >
                {isPausing ? '...' : continuousStatus.isPaused ? '▶ Resume' : '⏸ Pause'}
              </button>
              {continuousStatus.isPaused && (
                <span className="text-[10px] text-amber-300">Continuous scan is paused</span>
              )}
            </div>
          )}

          {/* Story 7.6: Quota Status */}
          {showQuotaWarning && (
            <div className={`mt-2 rounded border px-2 py-1 text-[10px] ${
              showQuotaDanger
                ? 'border-red-400/60 bg-red-400/10 text-red-200'
                : 'border-amber-400/60 bg-amber-400/10 text-amber-200'
            }`}>
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>
                  API Quota: {Math.round(quotaPercent * 100)}% used 
                  ({continuousStatus.quotaStatus?.hourlyUsed ?? 0}/{continuousStatus.quotaStatus?.hourlyLimit ?? 5000} requests)
                  {continuousStatus.quotaStatus?.isThrottled && continuousStatus.quotaStatus?.throttleResumeAt && (
                    <span className="ml-1">
                      - Resuming {formatMinutesAgo(continuousStatus.quotaStatus.throttleResumeAt).replace(' ago', '')}
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-ot-border">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    showQuotaDanger ? 'bg-red-400' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.min(quotaPercent * 100, 100)}%` }}
                />
              </div>
              {continuousStatus.quotaStatus?.isThrottled && (
                <div className="mt-1 text-[9px] opacity-80">
                  Scan throttled - will resume when hourly quota resets
                </div>
              )}
            </div>
          )}

          {/* Story 7.6: Scan History */}
          {continuousStatus.history && continuousStatus.history.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[10px] text-ot-muted hover:text-ot-foreground">
                Scan History (last {continuousStatus.history.length} cycles)
              </summary>
              <div className="mt-1 space-y-1">
                {continuousStatus.history.map((entry, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded border border-ot-border/60 bg-ot-border/10 px-2 py-1 text-[9px]"
                  >
                    <span className={entry.mode === 'continuous' ? 'text-sky-300' : 'text-ot-foreground'}>
                      {entry.mode === 'continuous' ? 'Auto' : 'Manual'}
                    </span>
                    <span className="text-ot-muted">
                      {entry.eventsScanned} events, {entry.opportunitiesFound} arbs
                    </span>
                    <span className="text-ot-muted">{formatElapsed(entry.durationMs)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {progress.currentEventName && (
            <div className="mt-2 rounded border border-ot-border/60 bg-ot-border/10 px-2 py-1 text-[10px] text-ot-foreground">
              Scanning: <span className="font-semibold">{progress.currentEventName}</span>
            </div>
          )}

      {progress.errorMessage && progress.status === 'error' && (
        <div className="mt-2 rounded border border-red-400/60 bg-red-400/10 px-2 py-1 text-[10px] text-red-200">
          {progress.errorMessage}
        </div>
      )}

      <DeepScanConfigDialog
        open={isDialogOpen}
        initialConfig={lastConfig}
        onClose={() => setDialogOpen(false)}
        onStart={(config) => void startScan(config)}
      />
    </section>
  )
}

export default DeepScanPanel
