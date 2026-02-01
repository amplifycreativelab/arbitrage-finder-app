import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  mode: ThemeMode
  isDark: boolean
  setMode: (mode: ThemeMode) => void
  toggle: () => void
  resolveTheme: () => void
}

const STORAGE_KEY = 'arb-finder-theme'

function getSystemTheme(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(isDark: boolean): void {
  if (typeof document === 'undefined') return
  
  const root = document.documentElement
  if (isDark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      isDark: false,

      setMode: (mode: ThemeMode) => {
        const isDark = mode === 'system' ? getSystemTheme() : mode === 'dark'
        applyTheme(isDark)
        set({ mode, isDark })
      },

      toggle: () => {
        const newMode: ThemeMode = get().isDark ? 'light' : 'dark'
        const isDark = newMode === 'dark'
        applyTheme(isDark)
        set({ mode: newMode, isDark })
      },

      resolveTheme: () => {
        const { mode } = get()
        const isDark = mode === 'system' ? getSystemTheme() : mode === 'dark'
        applyTheme(isDark)
        set({ isDark })
      },
    }),
    {
      name: STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        if (state) {
          const isDark = state.mode === 'system' ? getSystemTheme() : state.mode === 'dark'
          applyTheme(isDark)
          state.isDark = isDark
        }
      },
    }
  )
)

// Initialize theme on load
export function initTheme(): void {
  if (typeof window === 'undefined') return
  
  const state = useThemeStore.getState()
  state.resolveTheme()
  
  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', (e) => {
    if (useThemeStore.getState().mode === 'system') {
      const isDark = e.matches
      applyTheme(isDark)
      useThemeStore.setState({ isDark })
    }
  })
}

// Helper for theme initialization in components
export function useTheme(): { isDark: boolean; toggle: () => void; setMode: (mode: ThemeMode) => void; mode: ThemeMode } {
  const { isDark, toggle, setMode, mode } = useThemeStore()
  return { isDark, toggle, setMode, mode }
}
