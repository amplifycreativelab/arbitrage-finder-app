import * as React from 'react'

import type { ArbitrageOpportunity, ProviderMetadata } from '../../../../../shared/types'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils'
import { copyAndAdvanceCurrentOpportunity } from './copyAndAdvance'
import { formatSignalPayload } from './signalPayload'
import { useFeedStore } from './stores/feedStore'

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

    if (!Array.isArray(storeOpportunities) || storeOpportunities.length === 0) {
      return null
    }

    if (!selectedOpportunityId) {
      return null
    }

    return (
      storeOpportunities.find((candidate) => candidate.id === selectedOpportunityId) ??
      storeOpportunities[0] ??
      null
    )
  }, [opportunity, storeOpportunities, selectedOpportunityId])

  const effectiveProviderMetadata = providerMetadata ?? storeProviderMetadata ?? null

  if (!effectiveOpportunity) {
    return (
      <div
        className="flex h-full items-center justify-center text-[11px] text-ot-foreground/60"
        data-testid="signal-preview-empty"
      >
        Select an opportunity from the feed to see its signal preview.
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

  const buttonLabel =
    copyState === 'copied' ? 'COPIED' : copyState === 'error' ? 'COPY FAILED' : 'COPY SIGNAL [Enter]'

  const buttonClassName =
    copyState === 'copied'
      ? 'bg-emerald-500 text-black hover:bg-emerald-400'
      : copyState === 'error'
        ? 'bg-red-500 text-black hover:bg-red-400'
        : undefined

  return (
    <div
      className="flex h-full flex-col"
      data-testid="signal-preview"
      data-opportunity-id={effectiveOpportunity.id}
    >
      <div className="mb-2 flex items-center justify-between text-[10px] text-ot-foreground/60">
        <span>
          {effectiveProviderMetadata
            ? `Provider: ${effectiveProviderMetadata.displayName}`
            : 'Provider: (active)'}
        </span>
        <span className="font-semibold text-ot-accent">ROI {roiPercent}%</span>
      </div>

      <div className="mb-2 flex justify-end">
        <Button
          type="button"
          className={cn('px-3 py-1 text-[11px]', buttonClassName)}
          onClick={handleCopyClick}
          disabled={isCopying}
          data-testid="copy-signal-button"
        >
          {buttonLabel}
        </Button>
      </div>

      <div className="flex-1 overflow-auto rounded-md border border-white/10 bg-black/80 p-3">
        <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-snug">
          {payload}
        </pre>
      </div>
    </div>
  )
}

export { formatSignalPayload } from './signalPayload'

export default SignalPreview
