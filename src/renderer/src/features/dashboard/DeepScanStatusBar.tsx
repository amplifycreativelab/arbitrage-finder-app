import * as React from 'react'
import { useDeepScanStore } from './stores/deepScanStore'
import { cn } from '../../lib/utils'

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
    <div className="flex items-center gap-4">
      {/* Scanning indicator with modern pulse animation */}
      <div className="flex items-center gap-2.5 bg-ot-surface-hover rounded-lg px-3 py-1.5">
        {isScanning && !isPaused && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ot-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ot-success shadow-sm"></span>
          </span>
        )}
        {isPaused && (
          <span className="h-2.5 w-2.5 rounded-full bg-ot-warning animate-soft-pulse shadow-sm" />
        )}
        {!isScanning && !isPaused && (
          <span className="h-2.5 w-2.5 rounded-full bg-ot-muted-subtle/50" />
        )}

        {/* Status text */}
        <span className="text-xs text-ot-muted font-medium">
          {isScanning
            ? isPaused
              ? 'Paused'
              : `Scanning ${progress.eventsScanned}/${progress.eventsTotal || progress.eventsScanned} events`
            : `Idle - Last scan: ${formatMinutesAgo(continuousStatus.lastContinuousScanAt)}`
          }
        </span>
      </div>

      {/* Daily totals */}
      <div className="hidden sm:flex items-center gap-2 text-xs text-ot-muted border-l border-ot-border pl-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-ot-deep-scan">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
        <span className="font-semibold text-ot-foreground tabular-nums">
          {continuousStatus.opportunitiesFoundToday}
        </span>
        <span>arbs today</span>
      </div>

      {/* Quota indicator (compact) */}
      {(showQuotaWarning || showQuotaDanger) && (
        <div
          className={cn(
            'hidden md:flex items-center gap-2 rounded-lg px-2 py-1',
            showQuotaDanger ? 'bg-ot-error-dim' : 'bg-ot-warning-dim'
          )}
          title={`Quota: ${Math.round(quotaPercent * 100)}%`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn(
            'h-3.5 w-3.5',
            showQuotaDanger ? 'text-ot-error' : 'text-ot-warning'
          )}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div
            className={cn(
              'h-1.5 w-10 rounded-full overflow-hidden bg-ot-border',
            )}
          >
            <div
              className={cn(
                'h-full transition-all duration-300',
                showQuotaDanger ? 'bg-ot-error' : 'bg-ot-warning'
              )}
              style={{ width: `${Math.min(quotaPercent * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default DeepScanStatusBar
