import * as React from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { trpcClient } from '../../lib/trpc'
import {
  DEFAULT_PROVIDER_ID,
  PROVIDERS,
  type ProviderId,
  isProviderId
} from '../../../../../shared/types'

type ProviderKeyStatus = Record<ProviderId, boolean | null>

function ProviderSettings(): React.JSX.Element {
  const [providerId, setProviderId] = React.useState<ProviderId | null>(null)
  const [apiKey, setApiKey] = React.useState('')
  const [hasStoredKeyByProvider, setHasStoredKeyByProvider] = React.useState<ProviderKeyStatus>({
    'odds-api-io': null,
    'the-odds-api': null
  })
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [isFallbackActive, setIsFallbackActive] = React.useState(false)
  const [showFallbackWarning, setShowFallbackWarning] = React.useState(false)

  const credentialsApi = React.useMemo(() => (window.api?.credentials ?? null), [])

  React.useEffect(() => {
    let cancelled = false

    const loadStorageStatus = async (): Promise<void> => {
      if (!credentialsApi) {
        return
      }

      try {
        const status = await credentialsApi.getStorageStatus()

        if (cancelled) return

        setIsFallbackActive(status.isUsingFallbackStorage)
        setShowFallbackWarning(status.isUsingFallbackStorage && !status.fallbackWarningShown)
      } catch {
        if (!cancelled) {
          setStatusMessage('Unable to load credential storage status.')
        }
      }
    }

    const loadProviderAndKeyStatus = async (): Promise<void> => {
      let initialProviderId: ProviderId = DEFAULT_PROVIDER_ID

      try {
        const result = await trpcClient.getActiveProvider.query()

        if (!cancelled && isProviderId(result.providerId)) {
          initialProviderId = result.providerId
        }
      } catch {
        // Fallback to DEFAULT_PROVIDER_ID if active provider cannot be loaded.
      }

      if (cancelled) return

      setProviderId(initialProviderId)

      try {
        if (!credentialsApi) return

        const configured = await credentialsApi.isProviderConfigured(initialProviderId)

        if (cancelled) return

        setHasStoredKeyByProvider((prev) => ({
          ...prev,
          [initialProviderId]: configured
        }))
      } catch {
        if (!cancelled) {
          setHasStoredKeyByProvider((prev) => ({
            ...prev,
            [initialProviderId]: null
          }))
        }
      }
    }

    void loadStorageStatus()
    void loadProviderAndKeyStatus()

    return () => {
      cancelled = true
    }
  }, [])

  const refreshKeyStatus = React.useCallback(async (targetProviderId: ProviderId): Promise<void> => {
    if (!credentialsApi) {
      return
    }

    try {
      const configured = await credentialsApi.isProviderConfigured(targetProviderId)
      setHasStoredKeyByProvider((prev) => ({
        ...prev,
        [targetProviderId]: configured
      }))
    } catch {
      setHasStoredKeyByProvider((prev) => ({
        ...prev,
        [targetProviderId]: null
      }))
    }
  }, [])

  const handleProviderChange = async (nextProviderId: string): Promise<void> => {
    if (!isProviderId(nextProviderId)) return

    setProviderId(nextProviderId)
    setApiKey('')
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      await trpcClient.setActiveProvider.mutate({ providerId: nextProviderId })
    } catch {
      setStatusMessage('Unable to persist selected provider.')
    }

    await refreshKeyStatus(nextProviderId)
  }

  const handleSave = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()

    if (!providerId) {
      setErrorMessage('A provider must be selected.')
      return
    }

    const trimmedKey = apiKey.trim()

    if (!trimmedKey) {
      setErrorMessage('API key cannot be empty or whitespace.')
      return
    }

    if (!credentialsApi) {
      setErrorMessage('Credential bridge is not available.')
      return
    }

    setIsSubmitting(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      await credentialsApi.saveApiKey(providerId, trimmedKey)
      setStatusMessage('API key saved securely.')
      setApiKey('')
      await refreshKeyStatus(providerId)
    } catch {
      setStatusMessage('Failed to save API key. See logs for details.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDismissWarning = async (): Promise<void> => {
    try {
      if (credentialsApi) {
        await credentialsApi.acknowledgeFallbackWarning()
      }
    } finally {
      setShowFallbackWarning(false)
    }
  }

  const currentKeyConfigured =
    providerId !== null ? hasStoredKeyByProvider[providerId] ?? null : null

  return (
    <section className="mt-4 space-y-3 rounded-md border border-ot-accent/40 bg-black/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ot-accent">
            Provider Credentials
          </h2>
          <p className="mt-1 text-[11px] text-ot-foreground/70">
            Configure API keys for odds providers via secure IPC.
          </p>
        </div>
        {currentKeyConfigured !== null && (
          <span className="rounded-full bg-ot-accent/10 px-2 py-0.5 text-[10px] font-medium text-ot-accent">
            {currentKeyConfigured ? 'Key configured' : 'No key set'}
          </span>
        )}
      </div>

      {isFallbackActive && showFallbackWarning && (
        <div className="space-y-1 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-2 text-[11px] text-yellow-100">
          <div className="font-semibold uppercase tracking-[0.14em]">
            Reduced security: fallback storage active
          </div>
          <p className="leading-snug">
            Windows secure storage (safeStorage) is not available. Provider API keys are stored using
            reversible base64 encoding instead of OS-backed encryption. Use this mode only for
            development or low-risk environments.
          </p>
          <div className="mt-1 flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="border-yellow-400/60 text-[10px] text-yellow-100 hover:bg-yellow-500/20"
              onClick={() => void handleDismissWarning()}
            >
              I understand the risk
            </Button>
          </div>
        </div>
      )}

      <form className="space-y-2" onSubmit={(event) => void handleSave(event)}>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-ot-foreground/80" htmlFor="provider-id">
            Provider
          </label>
          <Select
            id="provider-id"
            value={providerId ?? DEFAULT_PROVIDER_ID}
            onValueChange={(value) => {
              void handleProviderChange(value)
            }}
          >
            {PROVIDERS.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-ot-foreground/80" htmlFor="provider-api-key">
            API key
          </label>
          <Input
            id="provider-api-key"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            autoComplete="off"
          />
          <p className="text-[10px] text-ot-foreground/60">
            Keys are stored per provider and never logged or written to plain-text config.
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button disabled={isSubmitting} type="submit" className="px-3 py-1 text-[11px]">
            {isSubmitting ? 'Saving…' : 'Save API key'}
          </Button>
        </div>
      </form>

      {errorMessage && (
        <p className="text-[10px] text-red-400" role="alert">
          {errorMessage}
        </p>
      )}

      {statusMessage && (
        <p className="text-[10px] text-ot-foreground/70" role="status">
          {statusMessage}
        </p>
      )}
    </section>
  )
}

export default ProviderSettings
