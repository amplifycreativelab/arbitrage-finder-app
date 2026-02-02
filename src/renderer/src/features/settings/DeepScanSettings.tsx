import * as React from 'react'

import { SettingsSection } from './components/SettingsSection'
import { DeepScanConfigSection } from './sections/DeepScanConfigSection'
import { AggressiveScanSettingsSection } from './sections/AggressiveScanSettingsSection'

// ============================================================================
// Icons for Deep Scan Sections
// ============================================================================

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

function InfoIcon(): React.JSX.Element {
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
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}

// ============================================================================
// Main Deep Scan Settings Page Component
// ============================================================================

export function DeepScanSettings(): React.JSX.Element {
  return (
    <div
      className="flex h-full w-full flex-col overflow-y-auto bg-ot-background p-6"
      data-testid="deep-scan-settings-page"
    >
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-lg font-bold uppercase tracking-[0.16em] text-ot-accent">
          Deep Scan Settings
        </h1>
        <p className="mt-1 text-[12px] text-ot-muted">
          Configure comprehensive arbitrage detection with continuous deep scanning and aggressive
          pre-match modes.
        </p>
      </header>

      {/* Info Banner */}
      <div className="mb-6 rounded-md border border-ot-accent/20 bg-ot-accent/5 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ot-accent/10 text-ot-accent">
            <InfoIcon />
          </span>
          <div className="space-y-1">
            <h3 className="text-[11px] font-semibold text-ot-foreground">About Deep Scanning</h3>
            <p className="text-[11px] text-ot-muted">
              Deep scanning fetches detailed odds for individual events, consuming more API requests
              than standard polling. Use these settings to balance detection speed with your API
              plan limits.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="flex flex-col gap-4">
        {/* Continuous Deep Scan Configuration */}
        <SettingsSection
          id="deep-scan-config"
          title="Continuous Deep Scan"
          description="Configure automated scanning after each poll cycle for comprehensive arbitrage detection"
          icon={<ScanIcon />}
          defaultExpanded={true}
        >
          <DeepScanConfigSection />
        </SettingsSection>

        {/* Aggressive Pre-Match Scanning */}
        <SettingsSection
          id="aggressive-scan-settings"
          title="Aggressive Pre-Match Mode"
          description="Maximize API quota usage for faster detection on imminent matches (recommended for paid plans)"
          icon={<RocketIcon />}
          defaultExpanded={false}
        >
          <AggressiveScanSettingsSection />
        </SettingsSection>
      </div>

      {/* Footer */}
      <footer className="mt-8 border-t border-ot-border/40 pt-4">
        <div className="flex flex-col gap-2 text-[10px] text-ot-muted/60">
          <p>Settings are automatically saved and persisted across sessions.</p>
          <p>
            Monitor your API quota usage to avoid hitting limits. Aggressive mode is recommended for
            paid API plans only.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default DeepScanSettings
