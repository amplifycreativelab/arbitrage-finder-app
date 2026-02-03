import * as React from 'react'
import { Select } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  CARD_COUNTING_RULE_DISPLAY,
  DEFAULT_CARD_COUNTING_RULE,
  type CardCountingRule,
  type BookmakerCardRules
} from '../../../../../shared/types'

// ============================================================================
// Info Icon Component
// ============================================================================

function InfoIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}

// ============================================================================
// Card Rules Info Tooltip Component
// ============================================================================

function CardRulesInfo(): React.JSX.Element {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="flex items-center gap-1.5 text-[10px] text-ot-accent hover:text-ot-accent/80 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <InfoIcon className="h-3.5 w-3.5" />
        <span>What&apos;s this?</span>
      </button>

      {isOpen && (
        <div
          className="absolute z-50 mt-2 w-80 rounded-md border border-ot-accent/30 bg-ot-surface p-3 shadow-lg"
          role="dialog"
          aria-label="Card counting rules explanation"
        >
          <div className="space-y-2 text-[11px]">
            <p className="text-ot-foreground font-medium">
              Different bookmakers count cards differently in Over/Under card markets:
            </p>

            <div className="space-y-1.5">
              <div className="rounded bg-ot-background/50 p-2">
                <span className="font-medium text-emerald-400">
                  {CARD_COUNTING_RULE_DISPLAY.standard.label}
                </span>
                <p className="mt-0.5 text-ot-muted">
                  {CARD_COUNTING_RULE_DISPLAY.standard.example}
                </p>
              </div>

              <div className="rounded bg-ot-background/50 p-2">
                <span className="font-medium text-amber-400">
                  {CARD_COUNTING_RULE_DISPLAY.conservative.label}
                </span>
                <p className="mt-0.5 text-ot-muted">
                  {CARD_COUNTING_RULE_DISPLAY.conservative.example}
                </p>
              </div>
            </div>

            <p className="text-ot-muted italic">
              Configure the counting rule for each bookmaker to identify potential arbitrage risks.
            </p>
          </div>

          {/* Arrow */}
          <div className="absolute -top-1 left-4 h-2 w-2 rotate-45 border-l border-t border-ot-accent/30 bg-ot-surface" />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Bookmaker Rule Row Component
// ============================================================================

interface BookmakerRuleRowProps {
  bookmaker: string
  rule: CardCountingRule
  onRuleChange: (bookmaker: string, rule: CardCountingRule) => void
  onRemove: (bookmaker: string) => void
  isLoading?: boolean
}

function BookmakerRuleRow({
  bookmaker,
  rule,
  onRuleChange,
  onRemove,
  isLoading = false
}: BookmakerRuleRowProps): React.JSX.Element {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-md border border-ot-border/60 bg-ot-background/30 p-2.5"
      data-testid={`card-rule-row-${bookmaker}`}
    >
      <span
        className="flex-1 truncate text-[11px] font-medium text-ot-foreground"
        title={bookmaker}
      >
        {bookmaker}
      </span>

      <div className="flex items-center gap-2">
        <Select
          value={rule}
          onChange={(e) => onRuleChange(bookmaker, e.target.value as CardCountingRule)}
          disabled={isLoading}
          className="w-44"
          data-testid={`card-rule-select-${bookmaker}`}
        >
          <option value="standard">
            {CARD_COUNTING_RULE_DISPLAY.standard.label}
          </option>
          <option value="conservative">
            {CARD_COUNTING_RULE_DISPLAY.conservative.label}
          </option>
        </Select>

        <Button
          type="button"
          variant="outline"
          onClick={() => onRemove(bookmaker)}
          disabled={isLoading}
          className="h-7 px-2 text-[10px] border-red-500/40 text-red-200 hover:bg-red-500/10"
          data-testid={`card-rule-remove-${bookmaker}`}
        >
          Remove
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function BookmakerCardRulesSettings(): React.JSX.Element {
  const [rules, setRules] = React.useState<BookmakerCardRules>({})
  const [newBookmaker, setNewBookmaker] = React.useState('')
  const [newRule, setNewRule] = React.useState<CardCountingRule>(DEFAULT_CARD_COUNTING_RULE)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const cardRulesApi = React.useMemo(() => window.api?.cardRules ?? null, [])

  // Load initial rules on mount
  React.useEffect(() => {
    let cancelled = false

    const loadRules = async (): Promise<void> => {
      if (!cardRulesApi) {
        setError('Card rules API is not available. Restart the app and try again.')
        return
      }

      try {
        const rules = await cardRulesApi.getAllRules()
        if (!cancelled) {
          setRules(rules)
        }
      } catch (_err) {
        if (!cancelled) {
          setError('Failed to load card counting rules.')
        }
      }
    }

    void loadRules()

    return () => {
      cancelled = true
    }
  }, [cardRulesApi])

  // Clear messages after 3 seconds
  React.useEffect(() => {
    if (!success) return undefined
    const timer = setTimeout(() => setSuccess(null), 3000)
    return () => clearTimeout(timer)
  }, [success])

  React.useEffect(() => {
    if (!error) return undefined
    const timer = setTimeout(() => setError(null), 5000)
    return () => clearTimeout(timer)
  }, [error])

  const handleAddRule = async (): Promise<void> => {
    if (!cardRulesApi) return

    const trimmedBookmaker = newBookmaker.trim()
    if (!trimmedBookmaker) {
      setError('Please enter a bookmaker name.')
      return
    }

    // Check if already exists
    if (rules[trimmedBookmaker]) {
      setError(`Rule for "${trimmedBookmaker}" already exists. Remove it first to change the rule.`)
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await cardRulesApi.setRule(trimmedBookmaker, newRule)
      const updatedRules = await cardRulesApi.getAllRules()
      setRules(updatedRules)
      setNewBookmaker('')
      setNewRule(DEFAULT_CARD_COUNTING_RULE)
      setSuccess(`Added rule for ${trimmedBookmaker}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rule.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRuleChange = async (bookmaker: string, rule: CardCountingRule): Promise<void> => {
    if (!cardRulesApi) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await cardRulesApi.setRule(bookmaker, rule)
      setRules((prev) => ({ ...prev, [bookmaker]: rule }))
      setSuccess(`Updated rule for ${bookmaker}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveRule = async (bookmaker: string): Promise<void> => {
    if (!cardRulesApi) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await cardRulesApi.removeRule(bookmaker)
      const { [bookmaker]: _, ...rest } = rules
      setRules(rest)
      setSuccess(`Removed rule for ${bookmaker}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove rule.')
    } finally {
      setIsLoading(false)
    }
  }

  const configuredBookmakers = Object.entries(rules).sort((a, b) =>
    a[0].localeCompare(b[0])
  )

  return (
    <div className="space-y-4">
      {/* Header with info */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-[11px] text-ot-muted">
            Configure card counting rules for each bookmaker. This helps identify
            arbitrage risks when bookmakers count cards differently.
          </p>
        </div>
        <CardRulesInfo />
      </div>

      {/* Add new rule form */}
      <div className="flex items-end gap-2 rounded-md border border-ot-border/60 bg-ot-background/30 p-3">
        <div className="flex-1 space-y-1.5">
          <label
            htmlFor="new-bookmaker"
            className="text-[10px] font-medium text-ot-foreground"
          >
            Bookmaker
          </label>
          <Input
            id="new-bookmaker"
            value={newBookmaker}
            onChange={(e) => setNewBookmaker(e.target.value)}
            placeholder="e.g., Sportsbet, Bet365"
            className="h-8 text-[11px]"
            disabled={isLoading}
            data-testid="card-rule-new-bookmaker"
          />
        </div>

        <div className="w-48 space-y-1.5">
          <label
            htmlFor="new-rule"
            className="text-[10px] font-medium text-ot-foreground"
          >
            Counting Rule
          </label>
          <Select
            id="new-rule"
            value={newRule}
            onChange={(e) => setNewRule(e.target.value as CardCountingRule)}
            disabled={isLoading}
            className="h-8"
            data-testid="card-rule-new-rule"
          >
            <option value="standard">
              {CARD_COUNTING_RULE_DISPLAY.standard.label}
            </option>
            <option value="conservative">
              {CARD_COUNTING_RULE_DISPLAY.conservative.label}
            </option>
          </Select>
        </div>

        <Button
          type="button"
          onClick={() => void handleAddRule()}
          disabled={isLoading || !newBookmaker.trim()}
          className="h-8 px-3 text-[11px]"
          data-testid="card-rule-add-btn"
        >
          {isLoading ? 'Adding...' : 'Add Rule'}
        </Button>
      </div>

      {/* Rules list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ot-accent">
            Configured Bookmakers
          </h4>
          <span className="rounded-full bg-ot-accent/10 px-2 py-0.5 text-[10px] font-medium text-ot-accent">
            {configuredBookmakers.length} configured
          </span>
        </div>

        {configuredBookmakers.length === 0 ? (
          <div className="rounded-md border border-ot-border/40 bg-ot-background/20 p-4 text-center">
            <p className="text-[11px] text-ot-muted">
              No bookmakers configured yet. All bookmakers will use the
              &quot;{CARD_COUNTING_RULE_DISPLAY[DEFAULT_CARD_COUNTING_RULE].label}&quot; rule by default.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {configuredBookmakers.map(([bookmaker, rule]) => (
              <BookmakerRuleRow
                key={bookmaker}
                bookmaker={bookmaker}
                rule={rule}
                onRuleChange={handleRuleChange}
                onRemove={handleRemoveRule}
                isLoading={isLoading}
              />
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div
          className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-[11px] text-red-200"
          role="alert"
          data-testid="card-rule-error"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2 text-[11px] text-emerald-400"
          role="status"
          data-testid="card-rule-success"
        >
          {success}
        </div>
      )}
    </div>
  )
}

export default BookmakerCardRulesSettings
