import * as React from 'react'

import { SettingsSection } from './components/SettingsSection'
import { ApiProvidersSection } from './sections/ApiProvidersSection'
import { BookmakerSelectionSection } from './sections/BookmakerSelectionSection'
import { DeepScanConfigSection } from './sections/DeepScanConfigSection'
import { AggressiveScanSettingsSection } from './sections/AggressiveScanSettingsSection'
import { CurrencyDisplaySection } from './sections/CurrencyDisplaySection'
import { AutoRefreshSection } from './sections/AutoRefreshSection'
import { CardRulesSection } from './sections/CardRulesSection'

// ============================================================================
// Icons for Settings Sections
// ============================================================================

function ApiIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  )
}

function BookmakerIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
    </svg>
  )
}

function ScanIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </svg>
  )
}

function CurrencyIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="6" x2="12" y2="18" />
      <path d="M15 9.5c-.8-1.1-2-1.5-3-1.5-2.5 0-3.5 1.5-3.5 3s1 3 3.5 3c1 0 2.2-.4 3-1.5" />
    </svg>
  )
}

function RefreshIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}

function RocketIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  )
}

function CardsIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <rect x="2" y="7" width="16" height="10" rx="2" />
      <path d="m22 10-2 2 2 2" />
      <path d="M6 12h.01" />
      <path d="M10 12h.01" />
    </svg>
  )
}

// ============================================================================
// Main Settings Page Component
// ============================================================================

export function SettingsPage(): React.JSX.Element {
  return (
    <div
      className="flex h-full w-full flex-col overflow-y-auto bg-ot-background p-6"
      data-testid="settings-page"
    >
      <header className="mb-6">
        <h1 className="text-lg font-bold uppercase tracking-[0.16em] text-ot-accent">
          Settings
        </h1>
        <p className="mt-1 text-[12px] text-ot-muted">
          Configure API providers, bookmakers, scanning preferences, and display options.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <SettingsSection
          id="api-providers"
          title="API Providers"
          description="Configure data source API keys and enable/disable providers"
          icon={<ApiIcon />}
          defaultExpanded={true}
        >
          <ApiProvidersSection />
        </SettingsSection>

        <SettingsSection
          id="bookmaker-selection"
          title="Bookmaker Selection"
          description="Choose which bookmakers to include in odds comparison"
          icon={<BookmakerIcon />}
          defaultExpanded={true}
        >
          <BookmakerSelectionSection />
        </SettingsSection>

        <SettingsSection
          id="card-rules"
          title="Card Rules"
          description="Configure card counting rules per bookmaker for arbitrage risk detection"
          icon={<CardsIcon />}
          defaultExpanded={true}
        >
          <CardRulesSection />
        </SettingsSection>

        <SettingsSection
          id="deep-scan-config"
          title="Deep Scan Configuration"
          description="Configure continuous scanning for comprehensive arbitrage detection"
          icon={<ScanIcon />}
          defaultExpanded={true}
        >
          <DeepScanConfigSection />
        </SettingsSection>

        <SettingsSection
          id="aggressive-scan-settings"
          title="Aggressive Pre-Match Mode"
          description="Maximize API quota usage for faster detection on imminent matches"
          icon={<RocketIcon />}
          defaultExpanded={false}
        >
          <AggressiveScanSettingsSection />
        </SettingsSection>

        <SettingsSection
          id="currency-display"
          title="Currency & Display"
          description="Set base currency and manage exchange rates"
          icon={<CurrencyIcon />}
          defaultExpanded={true}
        >
          <CurrencyDisplaySection />
        </SettingsSection>

        <SettingsSection
          id="auto-refresh"
          title="Auto-Refresh & Polling"
          description="Configure automatic data refresh and polling intervals"
          icon={<RefreshIcon />}
          defaultExpanded={true}
        >
          <AutoRefreshSection />
        </SettingsSection>
      </div>

      <footer className="mt-8 border-t border-ot-border/40 pt-4">
        <p className="text-[10px] text-ot-muted/60">
          Settings are automatically saved and persisted across sessions.
        </p>
      </footer>
    </div>
  )
}

export default SettingsPage
