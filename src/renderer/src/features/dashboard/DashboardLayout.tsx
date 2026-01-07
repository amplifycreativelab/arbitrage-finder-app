import * as React from 'react'

import ProviderSettings from '../settings/ProviderSettings'
import FeedPane from './FeedPane'
import SignalPreview from './SignalPreview'
import { SystemErrorBar } from '../../components/ui/SystemErrorBar'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { useDashboardErrorStore } from './stores/dashboardErrorStore'
import { useFeedStore } from './stores/feedStore'
import { trpcClient } from '../../lib/trpc'
import type { ProviderStatus } from '../../../../../shared/types'

interface DashboardLayoutProps {
  feed?: React.ReactNode
  signalPreview?: React.ReactNode
}

/** Maps error codes to ProviderStatus for banner rendering */
function errorCodeToProviderStatus(code: string): ProviderStatus {
  switch (code) {
    case 'PROVIDER_RATE_LIMITED':
    case 'QUOTA_EXCEEDED':
      return 'QuotaLimited'
    case 'PROVIDER_UNAVAILABLE':
      return 'Down'
    case 'PROVIDER_TIMEOUT':
    case 'PROVIDER_RESPONSE_INVALID':
      return 'Degraded'
    case 'MISSING_API_KEY':
    case 'INVALID_API_KEY':
      return 'ConfigMissing'
    default:
      return 'Down'
  }
}

function DashboardLayout({ feed, signalPreview }: DashboardLayoutProps): React.JSX.Element {
  const systemError = useDashboardErrorStore((state) => state.systemError)
  const providerErrors = useDashboardErrorStore((state) => state.providerErrors)
  const dismissSystemError = useDashboardErrorStore((state) => state.dismissSystemError)
  const dismissProviderError = useDashboardErrorStore((state) => state.dismissProviderError)
  const refreshSnapshot = useFeedStore((state) => state.refreshSnapshot)

  const handleRetry = React.useCallback(() => {
    dismissSystemError()
    void refreshSnapshot()
  }, [dismissSystemError, refreshSnapshot])

  const handleViewLogs = React.useCallback(() => {
    void trpcClient.openLogDirectory.mutate().catch((err) => {
      console.error('Failed to open log directory:', err)
    })
  }, [])

  const handleProviderRetry = React.useCallback(() => {
    void refreshSnapshot()
  }, [refreshSnapshot])

  const showSystemError = systemError && !systemError.dismissed
  const activeProviderErrors = Array.from(providerErrors.entries()).filter(
    ([, error]) => !error.dismissed
  )

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* System Error Bar - fixed at top */}
      {showSystemError && (
        <SystemErrorBar
          message={systemError.mappedError.message}
          correlationId={systemError.mappedError.originalError.correlationId}
          onRetry={handleRetry}
          onViewLogs={handleViewLogs}
          onDismiss={dismissSystemError}
        />
      )}

      {/* Provider Error Banners - stacked below system error */}
      {activeProviderErrors.length > 0 && (
        <div className="flex flex-col gap-1 px-4 py-2" data-testid="provider-error-banners">
          {activeProviderErrors.map(([providerId, error]) => (
            <ErrorBanner
              key={error.id}
              providerName={providerId}
              status={errorCodeToProviderStatus(error.mappedError.originalError.code)}
              errorSummary={error.mappedError.message}
              actionText={error.mappedError.actionText}
              onAction={handleProviderRetry}
              onDismiss={() => dismissProviderError(providerId)}
              testId={`provider-error-${providerId}`}
            />
          ))}
        </div>
      )}

      {/* Main dashboard content */}
      <div
        className="flex flex-1 gap-4 overflow-hidden rounded-lg border border-white/10 bg-black/30 p-4"
        data-testid="dashboard-layout"
      >
        <section
          aria-label="Feed"
          className="flex w-[380px] min-w-[360px] max-w-[440px] flex-col gap-3 border-r border-white/10 pr-4"
          data-testid="feed-pane"
        >
          <header className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ot-accent">
              Feed
            </h2>
            <span className="text-[10px] text-ot-foreground/60">Opportunities</span>
          </header>

          <div className="flex-1 rounded-md border border-white/10 bg-black/40 p-3 text-[11px] text-ot-foreground/70">
            {feed ?? <FeedPane />}
          </div>
        </section>

        <section
          aria-label="Signal preview and settings"
          className="flex min-w-0 flex-1 flex-col gap-3"
        >
          <div
            className="flex-1 rounded-md border border-white/10 bg-black/40 p-3"
            data-testid="signal-preview-pane"
          >
            <header className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ot-accent">
                Signal Preview
              </h2>
              <span className="text-[10px] text-ot-foreground/60">Layout shell</span>
            </header>

            <div className="mt-2 flex h-full flex-col rounded-md border border-white/10 bg-black/60 p-3 text-[11px] font-mono text-ot-foreground/80">
              {signalPreview ?? <SignalPreview />}
            </div>
          </div>

          <section className="rounded-md border border-white/10 bg-black/40 p-3">
            <ProviderSettings />
          </section>
        </section>
      </div>
    </div>
  )
}

export default DashboardLayout
