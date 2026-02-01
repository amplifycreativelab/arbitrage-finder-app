import * as React from 'react'

import type { ArbitrageOpportunity, ProviderMetadata } from '../../../../../shared/types'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils'
import { copyAndAdvanceCurrentOpportunity } from './copyAndAdvance'
import { formatSignalPayload } from './signalPayload'
import { useFeedStore } from './stores/feedStore'

const isServerEnvironment = typeof document === 'undefined'

export interface SignalPreviewProps {
  opportunity?: ArbitrageOpportunity | null
  providerMetadata?: ProviderMetadata | null
}

function SignalPreview({
  opportunity,
  providerMetadata
}: SignalPreviewProps): React.JSX.Element {
  const storeOpportunities = useFeedStore((state) => state.opportunities)
  const selectedOpportunityId = useFeedStore((state) => state.selectedOpportunityId)
  const storeProviderMetadata = useFeedStore((state) => state.providerMetadata)

  const [copyState, setCopyState] = React.useState<'idle' | 'copied' | 'error'>('idle')
  const [isCopying, setIsCopying] = React.useState(false)

  const effectiveOpportunity = React.useMemo(() => {
    if (opportunity) {
      return opportunity
    }

    let opportunitiesFromStore = storeOpportunities
    let idFromStore = selectedOpportunityId

    if (isServerEnvironment) {
      const snapshot = useFeedStore.getState()
      opportunitiesFromStore = snapshot.opportunities
      idFromStore = snapshot.selectedOpportunityId
    }

    if (!Array.isArray(opportunitiesFromStore) || opportunitiesFromStore.length === 0) {
      return null
    }

    if (!idFromStore) {
      return null
    }

    return (
      opportunitiesFromStore.find((candidate) => candidate.id === idFromStore) ??
      opportunitiesFromStore[0] ??
      null
    )
  }, [opportunity, storeOpportunities, selectedOpportunityId])

  const effectiveProviderMetadata = providerMetadata ?? storeProviderMetadata ?? null

  const isDeepScan = effectiveOpportunity?.source === 'deepScan'

  const deepScanMeta = React.useMemo(() => {
    if (!effectiveOpportunity || !isDeepScan) return null
    const timestamp = effectiveOpportunity.foundAt
    try {
      const label = new Date(timestamp).toLocaleString()
      return `${label} - ${effectiveOpportunity.event.name}`
    } catch {
      return `${timestamp} - ${effectiveOpportunity.event.name}`
    }
  }, [isDeepScan, effectiveOpportunity?.foundAt, effectiveOpportunity?.event.name])

  if (!effectiveOpportunity) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-4 text-ot-muted animate-fade-in"
        data-testid="signal-preview-empty"
      >
        <div className="h-16 w-16 rounded-2xl bg-ot-surface-hover flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 opacity-50">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-ot-foreground-secondary mb-1">No Signal Selected</div>
          <div className="text-xs opacity-70">Select an opportunity from the feed to see its signal preview</div>
        </div>
      </div>
    )
  }

  const payload = formatSignalPayload(effectiveOpportunity, effectiveProviderMetadata)
  const roiPercent = (effectiveOpportunity.roi * 100).toFixed(1)

  const handleCopyClick = (): void => {
    if (isCopying) {
      return
    }

    setIsCopying(true)
    setCopyState('idle')

    void copyAndAdvanceCurrentOpportunity()
      .then((result) => {
        if (result.success) {
          setCopyState('copied')
          window.setTimeout(() => {
            setCopyState('idle')
          }, 1200)
        } else {
          setCopyState('error')
        }
      })
      .finally(() => {
        setIsCopying(false)
      })
  }

  return (
    <div
      className="flex h-full flex-col gap-3"
      data-testid="signal-preview"
      data-opportunity-id={effectiveOpportunity.id}
    >
      {/* Header with provider info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDeepScan ? (
            <div className="flex items-center gap-2 ot-badge ot-badge-deep-scan">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Deep Scan</span>
              {deepScanMeta && <span className="opacity-70">({deepScanMeta})</span>}
            </div>
          ) : effectiveOpportunity.isCrossProvider ? (
            <div className="flex items-center gap-2 ot-badge ot-badge-cross-provider">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span>Cross-Provider</span>
              {effectiveOpportunity.mergedFrom && effectiveOpportunity.mergedFrom.length > 1 && (
                <span className="opacity-70">({effectiveOpportunity.mergedFrom.join(' + ')})</span>
              )}
            </div>
          ) : effectiveOpportunity.mergedFrom && effectiveOpportunity.mergedFrom.length > 1 ? (
            <div className="flex items-center gap-2 ot-badge ot-badge-merged">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Merged</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-ot-muted">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>{effectiveProviderMetadata?.displayName || effectiveOpportunity.providerId || 'Active'}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ot-muted">ROI</span>
          <span className="font-mono font-bold text-lg text-ot-accent">{roiPercent}%</span>
        </div>
      </div>

      {/* Copy button */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant={copyState === 'copied' ? 'secondary' : copyState === 'error' ? 'danger' : 'primary'}
          size="sm"
          loading={isCopying}
          onClick={handleCopyClick}
          className={cn(
            copyState === 'copied' && 'bg-ot-success hover:bg-ot-success text-white',
            copyState === 'error' && 'bg-ot-error hover:bg-ot-error'
          )}
          data-testid="copy-signal-button"
        >
          {copyState === 'copied' ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied!
            </>
          ) : copyState === 'error' ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              Failed
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy Signal
            </>
          )}
        </Button>
      </div>

      {/* Payload display */}
      <div className="flex-1 overflow-auto rounded-lg border border-ot-border bg-ot-background p-4 shadow-inner">
        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ot-foreground-secondary">
          {payload}
        </pre>
      </div>
    </div>
  )
}

export { formatSignalPayload } from './signalPayload'

export default SignalPreview
