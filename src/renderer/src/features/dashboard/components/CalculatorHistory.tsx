import * as React from 'react'

import { Button } from '../../../components/ui/button'
import { cn } from '../../../lib/utils'
import { useCalculatorStore, type CalculationHistoryEntry } from '../stores/calculatorStore'

export function CalculatorHistory(): React.JSX.Element {
  const { history, loadFromHistory, clearHistory, removeHistoryEntry, addToHistory } =
    useCalculatorStore()
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [showClearConfirm, setShowClearConfirm] = React.useState(false)

  const handleClear = (): void => {
    if (showClearConfirm) {
      clearHistory()
      setShowClearConfirm(false)
    } else {
      setShowClearConfirm(true)
      window.setTimeout(() => setShowClearConfirm(false), 3000)
    }
  }

  const handleSaveCurrent = (): void => {
    addToHistory()
  }

  if (history.length === 0) {
    return (
      <div className="border-t border-slate-700 pt-3" data-testid="calculator-history-empty">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveCurrent}
          className="w-full text-[11px]"
          data-testid="save-calculation-button"
        >
          Save Calculation
        </Button>
      </div>
    )
  }

  return (
    <div className="border-t border-slate-700 pt-3" data-testid="calculator-history">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-[11px] font-medium text-ot-muted hover:text-ot-foreground"
          data-testid="history-toggle"
        >
          <span>{isExpanded ? '▼' : '▶'}</span>
          <span>Recent Calculations ({history.length})</span>
        </button>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveCurrent}
            className="h-6 px-2 text-[10px]"
            data-testid="save-calculation-button"
          >
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className={cn(
              'h-6 px-2 text-[10px]',
              showClearConfirm && 'text-red-400 hover:text-red-300'
            )}
            data-testid="clear-history-button"
          >
            {showClearConfirm ? 'Confirm?' : 'Clear'}
          </Button>
        </div>
      </div>

      {/* History List */}
      {isExpanded && (
        <div className="max-h-[200px] overflow-y-auto space-y-2" data-testid="history-list">
          {history.map((entry) => (
            <HistoryItem
              key={entry.id}
              entry={entry}
              onLoad={() => loadFromHistory(entry)}
              onRemove={() => removeHistoryEntry(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface HistoryItemProps {
  entry: CalculationHistoryEntry
  onLoad: () => void
  onRemove: () => void
}

function HistoryItem({ entry, onLoad, onRemove }: HistoryItemProps): React.JSX.Element {
  const timeAgo = React.useMemo(() => {
    const minutes = Math.floor((Date.now() - new Date(entry.timestamp).getTime()) / (60 * 1000))
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }, [entry.timestamp])

  return (
    <div
      className="rounded-md border border-slate-700 bg-slate-800/30 p-2"
      data-testid="history-item"
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="truncate text-[11px] font-medium text-ot-foreground">
          {entry.eventName}
        </span>
        <span className="text-[10px] text-ot-muted">{timeAgo}</span>
      </div>
      <div className="mb-2 text-[10px] text-ot-muted">
        ${entry.totalStake.toFixed(0)} → ${entry.profit.toFixed(2)} profit
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onLoad}
          className="h-6 flex-1 text-[10px]"
          data-testid="load-history-button"
        >
          Load
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-6 px-2 text-[10px] text-ot-muted hover:text-red-400"
          data-testid="remove-history-button"
        >
          ×
        </Button>
      </div>
    </div>
  )
}

export default CalculatorHistory
