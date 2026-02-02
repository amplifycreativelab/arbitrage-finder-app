import * as React from 'react'

import { SettingsSection } from './components/SettingsSection'
import { ApiProvidersSection } from './sections/ApiProvidersSection'
import { BookmakerSelectionSection } from './sections/BookmakerSelectionSection'

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

function OddsApiIcon(): React.JSX.Element {
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
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  )
}

// ============================================================================
// Main Odds-API.io Settings Page Component
// ============================================================================

export function OddsApiSettings(): React.JSX.Element {
  return (
    <div
      className="flex h-full w-full flex-col overflow-y-auto bg-ot-background p-6"
      data-testid="odds-api-settings-page"
    >
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-ot-accent/10 text-ot-accent">
            <OddsApiIcon />
          </span>
          <h1 className="text-lg font-bold uppercase tracking-[0.16em] text-ot-accent">
            Odds-API.io Settings
          </h1>
        </div>
        <p className="mt-2 text-[12px] text-ot-muted">
          Configure your Odds-API.io integration including API credentials and bookmaker selection
          preferences.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <SettingsSection
          id="odds-api-providers"
          title="API Configuration"
          description="Configure your Odds-API.io API key and provider settings"
          icon={<ApiIcon />}
          defaultExpanded={true}
        >
          <ApiProvidersSection />
        </SettingsSection>

        <SettingsSection
          id="odds-api-bookmakers"
          title="Bookmaker Selection"
          description="Choose which bookmakers to include in your Odds-API.io data feed"
          icon={<BookmakerIcon />}
          defaultExpanded={true}
        >
          <BookmakerSelectionSection />
        </SettingsSection>
      </div>

      <footer className="mt-8 border-t border-ot-border/40 pt-4">
        <p className="text-[10px] text-ot-muted/60">
          Odds-API.io settings are automatically saved and persisted across sessions.
        </p>
      </footer>
    </div>
  )
}

export default OddsApiSettings
