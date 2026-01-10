import Versions from './components/Versions'
import { Button } from './components/ui/button'
import DashboardLayout from './features/dashboard/DashboardLayout'
import electronLogo from './assets/electron.svg'

function App(): React.JSX.Element {
  const handlePing = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <div className="flex min-h-screen flex-col bg-ot-background text-ot-foreground">
      <header className="border-b border-ot-accent/40 bg-black/20">
        <div className="mx-auto flex w-full items-center justify-between gap-3 px-4 py-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-ot-accent/10">
              <img alt="Arbitrage Finder" className="h-6 w-6" src={electronLogo} />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ot-accent">
                The Orange Terminal
              </div>
              <div className="text-[11px] text-ot-foreground/70">
                Arbitrage Finder - Story 6.4: Full-Width Desktop Layout
              </div>
            </div>
          </div>
          <Button className="hidden text-[11px] sm:inline-flex" onClick={handlePing}>
            Ping main process
          </Button>
        </div>
      </header>

      <main className="flex flex-1 px-4 py-6 md:px-6 lg:px-8">
        <div className="mx-auto flex w-full flex-col gap-4">
          <div className="text-[11px] text-ot-foreground/70">
            Dashboard shell with fluid full-width layout, ready for Epic 6 stories.
          </div>
          <DashboardLayout />
          <div className="mt-2 flex justify-end">
            <Versions />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
