import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface AppSettingsState {
  autoRefreshEnabled: boolean
  refreshIntervalMs: number
  setAutoRefreshEnabled: (enabled: boolean) => void
  setRefreshIntervalMs: (ms: number) => void
}

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      autoRefreshEnabled: false,
      refreshIntervalMs: 30000, // Default 30s
      setAutoRefreshEnabled: (enabled: boolean) => set({ autoRefreshEnabled: enabled }),
      setRefreshIntervalMs: (ms: number) => set({ refreshIntervalMs: ms })
    }),
    {
      name: 'app-settings-storage',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
