import * as React from 'react'

import { SportLeagueFilter } from '../../dashboard/SportLeagueFilter'
import { useDeepScanStore } from '../../dashboard/stores/deepScanStore'
import { useFeedFiltersStore } from '../../dashboard/stores/feedFiltersStore'

export function DeepScanConfigSection(): React.JSX.Element {
  const continuousStatus = useDeepScanStore((state) => state.continuousStatus)
  const refreshContinuousStatus = useDeepScanStore((state) => state.refreshContinuousStatus)
  const setContinuousEnabledRemote = useDeepScanStore((state) => state.setContinuousEnabled)
  const setMaxEventsRemote = useDeepScanStore((state) => state.setMaxEventsPerCycle)

  const continuousEnabled = useFeedFiltersStore((state) => state.continuousDeepScanEnabled)
  const setContinuousEnabledLocal = useFeedFiltersStore((state) => state.setContinuousDeepScanEnabled)
  const continuousMaxEvents = useFeedFiltersStore((state) => state.continuousDeepScanMaxEventsPerCycle)
  const setContinuousMaxEventsLocal = useFeedFiltersStore((state) => state.setContinuousDeepScanMaxEventsPerCycle)
  const cacheTtl = useFeedFiltersStore((state) => state.deepScanCacheTtlMinutes)
  const setCacheTtlLocal = useFeedFiltersStore((state) => state.setDeepScanCacheTtlMinutes)
  const intervalMinutes = useFeedFiltersStore((state) => state.deepScanIntervalMinutes)
  const setIntervalMinutesLocal = useFeedFiltersStore((state) => state.setDeepScanIntervalMinutes)
  const concurrentRequests = useFeedFiltersStore((state) => state.deepScanConcurrentRequests)
  const setConcurrentRequestsLocal = useFeedFiltersStore((state) => state.setDeepScanConcurrentRequests)
  const scanScope = useFeedFiltersStore((state) => state.deepScanScope)
  const setScanScopeLocal = useFeedFiltersStore((state) => state.setDeepScanScope)

  const [maxEventsInput, setMaxEventsInput] = React.useState(() => String(continuousMaxEvents))
  const [cacheTtlInput, setCacheTtlInput] = React.useState(() => String(cacheTtl))
  const [intervalInput, setIntervalInput] = React.useState(() => String(intervalMinutes))
  const [concurrentRequestsInput, setConcurrentRequestsInput] = React.useState(() => String(concurrentRequests))

  const [enabledSports, setEnabledSports] = React.useState<string[]>([])
  const [enabledLeagues, setEnabledLeagues] = React.useState<string[]>([])

  React.useEffect(() => {
    void refreshContinuousStatus()
    void (async () => {
      try {
        const [sports, leagues] = await Promise.all([
          window.api.deepScan.getEnabledSportsFilter(),
          window.api.deepScan.getEnabledLeaguesFilter()
        ])
        setEnabledSports(sports)
        setEnabledLeagues(leagues)
      } catch {
        // Silent fail
      }
    })()
  }, [refreshContinuousStatus])

  React.useEffect(() => {
    setMaxEventsInput(String(continuousMaxEvents))
  }, [continuousMaxEvents])

  React.useEffect(() => {
    setCacheTtlInput(String(cacheTtl))
  }, [cacheTtl])

  React.useEffect(() => {
    setIntervalInput(String(intervalMinutes))
  }, [intervalMinutes])

  React.useEffect(() => {
    setConcurrentRequestsInput(String(concurrentRequests))
  }, [concurrentRequests])

  const handleContinuousToggle = (enabled: boolean): void => {
    setContinuousEnabledLocal(enabled)
    void setContinuousEnabledRemote(enabled)
  }

  const handleNumericInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    commit: () => void
  ): void => {
    if (event.key !== 'Enter') return
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
      // Best-effort
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

  const handleIntervalChange = async (value: number): Promise<void> => {
    setIntervalMinutesLocal(value)
    try {
      await window.api.deepScan.setIntervalMinutes(value)
    } catch {
      // Best-effort
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
      // Best-effort
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

  const handleScanScopeChange = async (
    value: 'all-sports' | 'selected-sports' | 'selected-leagues'
  ): Promise<void> => {
    setScanScopeLocal(value)
    try {
      await window.api.deepScan.setScanScope(value)
    } catch {
      // Best-effort
    }
  }

  const handleSportsChange = async (sports: string[]): Promise<void> => {
    setEnabledSports(sports)
    try {
      await window.api.deepScan.setEnabledSportsFilter(sports)
    } catch {
      // Best-effort
    }
  }

  const handleLeaguesChange = async (leagues: string[]): Promise<void> => {
    setEnabledLeagues(leagues)
    try {
      await window.api.deepScan.setEnabledLeaguesFilter(leagues)
    } catch {
      // Best-effort
    }
  }

  const handleApplyPreset = async (presetId: string): Promise<void> => {
    try {
      const result = await window.api.deepScan.applyPreset(presetId)
      setScanScopeLocal(result.scanScope as 'all-sports' | 'selected-sports' | 'selected-leagues')
      setEnabledSports(result.enabledSports)
      setEnabledLeagues(result.enabledLeagues)
    } catch {
      // Best-effort
    }
  }

  // Quota warning calculation - estimate hourly requests
  const estimatedHourlyRequests = Math.ceil(60 / intervalMinutes) * continuousMaxEvents * concurrentRequests
  const showBudgetWarning = estimatedHourlyRequests > 5000
  const quotaPercent = continuousStatus.quotaStatus?.percentUsed ?? 0
  const showQuotaWarning = quotaPercent >= 0.8

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-ot-muted">
          Configure continuous deep scan for comprehensive arbitrage detection.
        </p>
      </div>

      {/* Continuous Deep Scan Toggle */}
      <div className="flex items-center justify-between rounded-md border border-ot-border/60 bg-ot-background/30 p-3">
        <div>
          <div className="text-[11px] font-semibold text-ot-foreground">Continuous Deep Scan</div>
          <div className="text-[10px] text-ot-muted">
            Automatically scan after each poll cycle
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-ot-muted">
          <input
            type="checkbox"
            role="switch"
            aria-checked={continuousEnabled}
            checked={continuousEnabled}
            onChange={(event) => handleContinuousToggle(event.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border border-ot-border/80 bg-ot-surface accent-ot-accent"
          />
          {continuousEnabled ? 'On' : 'Off'}
        </label>
      </div>

      {/* Scan Settings Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-md border border-ot-border/60 bg-ot-background/30 p-3">
          <label className="text-[10px] font-semibold text-ot-foreground">Scan Interval</label>
          <div className="text-[9px] text-ot-muted mb-1">Minutes between scans</div>
          <input
            type="number"
            min={1}
            max={30}
            value={intervalInput}
            onChange={(e) => setIntervalInput(e.target.value)}
            onBlur={commitIntervalInput}
            onKeyDown={(e) => handleNumericInputKeyDown(e, commitIntervalInput)}
            className="h-8 w-full rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground"
            aria-label="Scan interval in minutes"
          />
        </div>

        <div className="rounded-md border border-ot-border/60 bg-ot-background/30 p-3">
          <label className="text-[10px] font-semibold text-ot-foreground">Max Events</label>
          <div className="text-[9px] text-ot-muted mb-1">Per cycle (max: 200)</div>
          <input
            type="number"
            min={1}
            max={200}
            value={maxEventsInput}
            onChange={(e) => setMaxEventsInput(e.target.value)}
            onBlur={commitMaxEventsInput}
            onKeyDown={(e) => handleNumericInputKeyDown(e, commitMaxEventsInput)}
            className="h-8 w-full rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground"
            aria-label="Max events per cycle"
          />
        </div>

        <div className="rounded-md border border-ot-border/60 bg-ot-background/30 p-3">
          <label className="text-[10px] font-semibold text-ot-foreground">Concurrent Requests</label>
          <div className="text-[9px] text-ot-muted mb-1">Parallel API calls (max: 10)</div>
          <input
            type="number"
            min={1}
            max={10}
            value={concurrentRequestsInput}
            onChange={(e) => setConcurrentRequestsInput(e.target.value)}
            onBlur={commitConcurrentRequestsInput}
            onKeyDown={(e) => handleNumericInputKeyDown(e, commitConcurrentRequestsInput)}
            className="h-8 w-full rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground"
            aria-label="Concurrent requests"
          />
        </div>

        <div className="rounded-md border border-ot-border/60 bg-ot-background/30 p-3">
          <label className="text-[10px] font-semibold text-ot-foreground">Cache TTL</label>
          <div className="text-[9px] text-ot-muted mb-1">Minutes</div>
          <input
            type="number"
            min={1}
            max={60}
            value={cacheTtlInput}
            onChange={(e) => setCacheTtlInput(e.target.value)}
            onBlur={commitCacheTtlInput}
            onKeyDown={(e) => handleNumericInputKeyDown(e, commitCacheTtlInput)}
            className="h-8 w-full rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground"
            aria-label="Cache TTL in minutes"
          />
        </div>

        <div className="rounded-md border border-ot-border/60 bg-ot-background/30 p-3">
          <label className="text-[10px] font-semibold text-ot-foreground">Scan Scope</label>
          <div className="text-[9px] text-ot-muted mb-1">Events to include</div>
          <select
            value={scanScope}
            onChange={(e) => void handleScanScopeChange(e.target.value as 'all-sports' | 'selected-sports' | 'selected-leagues')}
            className="h-8 w-full rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground"
            aria-label="Scan scope selection"
          >
            <option value="all-sports">All Sports</option>
            <option value="selected-sports">Selected Sports</option>
            <option value="selected-leagues">Selected Leagues</option>
          </select>
        </div>
      </div>

      {/* Sport/League Filter */}
      <SportLeagueFilter
        scanScope={scanScope}
        enabledSports={enabledSports}
        enabledLeagues={enabledLeagues}
        onSportsChange={(sports) => void handleSportsChange(sports)}
        onLeaguesChange={(leagues) => void handleLeaguesChange(leagues)}
        onApplyPreset={(presetId) => void handleApplyPreset(presetId)}
      />

      {/* Budget Warning */}
      {showBudgetWarning && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-200">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="font-medium">Budget Warning</span>
          </div>
          <p className="mt-1 pl-6">
            Current settings estimate ~{estimatedHourlyRequests.toLocaleString()} requests/hour.
            This exceeds the typical 5,000 req/hour budget. Consider reducing settings.
          </p>
        </div>
      )}

      {/* Quota Warning */}
      {showQuotaWarning && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-[11px] text-red-200">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              API Quota: {Math.round(quotaPercent * 100)}% used
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-ot-border">
            <div
              className="h-1.5 rounded-full bg-red-400 transition-all"
              style={{ width: `${Math.min(quotaPercent * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      <p className="text-[10px] text-ot-muted/70">
        Deep scan fetches detailed odds for each event, consuming more API requests.
        Adjust settings based on your API plan limits.
      </p>
    </div>
  )
}

export default DeepScanConfigSection
