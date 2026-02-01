import * as React from 'react'

import { Button } from '../../../components/ui/button'
import { Checkbox } from '../../../components/ui/checkbox'
import { InlineError } from '../../../components/ui/InlineError'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { ODDS_API_IO_BOOKMAKER_REGION_BY_NAME } from '../oddsApiIoBookmakerRegions'

type OddsApiIoBookmaker = {
  name: string
  active: boolean
}

type OddsApiIoBookmakerWithRegion = OddsApiIoBookmaker & {
  region: string
}

function inferRegion(name: string): string {
  const fromMap = ODDS_API_IO_BOOKMAKER_REGION_BY_NAME[name]
  if (typeof fromMap === 'string' && fromMap.length) return fromMap

  const match = name.match(/\s([A-Z]{2})$/)
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

export function BookmakerSelectionSection(): React.JSX.Element | null {
  const getOddsApiIoApi = (): (typeof window.api)['oddsApiIo'] | null => {
    return (window as unknown as { api?: { oddsApiIo?: (typeof window.api)['oddsApiIo'] } }).api
      ?.oddsApiIo ?? null
  }

  const [supported, setSupported] = React.useState<OddsApiIoBookmaker[]>([])
  const [selected, setSelected] = React.useState<string[]>([])
  const [input, setInput] = React.useState('')
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
      setError('Odds-API.io API bridge is not available. Restart the app and try again.')
      return
    }
    setIsLoading(true)
    setError(null)
    setSuccess(null)

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
      setSelected(selectedResult.value ?? [])
    } else if (supportedResult.status === 'fulfilled') {
      setError(
        selectedResult.reason instanceof Error
          ? selectedResult.reason.message
          : 'Failed to load selected bookmakers.'
      )
    }

    setIsLoading(false)
  }, [])

  const supportedWithRegion = React.useMemo<OddsApiIoBookmakerWithRegion[]>(() => {
    return (supported ?? []).map((b) => ({ ...b, region: inferRegion(b.name) }))
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
    void refresh()
  }, [refresh])

  const appendToInput = (name: string): void => {
    setInput((prev) => {
      const next = prev
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
      next.push(name)
      return Array.from(new Set(next)).join(', ')
    })
  }

  const handleSelectAll = (): void => {
    const allNames = filteredSupported.map((b) => b.name)
    setInput(allNames.join(', '))
  }

  const handleDeselectAll = (): void => {
    setInput('')
  }

  const handleAdd = async (): Promise<void> => {
    const oddsApiIo = getOddsApiIoApi()
    if (!oddsApiIo) {
      setError('Odds-API.io API bridge is not available.')
      return
    }

    const bookmakers = input
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    if (!bookmakers.length) {
      setError('Enter at least one bookmaker name.')
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await oddsApiIo.selectBookmakers(bookmakers)
      setSuccess('Bookmakers updated.')
      const selectedList = await oddsApiIo.getSelectedBookmakers()
      setSelected(selectedList)
      setInput('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update bookmakers.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = async (): Promise<void> => {
    const oddsApiIo = getOddsApiIoApi()
    if (!oddsApiIo) {
      setError('Odds-API.io API bridge is not available.')
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
      setSelected([])
      setSuccess('Selection cleared. You can now select new bookmakers.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to clear selection.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetToDefaults = async (): Promise<void> => {
    const ok = window.confirm('Reset bookmaker selection to defaults?')
    if (!ok) return
    await handleClear()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-ot-muted">
          Select bookmakers for odds comparison. Free plan uses 2 bookmakers.
        </p>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-ot-accent/10 px-2 py-0.5 text-[10px] font-medium text-ot-accent">
            {(selected ?? []).length} selected
          </span>
          <Button
            type="button"
            variant="outline"
            className="h-7 px-2 text-[10px]"
            onClick={() => void refresh()}
            disabled={isLoading || isSaving}
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-ot-border/60 bg-ot-background/30 p-3">
        <div className="text-[10px] text-ot-muted mb-2">
          <span className="text-ot-foreground/80">Currently selected:</span>{' '}
          {(selected ?? []).length ? (selected ?? []).join(', ') : '(none)'}
        </div>
      </div>

      <div className="rounded-md border border-ot-border/60 bg-ot-background/30 p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            value={supportedSearch}
            onChange={(e) => setSupportedSearch(e.target.value)}
            placeholder="Search bookmakers..."
            className="h-8 text-[11px]"
            disabled={isSaving || isLoading}
          />
          <Select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            disabled={isSaving || isLoading}
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

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-7 px-3 text-[10px]"
          onClick={handleSelectAll}
          disabled={isSaving || filteredSupported.length === 0}
        >
          Select All
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-7 px-3 text-[10px]"
          onClick={handleDeselectAll}
          disabled={isSaving || !input.trim()}
        >
          Deselect All
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-7 px-3 text-[10px] border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
          onClick={() => void handleResetToDefaults()}
          disabled={isSaving}
        >
          Reset to Defaults
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Bookmaker names (e.g. Bet365, SingBet)"
          className="flex-1 text-[11px]"
          disabled={isSaving}
        />
        <Button
          type="button"
          onClick={() => void handleAdd()}
          disabled={isSaving || !input.trim()}
          className="h-8 px-3 text-[11px]"
        >
          {isSaving ? 'Saving...' : 'Add'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-8 px-3 text-[11px] border-red-500/40 text-red-200 hover:bg-red-500/10"
          onClick={() => void handleClear()}
          disabled={isSaving}
        >
          Clear
        </Button>
      </div>

      <div className="rounded-md border border-ot-border/60 bg-ot-background/30 p-3">
        <div className="mb-2 text-[10px] font-medium text-ot-foreground/70">
          Supported bookmakers (click to add)
        </div>
        <div className="max-h-[250px] overflow-y-auto">
          {filteredSupported.length === 0 ? (
            <div className="text-[10px] text-ot-muted">No bookmakers match your filters.</div>
          ) : (
            filteredSupported.slice(0, 200).map((b) => (
              <button
                key={b.name}
                type="button"
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[11px] hover:bg-ot-muted/10"
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
        <InlineError message={error} onDismiss={() => setError(null)} />
      )}
      {success && <div className="text-[10px] text-emerald-400">{success}</div>}
    </div>
  )
}

export default BookmakerSelectionSection
