import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Currency } from '../../../../../../shared/lib/currency'
import type { CardCountingRule, BookmakerCardRules } from '../../../../../../shared/types'
import { DEFAULT_CARD_COUNTING_RULE } from '../../../../../../shared/types'

interface AppSettingsState {
  // Auto-refresh settings
  autoRefreshEnabled: boolean
  refreshIntervalMs: number
  setAutoRefreshEnabled: (enabled: boolean) => void
  setRefreshIntervalMs: (ms: number) => void

  // Currency settings (Story 8.4)
  baseCurrency: Currency
  exchangeRates: Record<Currency, number>
  ratesLastFetched: string | null
  setBaseCurrency: (currency: Currency) => void
  setExchangeRates: (rates: Record<Currency, number>, timestamp: string) => void

  // Card counting rules (Story 1.5)
  bookmakerCardRules: BookmakerCardRules
  setBookmakerCardRule: (bookmaker: string, rule: CardCountingRule) => void
  getBookmakerCardRule: (bookmaker: string) => CardCountingRule
  removeBookmakerCardRule: (bookmaker: string) => void
}

const DEFAULT_RATES: Record<Currency, number> = {
  USD: 1,
  AUD: 1.5,
  EUR: 0.85
}

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set, get) => ({
      // Auto-refresh settings
      autoRefreshEnabled: false,
      refreshIntervalMs: 30000, // Default 30s
      setAutoRefreshEnabled: (enabled: boolean) => set({ autoRefreshEnabled: enabled }),
      setRefreshIntervalMs: (ms: number) => set({ refreshIntervalMs: ms }),

      // Currency settings (Story 8.4)
      baseCurrency: 'USD',
      exchangeRates: DEFAULT_RATES,
      ratesLastFetched: null,
      setBaseCurrency: (currency: Currency) => set({ baseCurrency: currency }),
      setExchangeRates: (rates: Record<Currency, number>, timestamp: string) =>
        set({ exchangeRates: rates, ratesLastFetched: timestamp }),

      // Card counting rules (Story 1.5)
      bookmakerCardRules: {},
      setBookmakerCardRule: (bookmaker: string, rule: CardCountingRule) =>
        set((state) => ({
          bookmakerCardRules: {
            ...state.bookmakerCardRules,
            [bookmaker]: rule
          }
        })),
      getBookmakerCardRule: (bookmaker: string): CardCountingRule => {
        const state = get()
        return state.bookmakerCardRules[bookmaker] ?? DEFAULT_CARD_COUNTING_RULE
      },
      removeBookmakerCardRule: (bookmaker: string) =>
        set((state) => {
          const { [bookmaker]: _, ...rest } = state.bookmakerCardRules
          return { bookmakerCardRules: rest }
        })
    }),
    {
      name: 'app-settings-storage',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
