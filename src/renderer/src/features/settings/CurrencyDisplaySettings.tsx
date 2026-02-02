import * as React from 'react'

import { SettingsSection } from './components/SettingsSection'
import { CurrencyDisplaySection } from './sections/CurrencyDisplaySection'
import { CardRulesSection } from './sections/CardRulesSection'
import { AutoRefreshSection } from './sections/AutoRefreshSection'

// ============================================================================
// Icons for Settings Sections
// ============================================================================

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

// ============================================================================
// Main Currency & Display Settings Page Component
// ============================================================================

export function CurrencyDisplaySettings(): React.JSX.Element {
  return (
    <div
      className="flex h-full w-full flex-col overflow-y-auto bg-ot-background p-6"
      data-testid="currency-display-settings-page"
    >
      <header className="mb-6">
        <h1 className="text-lg font-bold uppercase tracking-[0.16em] text-ot-accent">
          Currency & Display
        </h1>
        <p className="mt-1 text-[12px] text-ot-muted">
          Configure currency settings, card counting rules, and display preferences.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <SettingsSection
          id="currency-settings"
          title="Currency & Exchange Rates"
          description="Set base currency and manage exchange rates for multi-currency calculations"
          icon={<CurrencyIcon />}
          defaultExpanded={true}
        >
          <CurrencyDisplaySection />
        </SettingsSection>

        <SettingsSection
          id="card-rules-settings"
          title="Card Rules"
          description="Configure card counting rules per bookmaker for arbitrage risk detection"
          icon={<CardsIcon />}
          defaultExpanded={true}
        >
          <CardRulesSection />
        </SettingsSection>

        <SettingsSection
          id="auto-refresh-settings"
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

export default CurrencyDisplaySettings
