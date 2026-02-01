/**
 * Story 8.7: Aggressive Pre-Match Scanning Settings
 * 
 * UI for configuring aggressive scan mode settings including:
 * - Enable/disable aggressive mode
 * - Quota target percentage
 * - Scan horizon
 * - Imminent poll rate
 * - Tier weights (advanced)
 */

import * as React from 'react'
import { useFeedFiltersStore } from '../../dashboard/stores/feedFiltersStore'

export function AggressiveScanSettingsSection(): React.JSX.Element {
  // Local state from store
  const aggressiveScanEnabled = useFeedFiltersStore((state) => state.aggressiveScanEnabled)
  const setAggressiveScanEnabled = useFeedFiltersStore((state) => state.setAggressiveScanEnabled)
  const quotaTargetPercent = useFeedFiltersStore((state) => state.aggressiveScanQuotaTargetPercent)
  const setQuotaTargetPercent = useFeedFiltersStore((state) => state.setAggressiveScanQuotaTargetPercent)
  const horizonHours = useFeedFiltersStore((state) => state.aggressiveScanHorizonHours)
  const setHorizonHours = useFeedFiltersStore((state) => state.setAggressiveScanHorizonHours)
  const imminentIntervalSeconds = useFeedFiltersStore((state) => state.aggressiveScanImminentIntervalSeconds)
  const setImminentIntervalSeconds = useFeedFiltersStore((state) => state.setAggressiveScanImminentIntervalSeconds)
  const tierWeights = useFeedFiltersStore((state) => state.aggressiveScanTierWeights)
  const setTierWeights = useFeedFiltersStore((state) => state.setAggressiveScanTierWeights)
  const boostDurationMinutes = useFeedFiltersStore((state) => state.aggressiveScanBoostDurationMinutes)
  const setBoostDurationMinutes = useFeedFiltersStore((state) => state.setAggressiveScanBoostDurationMinutes)
  const maxBoostedEvents = useFeedFiltersStore((state) => state.aggressiveScanMaxBoostedEvents)
  const setMaxBoostedEvents = useFeedFiltersStore((state) => state.setAggressiveScanMaxBoostedEvents)

  // Local input states
  const [quotaInput, setQuotaInput] = React.useState(String(quotaTargetPercent))
  const [horizonInput, setHorizonInput] = React.useState(String(horizonHours))
  const [imminentInput, setImminentInput] = React.useState(String(imminentIntervalSeconds))
  const [boostDurationInput, setBoostDurationInput] = React.useState(String(boostDurationMinutes))
  const [maxBoostedInput, setMaxBoostedInput] = React.useState(String(maxBoostedEvents))
  const [showAdvanced, setShowAdvanced] = React.useState(false)

  // Sync inputs with store values
  React.useEffect(() => {
    setQuotaInput(String(quotaTargetPercent))
  }, [quotaTargetPercent])

  React.useEffect(() => {
    setHorizonInput(String(horizonHours))
  }, [horizonHours])

  React.useEffect(() => {
    setImminentInput(String(imminentIntervalSeconds))
  }, [imminentIntervalSeconds])

  React.useEffect(() => {
    setBoostDurationInput(String(boostDurationMinutes))
  }, [boostDurationMinutes])

  React.useEffect(() => {
    setMaxBoostedInput(String(maxBoostedEvents))
  }, [maxBoostedEvents])

  // Handle enable toggle
  const handleToggle = (enabled: boolean): void => {
    setAggressiveScanEnabled(enabled)
    
    // Sync with main process
    try {
      void window.api.deepScan.setAggressiveScanConfig({ enabled })
    } catch {
      // Best-effort
    }
  }

  // Numeric input handlers
  const handleNumericInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    commit: () => void
  ): void => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    commit()
    event.currentTarget.blur()
  }

  // Quota target commit
  const commitQuotaInput = (): void => {
    const parsed = Number(quotaInput)
    if (!Number.isFinite(parsed)) {
      setQuotaInput(String(quotaTargetPercent))
      return
    }
    setQuotaTargetPercent(parsed)
    try {
      void window.api.deepScan.setAggressiveScanConfig({ quotaTargetPercent: parsed })
    } catch {
      // Best-effort
    }
  }

  // Horizon hours commit (used with select dropdown, but kept for consistency)
  // @ts-expect-error - defined for potential future use
  const commitHorizonInput = (): void => {
    const parsed = Number(horizonInput)
    if (!Number.isFinite(parsed)) {
      setHorizonInput(String(horizonHours))
      return
    }
    setHorizonHours(parsed)
    try {
      void window.api.deepScan.setAggressiveScanConfig({ scanHorizonHours: parsed })
    } catch {
      // Best-effort
    }
  }

  // Imminent interval commit (used with select dropdown, but kept for consistency)
  // @ts-expect-error - defined for potential future use
  const commitImminentInput = (): void => {
    const parsed = Number(imminentInput)
    if (!Number.isFinite(parsed)) {
      setImminentInput(String(imminentIntervalSeconds))
      return
    }
    setImminentIntervalSeconds(parsed)
    try {
      void window.api.deepScan.setAggressiveScanConfig({ imminentPollIntervalSeconds: parsed })
    } catch {
      // Best-effort
    }
  }

  // Boost duration commit
  const commitBoostDurationInput = (): void => {
    const parsed = Number(boostDurationInput)
    if (!Number.isFinite(parsed)) {
      setBoostDurationInput(String(boostDurationMinutes))
      return
    }
    setBoostDurationMinutes(parsed)
    try {
      void window.api.deepScan.setAggressiveScanConfig({ arbBoostDurationMinutes: parsed })
    } catch {
      // Best-effort
    }
  }

  // Max boosted events commit
  const commitMaxBoostedInput = (): void => {
    const parsed = Number(maxBoostedInput)
    if (!Number.isFinite(parsed)) {
      setMaxBoostedInput(String(maxBoostedEvents))
      return
    }
    setMaxBoostedEvents(parsed)
    try {
      void window.api.deepScan.setAggressiveScanConfig({ maxBoostedEvents: parsed })
    } catch {
      // Best-effort
    }
  }

  // Handle tier weight change
  const handleTierWeightChange = (tier: keyof typeof tierWeights, value: number): void => {
    const newWeights = { ...tierWeights, [tier]: Math.max(1, Math.min(100, value)) }
    setTierWeights(newWeights)
    try {
      void window.api.deepScan.setAggressiveScanConfig({ tierWeights: newWeights })
    } catch {
      // Best-effort
    }
  }

  // Calculate estimated quota usage
  const estimatedRequestsPerHour = Math.floor(5000 * (quotaTargetPercent / 100))
  const scanHorizonDisplay = horizonHours >= 24 
    ? `${Math.floor(horizonHours / 24)}d ${horizonHours % 24}h` 
    : `${horizonHours}h`

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-ot-muted">
          Aggressive mode maximizes API quota usage for faster arbitrage detection on imminent matches.
        </p>
      </div>

      {/* Enable Toggle */}
      <div className="flex items-center justify-between rounded-md border border-ot-border/60 bg-ot-background/30 p-3">
        <div>
          <div className="text-[11px] font-semibold text-ot-foreground">Aggressive Pre-Match Mode</div>
          <div className="text-[10px] text-ot-muted">
            Use 70-80% of API quota for aggressive scanning
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-ot-muted">
          <input
            type="checkbox"
            role="switch"
            aria-checked={aggressiveScanEnabled}
            checked={aggressiveScanEnabled}
            onChange={(event) => handleToggle(event.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border border-ot-border/80 bg-ot-surface accent-ot-accent"
          />
          {aggressiveScanEnabled ? 'On' : 'Off'}
        </label>
      </div>

      {aggressiveScanEnabled && (
        <>
          {/* Main Settings Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {/* Quota Target */}
            <div className="rounded-md border border-ot-border/60 bg-ot-background/30 p-3">
              <label className="text-[10px] font-semibold text-ot-foreground">Quota Target</label>
              <div className="text-[9px] text-ot-muted mb-1">% of 5,000/hour limit</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={50}
                  max={90}
                  value={quotaInput}
                  onChange={(e) => setQuotaInput(e.target.value)}
                  onBlur={commitQuotaInput}
                  onKeyDown={(e) => handleNumericInputKeyDown(e, commitQuotaInput)}
                  className="h-8 w-20 rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground"
                  aria-label="Quota target percentage"
                />
                <span className="text-[10px] text-ot-muted">%</span>
              </div>
              <div className="mt-1 text-[9px] text-ot-accent">
                ~{estimatedRequestsPerHour.toLocaleString()} req/hr
              </div>
            </div>

            {/* Scan Horizon */}
            <div className="rounded-md border border-ot-border/60 bg-ot-background/30 p-3">
              <label className="text-[10px] font-semibold text-ot-foreground">Scan Horizon</label>
              <div className="text-[9px] text-ot-muted mb-1">Hours to look ahead</div>
              <select
                value={horizonHours}
                onChange={(e) => {
                  const value = Number(e.target.value)
                  setHorizonHours(value)
                  try {
                    void window.api.deepScan.setAggressiveScanConfig({ scanHorizonHours: value })
                  } catch {
                    // Best-effort
                  }
                }}
                className="h-8 w-full rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground"
                aria-label="Scan horizon"
              >
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={72}>72 hours</option>
              </select>
            </div>

            {/* Imminent Poll Rate */}
            <div className="rounded-md border border-ot-border/60 bg-ot-background/30 p-3">
              <label className="text-[10px] font-semibold text-ot-foreground">Imminent Poll Rate</label>
              <div className="text-[9px] text-ot-muted mb-1">Events &lt;30 min to kickoff</div>
              <select
                value={imminentIntervalSeconds}
                onChange={(e) => {
                  const value = Number(e.target.value)
                  setImminentIntervalSeconds(value)
                  try {
                    void window.api.deepScan.setAggressiveScanConfig({ imminentPollIntervalSeconds: value })
                  } catch {
                    // Best-effort
                  }
                }}
                className="h-8 w-full rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground"
                aria-label="Imminent poll rate"
              >
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={45}>45 seconds</option>
                <option value={60}>60 seconds</option>
                <option value={90}>90 seconds</option>
              </select>
            </div>
          </div>

          {/* Arb Boost Settings */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-ot-border/60 bg-ot-background/30 p-3">
              <label className="text-[10px] font-semibold text-ot-foreground">Boost Duration</label>
              <div className="text-[9px] text-ot-muted mb-1">Minutes when arb detected</div>
              <input
                type="number"
                min={1}
                max={30}
                value={boostDurationInput}
                onChange={(e) => setBoostDurationInput(e.target.value)}
                onBlur={commitBoostDurationInput}
                onKeyDown={(e) => handleNumericInputKeyDown(e, commitBoostDurationInput)}
                className="h-8 w-full rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground"
                aria-label="Boost duration minutes"
              />
            </div>

            <div className="rounded-md border border-ot-border/60 bg-ot-background/30 p-3">
              <label className="text-[10px] font-semibold text-ot-foreground">Max Boosted Events</label>
              <div className="text-[9px] text-ot-muted mb-1">Concurrent boosted events</div>
              <input
                type="number"
                min={1}
                max={50}
                value={maxBoostedInput}
                onChange={(e) => setMaxBoostedInput(e.target.value)}
                onBlur={commitMaxBoostedInput}
                onKeyDown={(e) => handleNumericInputKeyDown(e, commitMaxBoostedInput)}
                className="h-8 w-full rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground"
                aria-label="Max boosted events"
              />
            </div>
          </div>

          {/* Advanced Tier Weights */}
          <div className="rounded-md border border-ot-border/60 bg-ot-background/30 p-3">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <div className="text-[10px] font-semibold text-ot-foreground">Advanced: Tier Weights</div>
                <div className="text-[9px] text-ot-muted">Configure quota allocation per tier</div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`h-4 w-4 text-ot-muted transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showAdvanced && (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-ot-border/40 pt-3 sm:grid-cols-3">
                {(Object.keys(tierWeights) as Array<keyof typeof tierWeights>).map((tier) => (
                  <div key={tier} className="flex items-center justify-between rounded bg-ot-surface/50 px-2 py-1">
                    <span className="text-[10px] capitalize text-ot-foreground">{tier}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={tierWeights[tier]}
                        onChange={(e) => handleTierWeightChange(tier, Number(e.target.value))}
                        className="h-6 w-12 rounded border border-ot-border bg-ot-surface px-1 text-[10px] text-ot-foreground text-center"
                      />
                      <span className="text-[9px] text-ot-muted">%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Estimated Usage Info */}
          <div className="rounded-md border border-ot-border/40 bg-ot-surface/30 p-3">
            <div className="text-[10px] font-semibold text-ot-foreground mb-2">Estimated Usage</div>
            <div className="grid grid-cols-2 gap-2 text-[9px] text-ot-muted sm:grid-cols-4">
              <div>
                <span className="text-ot-accent">{scanHorizonDisplay}</span> scan horizon
              </div>
              <div>
                <span className="text-ot-accent">~{estimatedRequestsPerHour.toLocaleString()}</span> req/hour
              </div>
              <div>
                <span className="text-ot-accent">{imminentIntervalSeconds}s</span> imminent polling
              </div>
              <div>
                <span className="text-ot-accent">{tierWeights.imminent}%</span> to imminent tier
              </div>
            </div>
          </div>
        </>
      )}

      <p className="text-[10px] text-ot-muted/70">
        Aggressive mode increases API usage significantly. Monitor your quota to avoid hitting limits.
        Recommended for paid API plans only.
      </p>
    </div>
  )
}

export default AggressiveScanSettingsSection
