import Versions from './components/Versions'
import { Button } from './components/ui/button'
import ProviderSettings from './features/settings/ProviderSettings'
import electronLogo from './assets/electron.svg'

function App(): React.JSX.Element {
  const handlePing = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <div className="flex min-h-screen flex-col bg-ot-background text-ot-foreground">
      <header className="border-b border-ot-accent/40 bg-black/20">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-ot-accent/10">
            <img alt="Arbitrage Finder" className="h-6 w-6" src={electronLogo} />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ot-accent">
              The Orange Terminal
            </div>
            <div className="text-[11px] text-ot-foreground/70">
              Arbitrage Finder - Stories 1.1 &amp; 1.2
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 lg:flex-row">
          <section className="flex-1 space-y-4">
            <h1 className="text-2xl font-semibold tracking-tight">
              Project initialization &amp; secure storage
            </h1>
            <p className="text-sm text-ot-foreground/70">
              Electron-Vite, Tailwind CSS, and shadcn-style components are configured to match the Orange Terminal
              theme. Story 1.2 introduces secure provider credential storage via Electron safeStorage and electron-store.
            </p>
            <ul className="space-y-2 text-xs text-ot-foreground/80">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-ot-accent" />
                <span>`npm run dev` starts the desktop shell.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-ot-accent" />
                <span>Dark background #0F172A, text #F8FAFC, accent #F97316.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-ot-accent" />
                <span>Folders aligned with docs/architecture.md (main, preload, renderer, shared).</span>
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={handlePing}>Ping main process</Button>
            </div>
          </section>

          <aside className="flex w-full max-w-xs flex-col justify-between rounded-lg border border-white/10 bg-black/30 p-4 text-xs text-ot-foreground/70">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ot-accent">
                Environment
              </div>
              <p className="mt-2">
                Electron-Vite - React - TypeScript - Tailwind - shadcn-style components with secure storage wiring.
              </p>
              <ProviderSettings />
            </div>
            <Versions />
          </aside>
        </div>
      </main>
    </div>
  )
}

export default App
