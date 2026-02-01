import * as React from 'react'

import { Button } from '../../../components/ui/button'
import { Select } from '../../../components/ui/select'
import { useAppSettingsStore } from '../stores/appSettingsStore'
import { useFeedStore } from '../../dashboard/stores/feedStore'

export function AutoRefreshSection(): React.JSX.Element {
  const autoRefreshEnabled = useAppSettingsStore((s) => s.autoRefreshEnabled)
  const refreshIntervalMs = useAppSettingsStore((s) => s.refreshIntervalMs)
  const setAutoRefreshEnabled = useAppSettingsStore((s) => s.setAutoRefreshEnabled)
  const setRefreshIntervalMs = useAppSettingsStore((s) => s.setRefreshIntervalMs)
  const refreshSnapshot = useFeedStore((state) => state.refreshSnapshot)

  const [isFetching, setIsFetching] = React.useState(false)
  const [lastRefreshTime, setLastRefreshTime] = React.useState<Date | null>(null)
  const [nextRefreshCountdown, setNextRefreshCountdown] = React.useState<number | null>(null)

  // Track last refresh time
  React.useEffect(() => {
    if (autoRefreshEnabled && lastRefreshTime === null) {
      setLastRefreshTime(new Date())
    }
  }, [autoRefreshEnabled, lastRefreshTime])

  // Countdown timer
  React.useEffect(() => {
    if (!autoRefreshEnabled || !lastRefreshTime) {
      setNextRefreshCountdown(null)
      return
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastRefreshTime.getTime()
      const remaining = Math.max(0, refreshIntervalMs - elapsed)
      setNextRefreshCountdown(Math.ceil(remaining / 1000))

      if (remaining <= 0) {
        setLastRefreshTime(new Date())
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [autoRefreshEnabled, lastRefreshTime, refreshIntervalMs])

  const handleManualRefresh = React.useCallback(async (): Promise<void> => {
    setIsFetching(true)
    try {
      await refreshSnapshot()
      setLastRefreshTime(new Date())
    } finally {
      setIsFetching(false)
    }
  }, [refreshSnapshot])

  const handleToggle = (enabled: boolean): void => {
    setAutoRefreshEnabled(enabled)
    if (enabled) {
      setLastRefreshTime(new Date())
    }
  }

  const formatCountdown = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`
    }
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const formatInterval = (ms: number): string => {
    if (ms < 60000) {
      return `${ms / 1000}s`
    }
    return `${ms / 60000}m`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-ot-muted">
          Configure automatic data refresh for live opportunity detection.
        </p>
      </div>

      {/* Auto-Refresh Toggle */}
      <div className="flex items-center justify-between rounded-md border border-ot-border/60 bg-ot-background/30 p-4">
        <div>
          <div className="text-[11px] font-semibold text-ot-foreground">Auto-Refresh</div>
          <div className="text-[10px] text-ot-muted">
            Automatically poll for new opportunities
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={refreshIntervalMs.toString()}
            onChange={(e) => setRefreshIntervalMs(Number(e.target.value))}
            disabled={!autoRefreshEnabled}
            className="h-8 w-24 py-0 px-2 text-[11px]"
          >
            <option value="15000">15s</option>
            <option value="30000">30s</option>
            <option value="60000">1m</option>
            <option value="300000">5m</option>
          </Select>

          <button
            type="button"
            role="switch"
            aria-checked={autoRefreshEnabled}
            onClick={() => handleToggle(!autoRefreshEnabled)}
            className={`relative h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ot-accent/50 ${
              autoRefreshEnabled ? 'bg-ot-accent' : 'bg-ot-muted/30'
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                autoRefreshEnabled ? 'left-[18px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Status Indicator */}
      {autoRefreshEnabled && nextRefreshCountdown !== null && (
        <div className="flex items-center justify-between rounded-md border border-ot-accent/30 bg-ot-accent/5 p-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-ot-accent" />
            <span className="text-[11px] text-ot-foreground">
              Auto-refresh active
            </span>
          </div>
          <span className="text-[10px] text-ot-muted">
            Next refresh in: <span className="font-mono text-ot-accent">{formatCountdown(nextRefreshCountdown)}</span>
          </span>
        </div>
      )}

      {!autoRefreshEnabled && (
        <div className="rounded-md border border-ot-border/40 bg-ot-background/30 p-3">
          <span className="text-[11px] text-ot-muted">
            Auto-refresh is disabled. Use manual refresh to update data.
          </span>
        </div>
      )}

      {/* Manual Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-medium text-ot-foreground">Manual Refresh</div>
          <div className="text-[10px] text-ot-muted">
            Trigger an immediate data refresh
          </div>
        </div>
        <Button
          type="button"
          onClick={() => void handleManualRefresh()}
          disabled={isFetching}
          className="h-8 px-4 text-[11px]"
        >
          {isFetching ? (
            <span className="flex items-center gap-1.5">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Refreshing...
            </span>
          ) : (
            'Refresh Now'
          )}
        </Button>
      </div>

      {/* Summary */}
      <div className="rounded-md border border-ot-border/60 bg-ot-background/30 p-3">
        <div className="grid grid-cols-2 gap-3 text-[10px]">
          <div>
            <span className="text-ot-muted">Status:</span>{' '}
            <span className={autoRefreshEnabled ? 'text-emerald-400' : 'text-ot-muted'}>
              {autoRefreshEnabled ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <span className="text-ot-muted">Interval:</span>{' '}
            <span className="text-ot-foreground">{formatInterval(refreshIntervalMs)}</span>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-ot-muted/70">
        Auto-refresh polls the enabled providers at the specified interval.
        Each refresh may consume API quota based on your provider plan.
      </p>
    </div>
  )
}

export default AutoRefreshSection
