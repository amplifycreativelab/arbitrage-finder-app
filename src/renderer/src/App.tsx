import * as React from 'react'
import Versions from './components/Versions'
import DashboardLayout from './features/dashboard/DashboardLayout'
import DeepScanStatusBar from './features/dashboard/DeepScanStatusBar'
import { ThemeToggle } from './components/ui/ThemeToggle'
import { initTheme } from './stores/themeStore'
import electronLogo from './assets/electron.svg'

function App(): React.JSX.Element {
  // Initialize theme on mount
  React.useEffect(() => {
    initTheme()
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-ot-background text-ot-foreground">
      {/* Header with glassmorphism effect */}
      <header className="ot-glass sticky top-0 z-50">
        <div className="mx-auto flex w-full items-center justify-between gap-3 px-4 py-3 md:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-ot-accent to-ot-accent-hover shadow-ot-glow">
              <img alt="Arbitrage Finder" className="h-6 w-6 drop-shadow-md" src={electronLogo} />
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            <DeepScanStatusBar />
            <div className="h-6 w-px bg-ot-border" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 px-4 py-4 md:px-6 lg:px-8">
        <div className="mx-auto flex w-full flex-col gap-4">
          <DashboardLayout />
          <footer className="flex items-center justify-between text-[10px] text-ot-muted-subtle">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-ot-success animate-pulse-live" />
              System Operational
            </div>
            <Versions />
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
