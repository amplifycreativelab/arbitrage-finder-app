import * as React from 'react'
import { Button } from '../../components/ui/button'
import { Checkbox } from '../../components/ui/checkbox'
import { InlineError } from '../../components/ui/InlineError'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { ODDS_API_IO_BOOKMAKER_REGION_BY_NAME } from './oddsApiIoBookmakerRegions'

type OddsApiIoBookmaker = {
  name: string
  active: boolean
}

type OddsApiIoBookmakerWithRegion = OddsApiIoBookmaker & {
  region: string
}

function parseBookmakersInput(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
    )
  )
}

function inferRegion(name: string): string {
  const fromMap = ODDS_API_IO_BOOKMAKER_REGION_BY_NAME[name]
  if (typeof fromMap === 'string' && fromMap.length) return fromMap

  const match = name.match(/\\s([A-Z]{2})$/)
  const suffix = match?.[1] ?? null
  if (!suffix) return 'International'

  const suffixMap: Record<string, string> = {
    AU: 'Australia',
    BR: 'Brazil',
    CA: 'Canada',
    CZ: 'Czech Republic',
    DE: 'Germany',
    DK: 'Denmark',
    ES: 'Spain',
    FR: 'France',
    IT: 'Italy',
    LT: 'Lithuania',
    MX: 'Mexico',
    NL: 'Netherlands',
    NJ: 'United States',
    PE: 'Peru',
    PL: 'Poland',
    PT: 'Portugal',
    SE: 'Sweden',
    UK: 'United Kingdom',
    ZA: 'South Africa'
  }

  return suffixMap[suffix] ?? 'International'
}

export function OddsApiIoBookmakerSettings({
  enabled,
  hasKey
}: {
  enabled: boolean
  hasKey: boolean
}): React.JSX.Element | null {
  const getOddsApiIoApi = (): (typeof window.api)['oddsApiIo'] | null => {
    return (window as unknown as { api?: { oddsApiIo?: (typeof window.api)['oddsApiIo'] } }).api
      ?.oddsApiIo ?? null
  }

  const [supported, setSupported] = React.useState<OddsApiIoBookmaker[]>([])
  const [selected, setSelected] = React.useState<string[]>([])
  const [input, setInput] = React.useState('')
  const [pickerValue, setPickerValue] = React.useState('')
  const [supportedSearch, setSupportedSearch] = React.useState('')
  const [regionFilter, setRegionFilter] = React.useState<string>('All regions')
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')
  const [activeOnly, setActiveOnly] = React.useState(true)

  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const refresh = React.useCallback(async (): Promise<void> => {
    const oddsApiIo = getOddsApiIoApi()
    if (!oddsApiIo) {
      setError(
        'Odds-API.io API bridge is not available. Restart the app (or rebuild) and try again.'
      )
      return
    }
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    // Use Promise.allSettled to handle partial failures gracefully
    // (e.g., rate limit on getSelectedBookmakers shouldn't block getSupportedBookmakers)
    const [supportedResult, selectedResult] = await Promise.allSettled([
      oddsApiIo.getSupportedBookmakers(),
      oddsApiIo.getSelectedBookmakers()
    ])

    if (supportedResult.status === 'fulfilled') {
      setSupported(supportedResult.value)
    } else {
      setError(
        supportedResult.reason instanceof Error
          ? supportedResult.reason.message
          : 'Failed to load supported bookmakers.'
      )
    }

    if (selectedResult.status === 'fulfilled') {
      setSelected(selectedResult.value)
    } else {
      // Don't overwrite error if supported also failed
      if (supportedResult.status === 'fulfilled') {
        setError(
          selectedResult.reason instanceof Error
            ? selectedResult.reason.message
            : 'Failed to load selected bookmakers.'
        )
      }
    }

    setIsLoading(false)
  }, [])

  const supportedWithRegion = React.useMemo<OddsApiIoBookmakerWithRegion[]>(() => {
    return supported.map((b) => ({ ...b, region: inferRegion(b.name) }))
  }, [supported])

  const regionOptions = React.useMemo(() => {
    const unique = new Set<string>()
    for (const b of supportedWithRegion) unique.add(b.region)
    return ['All regions', ...Array.from(unique).sort((a, b) => a.localeCompare(b))]
  }, [supportedWithRegion])

  const filteredSupported = React.useMemo(() => {
    const query = supportedSearch.trim().toLowerCase()
    const region = regionFilter

    const items = supportedWithRegion.filter((b) => {
      if (activeOnly && !b.active) return false
      if (region !== 'All regions' && b.region !== region) return false
      if (!query) return true
      return b.name.toLowerCase().includes(query) || b.region.toLowerCase().includes(query)
    })

    items.sort((a, b) => a.name.localeCompare(b.name))
    if (sortDirection === 'desc') items.reverse()
    return items
  }, [activeOnly, regionFilter, sortDirection, supportedSearch, supportedWithRegion])

  React.useEffect(() => {
    if (!enabled || !hasKey) return
    void refresh()
  }, [enabled, hasKey, refresh])

  if (!enabled) return null

  const appendToInput = (name: string): void => {
    setInput((prev) => {
      const next = parseBookmakersInput(prev)
      next.push(name)
      return Array.from(new Set(next)).join(',')
    })
  }

  const handleAdd = async (): Promise<void> => {
    const oddsApiIo = getOddsApiIoApi()
    if (!oddsApiIo) {
      setError(
        'Odds-API.io API bridge is not available. Restart the app (or rebuild) and try again.'
      )
      return
    }

    const bookmakers = parseBookmakersInput(input)
    if (!bookmakers.length) {
      setError('Enter at least one bookmaker name (comma-separated).')
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await oddsApiIo.selectBookmakers(bookmakers)
      setSuccess('Bookmakers updated. Refreshing selection…')
      const selectedList = await oddsApiIo.getSelectedBookmakers()
      setSelected(selectedList)
      setSuccess('Bookmakers updated.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update bookmakers.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = async (): Promise<void> => {
    const oddsApiIo = getOddsApiIoApi()
    if (!oddsApiIo) {
      setError(
        'Odds-API.io API bridge is not available. Restart the app (or rebuild) and try again.'
      )
      return
    }
    const ok = window.confirm(
      'Clear your Odds-API.io selected bookmakers?\n\nNote: Odds-API.io limits clearing to once every 12 hours.'
    )
    if (!ok) return

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await oddsApiIo.clearSelectedBookmakers()
      // Clear succeeded - optimistically set selected to empty
      // (avoids rate limit issues when fetching selected list)
      setSelected([])
      setSuccess('Selection cleared. You can now select new bookmakers.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to clear selection.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mt-2 rounded-md border border-ot-border bg-ot-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold text-ot-foreground">
            Odds-API.io bookmaker selection
          </div>
          <div className="mt-1 text-[10px] text-ot-muted">
            Free plan uses 2 bookmakers. Use “Clear” to swap (limited to once every 12 hours).
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-6 px-2 text-[10px]"
          onClick={() => void refresh()}
          disabled={!hasKey || isLoading || isSaving}
        >
          {isLoading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {!hasKey && (
        <div className="mt-2">
          <InlineError
            message="Configure your Odds-API.io API key to manage bookmakers."
            guidance="Enable the provider and save the API key above, then refresh."
          />
        </div>
      )}

      {hasKey && (
        <>
          <div className="mt-3 text-[10px] text-ot-muted">
            <span className="text-ot-foreground/80">Currently selected:</span>{' '}
            {selected.length ? selected.join(', ') : '(none)'}
          </div>

          <div className="mt-3 rounded-md border border-ot-border/60 bg-ot-background/30 p-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                value={supportedSearch}
                onChange={(e) => setSupportedSearch(e.target.value)}
                placeholder="Search supported bookmakers or region..."
                className="h-8 text-[11px]"
                disabled={isSaving || isLoading}
              />
              <Select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                disabled={isSaving || isLoading || regionOptions.length === 0}
                className="h-8 py-0 px-2"
              >
                {regionOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
              <Select
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
                disabled={isSaving || isLoading}
                className="h-8 py-0 px-2"
              >
                <option value="asc">A → Z</option>
                <option value="desc">Z → A</option>
              </Select>
              <label className="flex items-center gap-2 text-[10px] text-ot-muted">
                <Checkbox
                  checked={activeOnly}
                  onCheckedChange={(v) => setActiveOnly(Boolean(v))}
                  disabled={isSaving || isLoading}
                />
                Active only
              </label>
            </div>

            <div className="mt-2 text-[10px] text-ot-muted/80">
              Showing {filteredSupported.length} bookmaker{filteredSupported.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Bookmaker names (e.g. Bet365,SingBet)"
                className="flex-1 text-[11px]"
                disabled={isSaving}
              />
              <Button
                type="button"
                onClick={() => void handleAdd()}
                disabled={isSaving || !input.trim()}
                className="h-8 px-3 text-[11px]"
              >
                {isSaving ? 'Saving…' : 'Add'}
              </Button>
            </div>

            <div className="flex gap-2">
              <Select
                value={pickerValue}
                onChange={(e) => setPickerValue(e.target.value)}
                disabled={isSaving || isLoading || filteredSupported.length === 0}
                className="flex-1 h-8 py-0 px-2"
              >
                <option value="">
                  {filteredSupported.length
                    ? 'Pick a supported bookmaker…'
                    : 'No supported bookmakers loaded'}
                </option>
                {filteredSupported.map((b) => {
                  const label =
                    b.region && b.region !== 'International' ? `${b.name} (${b.region})` : b.name
                  return (
                    <option key={b.name} value={b.name}>
                      {label}
                    </option>
                  )
                })}
              </Select>
              <Button
                type="button"
                variant="outline"
                className="h-8 px-3 text-[11px]"
                disabled={isSaving || !pickerValue}
                onClick={() => {
                  appendToInput(pickerValue)
                  setPickerValue('')
                }}
              >
                Add to list
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-8 px-3 text-[11px] border-red-500/40 text-red-200 hover:bg-red-500/10"
                disabled={isSaving}
                onClick={() => void handleClear()}
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="mt-3 rounded-md border border-ot-border/60 bg-ot-background/30 p-2">
            <div className="mb-2 text-[10px] font-medium text-ot-foreground/70">
              Supported bookmakers (click to add)
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              {filteredSupported.length === 0 ? (
                <div className="text-[10px] text-ot-muted">No bookmakers match your filters.</div>
              ) : (
                filteredSupported.slice(0, 200).map((b) => (
                  <button
                    key={b.name}
                    type="button"
                    className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-[11px] hover:bg-ot-muted/10"
                    onClick={() => appendToInput(b.name)}
                    disabled={isSaving}
                    title="Add to input"
                  >
                    <span className="text-ot-foreground/90">{b.name}</span>
                    <span className="text-[10px] text-ot-muted">
                      {b.region}
                      {!b.active ? ' • inactive' : ''}
                    </span>
                  </button>
                ))
              )}
            </div>
            {filteredSupported.length > 200 && (
              <div className="mt-2 text-[10px] text-ot-muted/70">
                Showing first 200 results. Use search to narrow down.
              </div>
            )}
          </div>

          {error && (
            <div className="mt-2">
              <InlineError message={error} />
            </div>
          )}
          {success && <div className="mt-2 text-[10px] text-emerald-400">{success}</div>}
        </>
      )}
    </div>
  )
}
