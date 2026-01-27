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
  const setDialogOpen = useDeepScanStore((state) => state.setDialogOpen)
  const startScan = useDeepScanStore((state) => state.startScan)
  const refreshStatus = useDeepScanStore((state) => state.refreshStatus)
  const setContinuousEnabledRemote = useDeepScanStore((state) => state.setContinuousEnabled)
  const setMaxEventsRemote = useDeepScanStore((state) => state.setMaxEventsPerCycle)

  const continuousEnabled = useFeedFiltersStore((state) => state.continuousDeepScanEnabled)
  const setContinuousEnabledLocal = useFeedFiltersStore((state) => state.setContinuousDeepScanEnabled)
  const continuousMaxEvents = useFeedFiltersStore((state) => state.continuousDeepScanMaxEventsPerCycle)
  const setContinuousMaxEventsLocal = useFeedFiltersStore((state) => state.setContinuousDeepScanMaxEventsPerCycle)

  const [now, setNow] = React.useState(() => Date.now())

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

  const handleMaxEventsChange = (value: number): void => {
    setContinuousMaxEventsLocal(value)
    void setMaxEventsRemote(value)
  }

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

          <div className="mt-2 flex items-center justify-between gap-3 rounded border border-ot-border/60 bg-ot-border/10 p-2">
            <div>
              <div className="text-[10px] font-semibold text-ot-foreground">Continuous Deep Scan</div>
              <div className="text-[9px] text-ot-muted">
                Automatically scan all events after each poll
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

          <div className="mt-2 flex items-center justify-between gap-3 rounded border border-ot-border/60 bg-ot-border/10 p-2">
            <div>
              <div className="text-[10px] font-semibold text-ot-foreground">Max Events Per Cycle</div>
              <div className="text-[9px] text-ot-muted">Advanced guardrail for API quota</div>
            </div>
            <input
              type="number"
              min={1}
              max={500}
              value={continuousMaxEvents}
              onChange={(event) => handleMaxEventsChange(Number(event.target.value))}
              className="h-7 w-20 rounded border border-ot-border bg-ot-surface px-2 text-right text-[11px] text-ot-foreground"
              aria-label="Max events per continuous scan cycle"
            />
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

          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-ot-muted sm:grid-cols-4">
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
          </div>

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
