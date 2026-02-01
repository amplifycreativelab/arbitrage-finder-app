import * as React from 'react'

import FeedPane from './FeedPane'
import SignalPreview from './SignalPreview'
import BestOddsPanel from './BestOddsPanel'
import DeepScanPanel from './DeepScanPanel'
import CalculatorPanel from './components/CalculatorPanel'
import { OddsBrowser } from '../odds-browser/OddsBrowser'
import { SettingsPage } from '../settings/SettingsPage'
import { SystemErrorBar } from '../../components/ui/SystemErrorBar'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { useDashboardErrorStore } from './stores/dashboardErrorStore'
import { useFeedStore } from './stores/feedStore'
import { useCalculatorStore } from './stores/calculatorStore'
import { trpcClient } from '../../lib/trpc'
import type { ProviderStatus } from '../../../../../shared/types'
import { cn } from '../../lib/utils'

type DashboardTab = 'arbitrage' | 'odds-browser' | 'settings'
type RightPaneView = 'signal-preview' | 'best-odds'

// Story 7.7 Task 6.3: Persist user's right pane view preference
const STORAGE_KEY_RIGHT_PANE = 'arb-finder-right-pane-view'
function loadRightPanePreference(): RightPaneView {
  if (typeof localStorage === 'undefined') return 'signal-preview'
  const saved = localStorage.getItem(STORAGE_KEY_RIGHT_PANE)
  return saved === 'best-odds' ? 'best-odds' : 'signal-preview'
}

// Story 8.6: Persist active tab preference
const STORAGE_KEY_ACTIVE_TAB = 'arb-finder-active-tab'
function loadActiveTabPreference(): DashboardTab {
  if (typeof localStorage === 'undefined') return 'arbitrage'
  const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB)
  if (saved === 'odds-browser' || saved === 'settings') return saved
  return 'arbitrage'
}

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
  // Story 8.6: Load persisted tab preference
  const [activeTab, setActiveTab] = React.useState<DashboardTab>(loadActiveTabPreference)
  // Story 7.7 Task 6: State for right pane view (Signal Preview vs Best Odds)
  const [rightPaneView, setRightPaneView] = React.useState<RightPaneView>(loadRightPanePreference)

  // Story 8.6: Persist active tab
  const handleTabChange = (tab: DashboardTab): void => {
    setActiveTab(tab)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, tab)
    }
  }

  // Story 7.7 Task 6.3: Persist right pane preference
  const handleRightPaneChange = (view: RightPaneView): void => {
    setRightPaneView(view)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_RIGHT_PANE, view)
    }
  }

  const systemError = useDashboardErrorStore((state) => state.systemError)
  const providerErrors = useDashboardErrorStore((state) => state.providerErrors)
  const dismissSystemError = useDashboardErrorStore((state) => state.dismissSystemError)
  const dismissProviderError = useDashboardErrorStore((state) => state.dismissProviderError)
  const refreshSnapshot = useFeedStore((state) => state.refreshSnapshot)
  const isCalculatorOpen = useCalculatorStore((state) => state.isOpen)
  const calculatorDisplayMode = useCalculatorStore((state) => state.displayMode)

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

      {/* Tab Navigation */}
      <div className="flex border-b border-ot-border bg-ot-surface px-4" data-testid="dashboard-tabs">
        <button
          type="button"
          onClick={() => handleTabChange('arbitrage')}
          className={cn(
            'relative px-4 py-2 text-[11px] font-medium transition-colors',
            activeTab === 'arbitrage'
              ? 'text-ot-accent'
              : 'text-ot-muted hover:text-ot-foreground'
          )}
          data-testid="tab-arbitrage"
          aria-selected={activeTab === 'arbitrage'}
          role="tab"
        >
          <span className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <path d="M12 2v20M2 12h20" />
            </svg>
            Arbitrage Feed
          </span>
          {activeTab === 'arbitrage' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ot-accent" />
          )}
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('odds-browser')}
          className={cn(
            'relative px-4 py-2 text-[11px] font-medium transition-colors',
            activeTab === 'odds-browser'
              ? 'text-ot-accent'
              : 'text-ot-muted hover:text-ot-foreground'
          )}
          data-testid="tab-odds-browser"
          aria-selected={activeTab === 'odds-browser'}
          role="tab"
        >
          <span className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <path d="M3 3v18h18" />
              <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
            </svg>
            Odds Browser
          </span>
          {activeTab === 'odds-browser' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ot-accent" />
          )}
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('settings')}
          className={cn(
            'relative px-4 py-2 text-[11px] font-medium transition-colors',
            activeTab === 'settings'
              ? 'text-ot-accent'
              : 'text-ot-muted hover:text-ot-foreground'
          )}
          data-testid="tab-settings"
          aria-selected={activeTab === 'settings'}
          role="tab"
        >
          <span className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Settings
          </span>
          {activeTab === 'settings' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ot-accent" />
          )}
        </button>
      </div>

      {/* Story 8.3: Calculator Panel - Modal Mode */}
      {isCalculatorOpen && calculatorDisplayMode === 'modal' && <CalculatorPanel />}

      {/* Main dashboard content */}
      <div
        className="flex flex-1 gap-4 overflow-hidden rounded-lg border border-ot-border bg-ot-background p-4"
        data-testid="dashboard-layout"
      >
        {activeTab === 'arbitrage' ? (
          <>
            <section
              aria-label="Feed"
              className={cn(
                'flex min-w-[360px] flex-col gap-3 border-r border-ot-border pr-4 transition-all',
                isCalculatorOpen && calculatorDisplayMode === 'inline' ? 'flex-1' : 'flex-1'
              )}
              data-testid="feed-pane"
            >
              <header className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ot-accent">
                  Feed
                </h2>
                <span className="text-[10px] text-ot-muted">Opportunities</span>
              </header>

              <DeepScanPanel />

              <div className="flex-1 rounded-md border border-ot-border bg-ot-background p-3 text-[11px] text-ot-muted">
                {feed ?? <FeedPane />}
              </div>
            </section>

            {/* Story 8.3: Calculator Panel - Inline Mode */}
            {isCalculatorOpen && calculatorDisplayMode === 'inline' && (
              <section
                aria-label="Surebet Calculator"
                className="flex shrink-0 flex-col"
                data-testid="calculator-section"
              >
                <CalculatorPanel />
              </section>
            )}

            <section
              aria-label="Signal preview and settings"
              className="flex min-w-0 flex-1 flex-col gap-3"
            >
              <div
                className="flex-1 rounded-md border border-ot-border bg-ot-background"
                data-testid="signal-preview-pane"
              >
                {/* Story 7.7 Task 6: Sub-tabs for Signal Preview / Best Odds */}
                <div className="flex items-center gap-1 border-b border-ot-border px-3 py-1.5">
                  <button
                    type="button"
                    onClick={() => handleRightPaneChange('signal-preview')}
                    className={cn(
                      'relative px-3 py-1.5 text-[10px] font-medium transition-colors rounded-t',
                      rightPaneView === 'signal-preview'
                        ? 'text-ot-accent bg-ot-accent/10'
                        : 'text-ot-muted hover:text-ot-foreground'
                    )}
                    data-testid="tab-signal-preview"
                    aria-selected={rightPaneView === 'signal-preview'}
                  >
                    Signal Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRightPaneChange('best-odds')}
                    className={cn(
                      'relative px-3 py-1.5 text-[10px] font-medium transition-colors rounded-t',
                      rightPaneView === 'best-odds'
                        ? 'text-ot-accent bg-ot-accent/10'
                        : 'text-ot-muted hover:text-ot-foreground'
                    )}
                    data-testid="tab-best-odds"
                    aria-selected={rightPaneView === 'best-odds'}
                  >
                    Best Odds
                  </button>
                </div>

                {/* Content area */}
                <div className="flex-1 p-3">
                  {rightPaneView === 'signal-preview' ? (
                    <div className="flex h-full flex-col rounded-md border border-ot-border bg-ot-background p-3 text-[11px] font-mono text-ot-foreground">
                      {signalPreview ?? <SignalPreview />}
                    </div>
                  ) : (
                    <div className="h-full">
                      <BestOddsPanel />
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        ) : activeTab === 'odds-browser' ? (
          <section
            aria-label="Odds Browser"
            className="flex flex-1 flex-col overflow-hidden"
            data-testid="odds-browser-pane"
          >
            <OddsBrowser className="flex h-full flex-col" />
          </section>
        ) : (
          <section
            aria-label="Settings"
            className="flex flex-1 flex-col overflow-hidden"
            data-testid="settings-pane"
          >
            <SettingsPage />
          </section>
        )}
      </div>
    </div>
  )
}

export default DashboardLayout
