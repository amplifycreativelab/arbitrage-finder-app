import * as React from 'react'

import { useFeedStore } from './stores/feedStore'
import { FeedTable } from './FeedTable'

function FeedPane(): React.JSX.Element {
  const opportunities = useFeedStore((state) => state.opportunities)
  const isLoading = useFeedStore((state) => state.isLoading)
  const error = useFeedStore((state) => state.error)
  const refreshSnapshot = useFeedStore((state) => state.refreshSnapshot)

  React.useEffect(() => {
    void refreshSnapshot()
  }, [refreshSnapshot])

  if (error && opportunities.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-[11px] text-red-400"
        role="status"
        data-testid="feed-error"
      >
        Unable to load opportunities. {error}
      </div>
    )
  }

  if (isLoading && opportunities.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-[11px] text-ot-foreground/60"
        role="status"
        data-testid="feed-loading"
      >
        Loading opportunities...
      </div>
    )
  }

  return <FeedTable opportunities={opportunities} />
}

export default FeedPane

