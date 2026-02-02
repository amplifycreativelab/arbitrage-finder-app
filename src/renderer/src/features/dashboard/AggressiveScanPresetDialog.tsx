import * as React from 'react'

import {
  AGGRESSIVE_SCAN_PRESETS,
  SCAN_SPORTS,
  estimateRequestsPerHour,
  type AggressiveScanPreset,
  type AggressiveScanSelection
} from '../../../../../shared/aggressiveScanPresets'
import { Button } from '../../components/ui/button'

interface AggressiveScanPresetDialogProps {
  open: boolean
  onClose: () => void
  onStart: (selection: AggressiveScanSelection) => void
}

const HOURLY_LIMIT = 5000

export function AggressiveScanPresetDialog({
  open,
  onClose,
  onStart
}: AggressiveScanPresetDialogProps): React.JSX.Element | null {
  const [selectedPresets, setSelectedPresets] = React.useState<Set<string>>(new Set())
  const [customLeagues, setCustomLeagues] = React.useState<Set<string>>(new Set())
  const [scanHorizonHours, setScanHorizonHours] = React.useState(48)
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const [quotaTargetPercent] = React.useState(75)

  // Calculate estimation based on selection
  const estimation = React.useMemo(() => {
    const selection: AggressiveScanSelection = {
      presetIds: Array.from(selectedPresets),
      customLeagueIds: Array.from(customLeagues),
      scanHorizonHours
    }
    return estimateRequestsPerHour(selection, quotaTargetPercent)
  }, [selectedPresets, customLeagues, scanHorizonHours, quotaTargetPercent])

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedPresets(new Set())
      setCustomLeagues(new Set())
      setScanHorizonHours(48)
      setShowAdvanced(false)
    }
  }, [open])

  const togglePreset = (presetId: string): void => {
    setSelectedPresets((prev) => {
      const next = new Set(prev)
      if (next.has(presetId)) {
        next.delete(presetId)
      } else {
        next.add(presetId)
      }
      return next
    })
  }

  const toggleLeague = (leagueId: string): void => {
    setCustomLeagues((prev) => {
      const next = new Set(prev)
      if (next.has(leagueId)) {
        next.delete(leagueId)
      } else {
        next.add(leagueId)
      }
      return next
    })
  }

  const handleStart = (): void => {
    if (selectedPresets.size === 0 && customLeagues.size === 0) {
      return
    }

    onStart({
      presetIds: Array.from(selectedPresets),
      customLeagueIds: Array.from(customLeagues),
      scanHorizonHours
    })
  }

  const getQuotaColor = (): string => {
    if (estimation.percentOfQuota > 100) return 'text-red-500'
    if (estimation.percentOfQuota > 80) return 'text-amber-500'
    return 'text-emerald-500'
  }

  const getQuotaBarColor = (): string => {
    if (estimation.percentOfQuota > 100) return 'bg-red-500'
    if (estimation.percentOfQuota > 80) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  if (!open) {
    return null
  }

  const majorPresets = AGGRESSIVE_SCAN_PRESETS.filter((p) => p.category === 'major')
  const minorPresets = AGGRESSIVE_SCAN_PRESETS.filter((p) => p.category === 'minor')
  const regionalPresets = AGGRESSIVE_SCAN_PRESETS.filter((p) => p.category === 'regional')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      data-testid="aggressive-scan-preset-dialog"
    >
      <div className="w-full max-w-2xl max-h-[85vh] rounded-lg border border-ot-border bg-ot-background shadow-lg flex flex-col">
        {/* Header */}
        <header className="p-4 border-b border-ot-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-amber-500"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ot-accent">
                Aggressive Scan Configuration
              </h3>
            </div>
            <button
              type="button"
              className="text-xs text-ot-muted hover:text-ot-foreground"
              onClick={onClose}
              aria-label="Close dialog"
            >
              Close
            </button>
          </div>
          <p className="mt-1 text-[11px] text-ot-muted">
            Select which sports and leagues to scan aggressively. Multiple presets can be combined.
          </p>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick Presets - Major */}
          <PresetSection
            title="Major Leagues"
            description="High-profile competitions with best arbitrage opportunities"
            presets={majorPresets}
            selectedPresets={selectedPresets}
            onToggle={togglePreset}
          />

          {/* Quick Presets - Minor */}
          <PresetSection
            title="Secondary Leagues"
            description="Lower divisions and smaller competitions"
            presets={minorPresets}
            selectedPresets={selectedPresets}
            onToggle={togglePreset}
          />

          {/* Quick Presets - All Sports */}
          <PresetSection
            title="Full Coverage"
            description="Complete coverage for specific sports or all available markets"
            presets={regionalPresets}
            selectedPresets={selectedPresets}
            onToggle={togglePreset}
          />

          {/* Scan Horizon */}
          <div className="rounded-md border border-ot-border/70 bg-ot-surface/40 p-3">
            <label className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.12em] text-ot-muted">
                Scan Horizon
              </span>
              <div className="flex items-center gap-3">
                {[12, 24, 48, 72].map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => setScanHorizonHours(hours)}
                    className={`px-3 py-1.5 text-[11px] rounded-md border transition-colors ${
                      scanHorizonHours === hours
                        ? 'border-ot-accent bg-ot-accent/10 text-ot-accent'
                        : 'border-ot-border bg-ot-surface hover:border-ot-border-strong text-ot-foreground'
                    }`}
                  >
                    {hours}h
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-ot-muted">
                How far ahead to look for upcoming events
              </span>
            </label>
          </div>

          {/* Advanced: Individual League Selection */}
          <div className="rounded-md border border-ot-border/70 bg-ot-surface/40 p-3">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left text-[10px] uppercase tracking-[0.12em] text-ot-muted"
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={showAdvanced}
            >
              <span>Advanced: Individual League Selection</span>
              <span className="text-[11px] text-ot-accent">{showAdvanced ? 'Hide' : 'Show'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3">
                {SCAN_SPORTS.map((sport) => (
                  <div key={sport.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{sport.icon}</span>
                      <span className="text-[11px] font-medium text-ot-foreground">
                        {sport.name}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pl-6">
                      {sport.leagues.map((league) => (
                        <label
                          key={league.id}
                          className="flex items-center gap-2 text-[10px] text-ot-foreground cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={customLeagues.has(league.id)}
                            onChange={() => toggleLeague(league.id)}
                            className="h-3 w-3 rounded border-ot-border text-ot-accent focus:ring-ot-accent focus:ring-offset-0"
                          />
                          <span className="truncate" title={league.name}>
                            {league.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Estimation Panel */}
        <div className="p-4 border-t border-ot-border bg-ot-surface/50 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-[0.12em] text-ot-muted">
                  Request Estimation
                </span>
                <span className="text-[10px] text-ot-muted">(Limit: {HOURLY_LIMIT}/hr)</span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-ot-border/50 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full transition-all duration-300 ${getQuotaBarColor()}`}
                  style={{ width: `${Math.min(100, estimation.percentOfQuota)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className={getQuotaColor()}>
                  ~{estimation.estimatedRequestsPerHour.toLocaleString()} requests/hour
                </span>
                <span className={getQuotaColor()}>
                  {estimation.percentOfQuota}% of quota
                </span>
              </div>

              {/* Tier Breakdown */}
              {selectedPresets.size > 0 || customLeagues.size > 0 ? (
                <div className="mt-2 grid grid-cols-4 gap-2 text-[10px]">
                  <div className="text-center">
                    <div className="text-ot-muted">Imminent</div>
                    <div className="text-ot-foreground">{estimation.breakdown.imminent.events} events</div>
                    <div className="text-amber-500">{estimation.breakdown.imminent.requests} req/hr</div>
                  </div>
                  <div className="text-center">
                    <div className="text-ot-muted">Soon</div>
                    <div className="text-ot-foreground">{estimation.breakdown.soon.events} events</div>
                    <div className="text-amber-500">{estimation.breakdown.soon.requests} req/hr</div>
                  </div>
                  <div className="text-center">
                    <div className="text-ot-muted">Today</div>
                    <div className="text-ot-foreground">{estimation.breakdown.today.events} events</div>
                    <div className="text-amber-500">{estimation.breakdown.today.requests} req/hr</div>
                  </div>
                  <div className="text-center">
                    <div className="text-ot-muted">Later</div>
                    <div className="text-ot-foreground">{estimation.breakdown.later.events} events</div>
                    <div className="text-amber-500">{estimation.breakdown.later.requests} req/hr</div>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-[10px] text-ot-muted">
                  Select presets or leagues to see estimation
                </p>
              )}
            </div>

            <div className="text-right shrink-0">
              <div className="text-2xl font-bold text-ot-foreground">
                {estimation.estimatedEvents}
              </div>
              <div className="text-[10px] text-ot-muted">events to scan</div>
            </div>
          </div>

          {/* Warning */}
          {estimation.percentOfQuota > 80 && (
            <div
              className={`mt-3 p-2 rounded-md text-[10px] ${
                estimation.percentOfQuota > 100
                  ? 'bg-red-500/10 border border-red-500/30 text-red-600'
                  : 'bg-amber-500/10 border border-amber-500/30 text-amber-600'
              }`}
            >
              {estimation.percentOfQuota > 100 ? (
                <>
                  <strong>Warning:</strong> This selection exceeds your hourly quota. The scan will
                  throttle automatically but you may miss some opportunities.
                </>
              ) : (
                <>
                  <strong>Note:</strong> This selection uses most of your hourly quota. Consider
                  reducing scope for sustained scanning.
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="p-4 border-t border-ot-border flex items-center justify-between shrink-0">
          <div className="text-[10px] text-ot-muted">
            {selectedPresets.size} preset{selectedPresets.size !== 1 ? 's' : ''} selected
            {customLeagues.size > 0 && ` + ${customLeagues.size} custom league${customLeagues.size !== 1 ? 's' : ''}`}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} data-testid="aggressive-scan-cancel">
              Cancel
            </Button>
            <Button
              onClick={handleStart}
              disabled={selectedPresets.size === 0 && customLeagues.size === 0}
              className="bg-amber-500 hover:bg-amber-600 text-white"
              data-testid="aggressive-scan-start"
            >
              Start Aggressive Scan
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}

// Preset Section Component
interface PresetSectionProps {
  title: string
  description: string
  presets: AggressiveScanPreset[]
  selectedPresets: Set<string>
  onToggle: (id: string) => void
}

function PresetSection({
  title,
  description,
  presets,
  selectedPresets,
  onToggle
}: PresetSectionProps): React.JSX.Element {
  return (
    <div>
      <div className="mb-2">
        <h4 className="text-[11px] font-medium text-ot-foreground">{title}</h4>
        <p className="text-[10px] text-ot-muted">{description}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            isSelected={selectedPresets.has(preset.id)}
            onToggle={() => onToggle(preset.id)}
          />
        ))}
      </div>
    </div>
  )
}

// Preset Card Component
interface PresetCardProps {
  preset: AggressiveScanPreset
  isSelected: boolean
  onToggle: () => void
}

function PresetCard({ preset, isSelected, onToggle }: PresetCardProps): React.JSX.Element {
  const sportIcons = preset.sports
    .map((sportId) => {
      const sport = SCAN_SPORTS.find((s) => s.id === sportId)
      return sport?.icon ?? ''
    })
    .join(' ')

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`p-3 rounded-md border text-left transition-all ${
        isSelected
          ? 'border-ot-accent bg-ot-accent/10 ring-1 ring-ot-accent/30'
          : 'border-ot-border bg-ot-surface hover:border-ot-border-strong'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm">{sportIcons}</span>
            <span className="text-[11px] font-medium text-ot-foreground truncate">
              {preset.name}
            </span>
          </div>
          <p className="text-[10px] text-ot-muted mt-0.5 line-clamp-2">{preset.description}</p>
        </div>
        <div
          className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
            isSelected ? 'border-ot-accent bg-ot-accent' : 'border-ot-border bg-ot-surface'
          }`}
        >
          {isSelected && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-2.5 w-2.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </div>
      <div className="mt-2 text-[10px] text-ot-muted">
        ~{preset.estimatedEvents} events
      </div>
    </button>
  )
}

export default AggressiveScanPresetDialog
