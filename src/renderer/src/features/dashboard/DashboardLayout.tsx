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
import { ThemeToggle } from '../../components/ui/ThemeToggle'
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
        <div className="flex flex-col gap-1 px-4 py-2 animate-slide-in" data-testid="provider-error-banners">
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
      <div className="flex items-center justify-between border-b border-ot-border bg-ot-surface/50 backdrop-blur-sm px-2" data-testid="dashboard-tabs">
        <div className="flex">
          <TabButton
            active={activeTab === 'arbitrage'}
            onClick={() => handleTabChange('arbitrage')}
            testId="tab-arbitrage"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M12 2v20M2 12h20" />
              </svg>
            }
          >
            Arbitrage Feed
          </TabButton>
          <TabButton
            active={activeTab === 'odds-browser'}
            onClick={() => handleTabChange('odds-browser')}
            testId="tab-odds-browser"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M3 3v18h18" />
                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
              </svg>
            }
          >
            Odds Browser
          </TabButton>
          <TabButton
            active={activeTab === 'settings'}
            onClick={() => handleTabChange('settings')}
            testId="tab-settings"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            }
          >
            Settings
          </TabButton>
        </div>
        
        {/* Theme Toggle */}
        <div className="pr-2">
          <ThemeToggle size="sm" />
        </div>
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
                <h2 className="text-sm font-semibold uppercase tracking-wider text-ot-accent flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ot-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-ot-accent"></span>
                  </span>
                  Feed
                </h2>
                <span className="text-xs text-ot-muted font-medium">Opportunities</span>
              </header>

              <DeepScanPanel />

              <div className="flex-1 rounded-lg border border-ot-border bg-ot-surface p-3 text-sm text-ot-muted shadow-ot-sm">
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
                className="flex-1 rounded-lg border border-ot-border bg-ot-surface shadow-ot-sm overflow-hidden"
                data-testid="signal-preview-pane"
              >
                {/* Story 7.7 Task 6: Sub-tabs for Signal Preview / Best Odds */}
                <div className="flex items-center gap-1 border-b border-ot-border bg-ot-background/50 px-3 py-1.5">
                  <SubTabButton
                    active={rightPaneView === 'signal-preview'}
                    onClick={() => handleRightPaneChange('signal-preview')}
                    testId="tab-signal-preview"
                  >
                    Signal Preview
                  </SubTabButton>
                  <SubTabButton
                    active={rightPaneView === 'best-odds'}
                    onClick={() => handleRightPaneChange('best-odds')}
                    testId="tab-best-odds"
                  >
                    Best Odds
                  </SubTabButton>
                </div>

                {/* Content area */}
                <div className="flex-1 p-3 h-[calc(100%-40px)]">
                  {rightPaneView === 'signal-preview' ? (
                    <div className="flex h-full flex-col rounded-lg border border-ot-border bg-ot-background p-3 text-sm font-mono text-ot-foreground">
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

// Tab Button Component
interface TabButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  testId: string
  icon: React.ReactNode
}

function TabButton({ active, onClick, children, testId, icon }: TabButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative px-4 py-3 text-sm font-medium transition-all duration-150 flex items-center gap-2',
        active
          ? 'text-ot-accent'
          : 'text-ot-muted hover:text-ot-foreground hover:bg-ot-surface-hover'
      )}
      data-testid={testId}
      aria-selected={active}
      role="tab"
    >
      {icon}
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-ot-accent to-ot-accent-hover animate-fade-in" />
      )}
    </button>
  )
}

// Sub Tab Button Component
interface SubTabButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  testId: string
}

function SubTabButton({ active, onClick, children, testId }: SubTabButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative px-3 py-1.5 text-xs font-medium transition-all duration-150 rounded-md',
        active
          ? 'text-ot-accent bg-ot-accent-subtle'
          : 'text-ot-muted hover:text-ot-foreground hover:bg-ot-surface-hover'
      )}
      data-testid={testId}
      aria-selected={active}
    >
      {children}
    </button>
  )
}

export default DashboardLayout
