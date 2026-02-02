import * as React from 'react'

import FeedPane from './FeedPane'
import CalculatorPanel from './components/CalculatorPanel'
import { OddsBrowser } from '../odds-browser/OddsBrowser'
import { DeepScanSettings } from '../settings/DeepScanSettings'
import { OddsApiSettings } from '../settings/OddsApiSettings'
import { CurrencyDisplaySettings } from '../settings/CurrencyDisplaySettings'
import { SystemErrorBar } from '../../components/ui/SystemErrorBar'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { ThemeToggle } from '../../components/ui/ThemeToggle'
import { useDashboardErrorStore } from './stores/dashboardErrorStore'
import { useFeedStore } from './stores/feedStore'
import { useCalculatorStore } from './stores/calculatorStore'
import { trpcClient } from '../../lib/trpc'
import type { ProviderStatus } from '../../../../../shared/types'
import { cn } from '../../lib/utils'

type DashboardTab = 'arbitrage' | 'odds-browser' | 'deep-scan-settings' | 'odds-api-settings' | 'currency-display-settings'

// Story 8.6: Persist active tab preference
const STORAGE_KEY_ACTIVE_TAB = 'arb-finder-active-tab'
function loadActiveTabPreference(): DashboardTab {
  if (typeof localStorage === 'undefined') return 'arbitrage'
  const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB)
  // Migrate old 'settings' tab to 'deep-scan-settings'
  if (saved === 'settings') return 'deep-scan-settings'
  if (
    saved === 'odds-browser' ||
    saved === 'deep-scan-settings' ||
    saved === 'odds-api-settings' ||
    saved === 'currency-display-settings'
  ) {
    return saved
  }
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

function DashboardLayout({ feed }: DashboardLayoutProps): React.JSX.Element {
  // Story 8.6: Load persisted tab preference
  const [activeTab, setActiveTab] = React.useState<DashboardTab>(loadActiveTabPreference)

  // Story 8.6: Persist active tab
  const handleTabChange = (tab: DashboardTab): void => {
    setActiveTab(tab)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, tab)
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
            active={activeTab === 'deep-scan-settings'}
            onClick={() => handleTabChange('deep-scan-settings')}
            testId="tab-deep-scan"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
              </svg>
            }
          >
            Deep Scan
          </TabButton>
          <TabButton
            active={activeTab === 'odds-api-settings'}
            onClick={() => handleTabChange('odds-api-settings')}
            testId="tab-odds-api"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            }
          >
            Odds-API.io
          </TabButton>
          <TabButton
            active={activeTab === 'currency-display-settings'}
            onClick={() => handleTabChange('currency-display-settings')}
            testId="tab-display"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <line x1="12" x2="12" y1="2" y2="22" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            }
          >
            Display
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
          </>
        ) : activeTab === 'odds-browser' ? (
          <section
            aria-label="Odds Browser"
            className="flex flex-1 flex-col overflow-hidden"
            data-testid="odds-browser-pane"
          >
            <OddsBrowser className="flex h-full flex-col" />
          </section>
        ) : activeTab === 'deep-scan-settings' ? (
          <section
            aria-label="Deep Scan Settings"
            className="flex flex-1 flex-col overflow-hidden"
            data-testid="deep-scan-settings-pane"
          >
            <DeepScanSettings />
          </section>
        ) : activeTab === 'odds-api-settings' ? (
          <section
            aria-label="Odds-API.io Settings"
            className="flex flex-1 flex-col overflow-hidden"
            data-testid="odds-api-settings-pane"
          >
            <OddsApiSettings />
          </section>
        ) : (
          <section
            aria-label="Currency Display Settings"
            className="flex flex-1 flex-col overflow-hidden"
            data-testid="currency-display-settings-pane"
          >
            <CurrencyDisplaySettings />
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

export default DashboardLayout
