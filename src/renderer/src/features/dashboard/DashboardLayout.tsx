import * as React from 'react'

import ProviderSettings from '../settings/ProviderSettings'
import FeedPane from './FeedPane'
import SignalPreview from './SignalPreview'

interface DashboardLayoutProps {
  feed?: React.ReactNode
  signalPreview?: React.ReactNode
}

function DashboardLayout({ feed, signalPreview }: DashboardLayoutProps): React.JSX.Element {
  return (
    <div
      className="flex flex-1 gap-4 overflow-hidden rounded-lg border border-white/10 bg-black/30 p-4"
      data-testid="dashboard-layout"
    >
      <section
        aria-label="Feed"
        className="flex w-[380px] min-w-[360px] max-w-[440px] flex-col gap-3 border-r border-white/10 pr-4"
        data-testid="feed-pane"
      >
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ot-accent">
            Feed
          </h2>
          <span className="text-[10px] text-ot-foreground/60">Opportunities</span>
        </header>

        <div className="flex-1 rounded-md border border-white/10 bg-black/40 p-3 text-[11px] text-ot-foreground/70">
          {feed ?? <FeedPane />}
        </div>
      </section>

      <section
        aria-label="Signal preview and settings"
        className="flex min-w-0 flex-1 flex-col gap-3"
      >
        <div
          className="flex-1 rounded-md border border-white/10 bg-black/40 p-3"
          data-testid="signal-preview-pane"
        >
          <header className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ot-accent">
              Signal Preview
            </h2>
            <span className="text-[10px] text-ot-foreground/60">Layout shell</span>
          </header>

          <div className="mt-2 flex h-full flex-col rounded-md border border-white/10 bg-black/60 p-3 text-[11px] font-mono text-ot-foreground/80">
            {signalPreview ?? <SignalPreview />}
          </div>
        </div>

        <section className="rounded-md border border-white/10 bg-black/40 p-3">
          <ProviderSettings />
        </section>
      </section>
    </div>
  )
}

export default DashboardLayout
