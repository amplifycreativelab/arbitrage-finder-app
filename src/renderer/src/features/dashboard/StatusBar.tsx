import * as React from 'react'

import type { DashboardStatusSnapshot, ProviderStatus, SystemStatus } from '../../../../../shared/types'
import { PROVIDERS } from '../../../../../shared/types'
import { getStalenessInfo } from './staleness'
import { useDeepScanStore } from './stores/deepScanStore'

interface StatusBarProps {
  stalenessNow: number
  statusSnapshot: DashboardStatusSnapshot | null
  fetchedAt: string | null
}

function getSystemStatusClasses(status: SystemStatus): string {
  switch (status) {
    case 'OK':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
    case 'Degraded':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-200'
    case 'Stale':
      return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-100'
    case 'Error':
    default:
      return 'border-red-500/40 bg-red-500/10 text-red-300'
  }
}

function getProviderStatusClasses(status: ProviderStatus): string {
  switch (status) {
    case 'OK':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
    case 'Degraded':
    case 'QuotaLimited':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-200'
    case 'ConfigMissing':
      return 'border-sky-500/40 bg-sky-500/10 text-sky-200'
    case 'Down':
    default:
      return 'border-red-500/40 bg-red-500/10 text-red-300'
  }
}

function getSystemStatusLabel(status: SystemStatus): string {
  switch (status) {
    case 'OK':
      return 'System OK'
    case 'Degraded':
      return 'System degraded'
    case 'Stale':
      return 'System stale'
    case 'Error':
    default:
      return 'System error'
  }
}

function getProviderStatusLabel(status: ProviderStatus): string {
  switch (status) {
    case 'OK':
      return 'OK'
    case 'Degraded':
      return 'Degraded'
    case 'Down':
      return 'Down'
    case 'QuotaLimited':
      return 'Quota limited'
    case 'ConfigMissing':
      return 'Config missing'
    default:
      return status
  }
}

function formatLastUpdated(snapshot: DashboardStatusSnapshot | null, stalenessNow: number): string {
  const timestamp = snapshot?.lastUpdatedAt ?? null

  if (!timestamp) {
    return 'No recent data'
  }

  const info = getStalenessInfo({ foundAt: timestamp }, stalenessNow)
  return info.label || 'Just now'
}

function formatMinutesAgo(timestamp: string | null): string {
  if (!timestamp) return 'never'
  const ms = new Date(timestamp).getTime()
  if (!Number.isFinite(ms)) return 'unknown'
  const diffMs = Math.max(0, Date.now() - ms)
  const diffMinutes = Math.floor(diffMs / 60_000)
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes === 1) return '1m ago'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const hours = Math.floor(diffMinutes / 60)
  if (hours === 1) return '1h ago'
  return `${hours}h ago`
}

function getContinuousStatusLabel(status: {
  enabled: boolean
  isActive: boolean
  lastContinuousScanAt: string | null
}): string {
  if (!status.enabled) {
    return 'Continuous off'
  }
  if (status.isActive) {
    return 'Scanning...'
  }
  return `Idle - Last: ${formatMinutesAgo(status.lastContinuousScanAt)}`
}

function StatusBar({ stalenessNow, statusSnapshot, fetchedAt }: StatusBarProps): React.JSX.Element {
  const status = statusSnapshot
  const continuousStatus = useDeepScanStore((state) => state.continuousStatus)

  const systemStatus: SystemStatus = status?.systemStatus ?? 'OK'
  const effectiveStatus: DashboardStatusSnapshot | null =
    status ?? (fetchedAt ? { systemStatus: 'OK', providers: [], lastUpdatedAt: fetchedAt } : null)

  const providers = React.useMemo(() => {
    if (!effectiveStatus?.providers?.length) {
      return PROVIDERS.map((provider) => ({
        providerId: provider.id,
        displayName: provider.displayName,
        status: 'OK' as ProviderStatus,
        lastSuccessfulFetchAt: null as string | null
      }))
    }

    const byId = new Map(
      effectiveStatus.providers.map((entry) => [entry.providerId, entry] as const)
    )

    return PROVIDERS.map((provider) => {
      const entry = byId.get(provider.id)
      return {
        providerId: provider.id,
        displayName: provider.displayName,
        status: (entry?.status ?? 'OK') as ProviderStatus,
        lastSuccessfulFetchAt: entry?.lastSuccessfulFetchAt ?? null
      }
    })
  }, [effectiveStatus])

  const lastUpdatedLabel = formatLastUpdated(effectiveStatus, stalenessNow)

  return (
    <section
      className="mb-2 flex items-center justify-between gap-2 text-[10px]"
      aria-label="System and provider status"
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ot-foreground/60">
          Status
        </span>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-2 py-[2px] ${getSystemStatusClasses(systemStatus)}`}
          data-testid="system-status-chip"
          aria-label={getSystemStatusLabel(systemStatus)}
        >
          <span className="font-semibold">{systemStatus}</span>
          <span className="text-[9px] opacity-80">Updated {lastUpdatedLabel}</span>
        </span>
        <span
          className={`inline-flex items-center gap-2 rounded-full border border-ot-border bg-ot-surface px-2 py-[2px] text-[9px] text-ot-muted ${
            continuousStatus.isActive ? 'animate-pulse border-ot-accent/60 text-ot-accent' : ''
          }`}
          aria-label="Continuous deep scan status"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              continuousStatus.enabled ? (continuousStatus.isActive ? 'bg-ot-accent' : 'bg-emerald-400') : 'bg-ot-muted/60'
            }`}
          />
          <span>{getContinuousStatusLabel(continuousStatus)}</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1" aria-label="Provider statuses">
        {providers.map((provider) => (
          <span
            key={provider.providerId}
            className="inline-flex items-center gap-1 rounded-full border border-ot-border bg-ot-surface px-2 py-[1px] text-[9px] text-ot-muted"
          >
            <span className="font-medium">{provider.displayName}</span>
            <span
              className={`rounded-full border px-1 py-[1px] ${getProviderStatusClasses(provider.status)}`}
              data-testid={`provider-status-${provider.providerId}`}
              aria-label={`${provider.displayName} status ${getProviderStatusLabel(provider.status)}`}
            >
              {getProviderStatusLabel(provider.status)}
            </span>
          </span>
        ))}
      </div>
    </section>
  )
}

export default StatusBar
