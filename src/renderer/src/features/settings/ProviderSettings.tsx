import * as React from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { InlineError } from '../../components/ui/InlineError'
import {
  PROVIDERS,
  type ProviderId,
  type ProviderMetadata
} from '../../../../../shared/types'

// ============================================================
// Types
// ============================================================

interface ProviderState {
  enabled: boolean
  hasKey: boolean
  apiKeyInput: string
  isSaving: boolean
  error: { message: string; guidance?: string } | null
  successMessage: string | null
}

type ProvidersState = Record<ProviderId, ProviderState>

// ============================================================
// Provider Card Component
// ============================================================

interface ProviderCardProps {
  provider: ProviderMetadata
  state: ProviderState
  onToggle: (enabled: boolean) => void
  onApiKeyChange: (value: string) => void
  onSaveApiKey: () => void
  onDismissError: () => void
}

function ProviderCard({
  provider,
  state,
  onToggle,
  onApiKeyChange,
  onSaveApiKey,
  onDismissError
}: ProviderCardProps): React.JSX.Element {
  const { enabled, hasKey, apiKeyInput, isSaving, error, successMessage } = state

  // Show ConfigMissing warning when enabled but no key
  const showConfigMissing = enabled && !hasKey && !apiKeyInput.trim()

  return (
    <div
      className={`rounded-md border p-3 transition-colors ${enabled
        ? 'border-ot-accent/60 bg-black/50'
        : 'border-ot-foreground/20 bg-black/30'
        }`}
      data-testid={`provider-card-${provider.id}`}
    >
      {/* Header row: name, toggle, status badge */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Toggle button styled as switch */}
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => onToggle(!enabled)}
            className={`relative h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ot-accent/50 ${enabled ? 'bg-ot-accent' : 'bg-ot-foreground/30'
              }`}
            data-testid={`provider-toggle-${provider.id}`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? 'left-[18px]' : 'left-0.5'
                }`}
            />
          </button>

          <div>
            <span className="text-sm font-medium text-ot-foreground">
              {provider.displayName}
            </span>
            <span className="ml-2 text-[10px] text-ot-foreground/50">
              ({provider.kind})
            </span>
          </div>
        </div>

        {/* Status badge */}
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${hasKey
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'bg-amber-500/10 text-amber-400'
            }`}
          data-testid={`provider-status-${provider.id}`}
        >
          {hasKey ? 'Key configured' : 'No key'}
        </span>
      </div>

      {/* ConfigMissing warning */}
      {showConfigMissing && (
        <div className="mt-2">
          <InlineError
            message="Provider enabled but API key not configured."
            guidance="Enter your API key below to start receiving data from this provider."
            testId={`config-missing-${provider.id}`}
          />
        </div>
      )}

      {/* API Key input (always visible for enabled providers, collapsed for disabled) */}
      {enabled && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Enter API key..."
              value={apiKeyInput}
              onChange={(e) => onApiKeyChange(e.target.value)}
              autoComplete="off"
              className="flex-1 text-[11px]"
              data-testid={`api-key-input-${provider.id}`}
            />
            <Button
              type="button"
              onClick={onSaveApiKey}
              disabled={isSaving || !apiKeyInput.trim()}
              className="px-3 py-1 text-[11px]"
              data-testid={`save-key-btn-${provider.id}`}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>

          {/* Error display */}
          {error && (
            <InlineError
              message={error.message}
              guidance={error.guidance}
              onDismiss={onDismissError}
              testId={`provider-error-${provider.id}`}
            />
          )}

          {/* Success message */}
          {successMessage && (
            <p
              className="text-[10px] text-emerald-400"
              role="status"
              data-testid={`success-msg-${provider.id}`}
            >
              {successMessage}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

function ProviderSettings(): React.JSX.Element {
  const [providers, setProviders] = React.useState<ProvidersState>(() => {
    const initial: ProvidersState = {} as ProvidersState
    for (const p of PROVIDERS) {
      initial[p.id] = {
        enabled: false,
        hasKey: false,
        apiKeyInput: '',
        isSaving: false,
        error: null,
        successMessage: null
      }
    }
    return initial
  })

  const [isFallbackActive, setIsFallbackActive] = React.useState(false)
  const [showFallbackWarning, setShowFallbackWarning] = React.useState(false)
  const [globalMessage, setGlobalMessage] = React.useState<string | null>(null)

  const credentialsApi = React.useMemo(() => window.api?.credentials ?? null, [])

  // Load initial provider states on mount
  React.useEffect(() => {
    let cancelled = false

    const loadInitialState = async (): Promise<void> => {
      if (!credentialsApi) return

      try {
        // Load storage status
        const storageStatus = await credentialsApi.getStorageStatus()
        if (cancelled) return
        setIsFallbackActive(storageStatus.isUsingFallbackStorage)
        setShowFallbackWarning(
          storageStatus.isUsingFallbackStorage && !storageStatus.fallbackWarningShown
        )

        // Load all providers status
        const allStatus = await credentialsApi.getAllProvidersStatus()
        if (cancelled) return

        setProviders((prev) => {
          const next = { ...prev }
          for (const status of allStatus) {
            if (next[status.providerId]) {
              next[status.providerId] = {
                ...next[status.providerId],
                enabled: status.enabled,
                hasKey: status.hasKey
              }
            }
          }
          return next
        })
      } catch {
        if (!cancelled) {
          setGlobalMessage('Unable to load provider configuration.')
        }
      }
    }

    void loadInitialState()

    return () => {
      cancelled = true
    }
  }, [credentialsApi])

  // Handler: toggle provider enabled
  const handleToggle = React.useCallback(
    async (providerId: ProviderId, enabled: boolean): Promise<void> => {
      if (!credentialsApi) return

      try {
        const result = await credentialsApi.setProviderEnabled(providerId, enabled)

        setProviders((prev) => ({
          ...prev,
          [providerId]: {
            ...prev[providerId],
            enabled: result.enabled,
            error: null,
            successMessage: null
          }
        }))
      } catch {
        setProviders((prev) => ({
          ...prev,
          [providerId]: {
            ...prev[providerId],
            error: {
              message: 'Failed to update provider status.',
              guidance: 'Please try again or restart the application.'
            }
          }
        }))
      }
    },
    [credentialsApi]
  )

  // Handler: update API key input
  const handleApiKeyChange = React.useCallback(
    (providerId: ProviderId, value: string): void => {
      setProviders((prev) => ({
        ...prev,
        [providerId]: {
          ...prev[providerId],
          apiKeyInput: value,
          error: null,
          successMessage: null
        }
      }))
    },
    []
  )

  // Handler: save API key
  const handleSaveApiKey = React.useCallback(
    async (providerId: ProviderId): Promise<void> => {
      if (!credentialsApi) return

      const state = providers[providerId]
      const trimmedKey = state.apiKeyInput.trim()

      if (!trimmedKey) {
        setProviders((prev) => ({
          ...prev,
          [providerId]: {
            ...prev[providerId],
            error: {
              message: 'API key cannot be empty.',
              guidance: 'Enter a valid API key from your provider dashboard.'
            }
          }
        }))
        return
      }

      setProviders((prev) => ({
        ...prev,
        [providerId]: {
          ...prev[providerId],
          isSaving: true,
          error: null,
          successMessage: null
        }
      }))

      try {
        await credentialsApi.saveApiKey(providerId, trimmedKey)

        // Refresh provider status
        const allStatus = await credentialsApi.getAllProvidersStatus()
        const thisStatus = allStatus.find((s) => s.providerId === providerId)

        setProviders((prev) => ({
          ...prev,
          [providerId]: {
            ...prev[providerId],
            isSaving: false,
            apiKeyInput: '',
            hasKey: thisStatus?.hasKey ?? true,
            successMessage: 'API key saved securely.'
          }
        }))
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setProviders((prev) => ({
          ...prev,
          [providerId]: {
            ...prev[providerId],
            isSaving: false,
            error: {
              message: 'Failed to save API key.',
              guidance: `Save operation failed: ${errorMessage}. Check logs for details.`
            }
          }
        }))
      }
    },
    [credentialsApi, providers]
  )

  // Handler: dismiss error
  const handleDismissError = React.useCallback((providerId: ProviderId): void => {
    setProviders((prev) => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        error: null
      }
    }))
  }, [])

  // Handler: dismiss fallback warning
  const handleDismissFallbackWarning = React.useCallback(async (): Promise<void> => {
    try {
      if (credentialsApi) {
        await credentialsApi.acknowledgeFallbackWarning()
      }
    } finally {
      setShowFallbackWarning(false)
    }
  }, [credentialsApi])

  // Count enabled providers
  const enabledCount = Object.values(providers).filter((p) => p.enabled).length

  return (
    <section className="mt-4 space-y-4 rounded-md border border-ot-accent/40 bg-black/40 p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ot-accent">
            Provider Configuration
          </h2>
          <p className="mt-1 text-[11px] text-ot-foreground/70">
            Enable providers and configure API keys for multi-source arbitrage detection.
          </p>
        </div>
        <span
          className="rounded-full bg-ot-accent/10 px-2 py-0.5 text-[10px] font-medium text-ot-accent"
          data-testid="enabled-count-badge"
        >
          {enabledCount} provider{enabledCount !== 1 ? 's' : ''} enabled
        </span>
      </div>

      {/* Fallback storage warning */}
      {isFallbackActive && showFallbackWarning && (
        <div className="space-y-1 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-2 text-[11px] text-yellow-100">
          <div className="font-semibold uppercase tracking-[0.14em]">
            Reduced security: fallback storage active
          </div>
          <p className="leading-snug">
            Windows secure storage (safeStorage) is not available. Provider API keys are stored
            using reversible base64 encoding instead of OS-backed encryption.
          </p>
          <div className="mt-1 flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="border-yellow-400/60 text-[10px] text-yellow-100 hover:bg-yellow-500/20"
              onClick={() => void handleDismissFallbackWarning()}
            >
              I understand the risk
            </Button>
          </div>
        </div>
      )}

      {/* Global message */}
      {globalMessage && (
        <p className="text-[10px] text-amber-400" role="status">
          {globalMessage}
        </p>
      )}

      {/* Provider cards */}
      <div className="space-y-3">
        {PROVIDERS.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            state={providers[provider.id]}
            onToggle={(enabled) => void handleToggle(provider.id, enabled)}
            onApiKeyChange={(value) => handleApiKeyChange(provider.id, value)}
            onSaveApiKey={() => void handleSaveApiKey(provider.id)}
            onDismissError={() => handleDismissError(provider.id)}
          />
        ))}
      </div>

      {/* Help text */}
      <p className="text-[10px] text-ot-foreground/50">
        Keys are stored per provider using secure OS storage and never logged or exposed.
      </p>
    </section>
  )
}

export default ProviderSettings
