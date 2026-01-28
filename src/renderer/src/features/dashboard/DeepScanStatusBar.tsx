import * as React from 'react'
import { useDeepScanStore } from './stores/deepScanStore'

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

export function DeepScanStatusBar(): React.JSX.Element {
  const progress = useDeepScanStore((state) => state.progress)
  const continuousStatus = useDeepScanStore((state) => state.continuousStatus)

  const isScanning = progress.status === 'scanning' && progress.mode === 'continuous'
  const isPaused = continuousStatus.isPaused

  // Calculate quota percentage for color indication
  const quotaPercent = continuousStatus.quotaStatus?.percentUsed ?? 0
  const showQuotaWarning = quotaPercent >= 0.8
  const showQuotaDanger = quotaPercent >= 0.9

  return (
    <div className="flex items-center gap-3">
      {/* Scanning indicator with pulse animation */}
      <div className="flex items-center gap-2">
        {isScanning && !isPaused && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
        {isPaused && (
          <span className="h-2 w-2 rounded-full bg-amber-400"></span>
        )}
        {!isScanning && !isPaused && (
          <span className="h-2 w-2 rounded-full bg-ot-muted/50"></span>
        )}

        {/* Status text */}
        <span className="text-[10px] text-ot-muted">
          {isScanning
            ? isPaused
              ? 'Paused'
              : `Scanning ${progress.eventsScanned}/${progress.eventsTotal || progress.eventsScanned} events`
            : `Idle - Last scan: ${formatMinutesAgo(continuousStatus.lastContinuousScanAt)}`
          }
        </span>
      </div>

      {/* Daily totals */}
      <div className="hidden sm:flex items-center gap-2 text-[10px] text-ot-muted border-l border-ot-border pl-3">
        <span>Deep Scan:</span>
        <span className="font-semibold text-ot-foreground">
          {continuousStatus.opportunitiesFoundToday} arbs today
        </span>
      </div>

      {/* Quota indicator (compact) */}
      {(showQuotaWarning || showQuotaDanger) && (
        <div
          className={`hidden md:block h-1.5 w-8 rounded-full overflow-hidden ${
            showQuotaDanger ? 'bg-red-400/30' : 'bg-amber-400/30'
          }`}
          title={`Quota: ${Math.round(quotaPercent * 100)}%`}
        >
          <div
            className={`h-full ${showQuotaDanger ? 'bg-red-400' : 'bg-amber-400'}`}
            style={{ width: `${Math.min(quotaPercent * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

export default DeepScanStatusBar
