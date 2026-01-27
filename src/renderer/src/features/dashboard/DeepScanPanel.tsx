import * as React from 'react'

import type { DeepScanStatus } from '../../../../../shared/types'
import DeepScanButton from './DeepScanButton'
import DeepScanConfigDialog from './DeepScanConfigDialog'
import { useDeepScanStore } from './stores/deepScanStore'

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

export function DeepScanPanel(): React.JSX.Element {
  const progress = useDeepScanStore((state) => state.progress)
  const isDialogOpen = useDeepScanStore((state) => state.isDialogOpen)
  const lastConfig = useDeepScanStore((state) => state.lastConfig)
  const setDialogOpen = useDeepScanStore((state) => state.setDialogOpen)
  const startScan = useDeepScanStore((state) => state.startScan)
  const refreshStatus = useDeepScanStore((state) => state.refreshStatus)

  const [now, setNow] = React.useState(() => Date.now())

  React.useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

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
        </div>
        <DeepScanButton />
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

