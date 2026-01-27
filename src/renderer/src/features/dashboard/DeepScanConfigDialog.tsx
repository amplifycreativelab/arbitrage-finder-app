import * as React from 'react'

import {
  MARKET_GROUP_DISPLAYS,
  type DeepScanConfig,
  type MarketGroup
} from '../../../../../shared/types'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { useFeedFiltersStore } from './stores/feedFiltersStore'

interface DeepScanConfigDialogProps {
  open: boolean
  initialConfig: DeepScanConfig | null
  onClose: () => void
  onStart: (config: DeepScanConfig) => void
}

function parseEventIds(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map((id) => id.trim())
    .filter(Boolean)
}

export function DeepScanConfigDialog({
  open,
  initialConfig,
  onClose,
  onStart
}: DeepScanConfigDialogProps): React.JSX.Element | null {
  const [eventIdsText, setEventIdsText] = React.useState('')
  const [globalMinRoiPercent, setGlobalMinRoiPercent] = React.useState(0)
  const [marketGroupMinRoi, setMarketGroupMinRoi] = React.useState<
    Partial<Record<MarketGroup, number>>
  >({})
  const [showAdvanced, setShowAdvanced] = React.useState(false)

  const deepScanRoiThresholds = useFeedFiltersStore((state) => state.deepScanRoiThresholds)
  const setDeepScanGlobalMinRoi = useFeedFiltersStore((state) => state.setDeepScanGlobalMinRoi)
  const setDeepScanMarketGroupMinRoi = useFeedFiltersStore(
    (state) => state.setDeepScanMarketGroupMinRoi
  )

  const normalizePercent = (value: number): number => {
    return Number.isFinite(value) && value > 0 ? value : 0
  }

  React.useEffect(() => {
    if (!open) {
      return
    }
    const nextEventIds = initialConfig?.eventIds?.join(', ') ?? ''
    setEventIdsText(nextEventIds)
    setGlobalMinRoiPercent(deepScanRoiThresholds.globalMinRoi * 100)

    const percentOverrides: Partial<Record<MarketGroup, number>> = {}
    for (const display of MARKET_GROUP_DISPLAYS) {
      const value = deepScanRoiThresholds.marketGroupMinRoi[display.group]
      if (value && value > 0) {
        percentOverrides[display.group] = value * 100
      }
    }
    setMarketGroupMinRoi(percentOverrides)
    setShowAdvanced(false)
  }, [open, initialConfig, deepScanRoiThresholds])

  const handleStart = (): void => {
    const eventIds = parseEventIds(eventIdsText)
    if (eventIds.length === 0) {
      return
    }

    const globalMinRoi = normalizePercent(globalMinRoiPercent) / 100
    setDeepScanGlobalMinRoi(globalMinRoi)

    for (const display of MARKET_GROUP_DISPLAYS) {
      const percentValue = normalizePercent(marketGroupMinRoi[display.group] ?? 0)
      setDeepScanMarketGroupMinRoi(display.group, percentValue / 100)
    }

    onStart({
      eventIds,
      minRoi: globalMinRoi
    })
  }

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      data-testid="deep-scan-config-dialog"
    >
      <div className="w-full max-w-lg rounded-lg border border-ot-border bg-ot-background p-4 shadow-lg">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ot-accent">
            Deep Scan Scope
          </h3>
          <button
            type="button"
            className="text-xs text-ot-muted hover:text-ot-foreground"
            onClick={onClose}
            aria-label="Close deep scan dialog"
          >
            Close
          </button>
        </header>

        <div className="space-y-4 text-[11px] text-ot-foreground">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.12em] text-ot-muted">
              Event IDs
            </span>
            <Input
              value={eventIdsText}
              onChange={(event) => setEventIdsText(event.target.value)}
              placeholder="evt-123, evt-456"
              data-testid="deep-scan-event-ids"
            />
            <span className="text-[10px] text-ot-muted">
              Comma or space separated. MVP supports event-level scans.
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.12em] text-ot-muted">
              Global Minimum ROI ({globalMinRoiPercent.toFixed(1)}%)
            </span>
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={globalMinRoiPercent}
              onChange={(event) =>
                setGlobalMinRoiPercent(Number.parseFloat(event.target.value) || 0)
              }
              className="h-2 w-full cursor-pointer appearance-none rounded bg-ot-border/60 accent-ot-accent"
              data-testid="deep-scan-min-roi-slider"
            />
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step={0.5}
                value={globalMinRoiPercent.toFixed(1)}
                onChange={(event) =>
                  setGlobalMinRoiPercent(Number.parseFloat(event.target.value) || 0)
                }
                className="h-7 w-24 text-[11px]"
                data-testid="deep-scan-min-roi-input"
              />
              <span className="text-[11px] text-ot-muted">%</span>
            </div>
          </label>

          <div className="rounded-md border border-ot-border/70 bg-ot-surface/40 p-2">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left text-[10px] uppercase tracking-[0.12em] text-ot-muted"
              onClick={() => setShowAdvanced((value) => !value)}
              aria-expanded={showAdvanced}
            >
              <span>Advanced: Per-Market ROI Overrides</span>
              <span className="text-[11px] text-ot-accent">{showAdvanced ? 'Hide' : 'Show'}</span>
            </button>

            {showAdvanced ? (
              <div className="mt-2 grid gap-2">
                {MARKET_GROUP_DISPLAYS.map((display) => {
                  const percentValue = marketGroupMinRoi[display.group] ?? 0
                  return (
                    <label
                      key={display.group}
                      className="flex items-center justify-between gap-2 text-[11px]"
                    >
                      <span className="text-ot-foreground">{display.label}</span>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={percentValue.toFixed(1)}
                          onChange={(event) =>
                            setMarketGroupMinRoi((prev) => ({
                              ...prev,
                              [display.group]: Number.parseFloat(event.target.value) || 0
                            }))
                          }
                          className="h-7 w-24 text-[11px]"
                          aria-label={`${display.label} minimum ROI percent`}
                        />
                        <span className="text-[11px] text-ot-muted">%</span>
                      </div>
                    </label>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>

        <footer className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} data-testid="deep-scan-cancel-config">
            Cancel
          </Button>
          <Button onClick={handleStart} data-testid="deep-scan-confirm-start">
            Start Scan
          </Button>
        </footer>
      </div>
    </div>
  )
}

export default DeepScanConfigDialog
