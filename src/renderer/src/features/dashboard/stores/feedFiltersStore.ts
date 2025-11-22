import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { RegionCode } from '../../../../../../shared/filters'
import {
  ALL_MARKET_FILTERS,
  ALL_REGION_CODES,
  ALL_SPORT_FILTERS,
  type DashboardFilterState,
  type MarketFilterValue,
  type SportFilterValue
} from '../filters'

interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

const memoryStorage = (() => {
  const map = new Map<string, string>()

  const storage: StorageLike = {
    getItem: (key: string): string | null => {
      return map.has(key) ? map.get(key)! : null
    },
    setItem: (key: string, value: string): void => {
      map.set(key, value)
    },
    removeItem: (key: string): void => {
      map.delete(key)
    }
  }

  return storage
})()

function getStorage(): StorageLike {
  if (typeof window !== 'undefined' && window && window.localStorage) {
    return window.localStorage
  }

  return memoryStorage
}

const storage = createJSONStorage(() => getStorage())

export interface FeedFiltersState extends DashboardFilterState {
  setRegions: (regions: RegionCode[]) => void
  setSports: (sports: SportFilterValue[]) => void
  setMarkets: (markets: MarketFilterValue[]) => void
  setMinRoi: (minRoi: number) => void
  toggleRegion: (region: RegionCode) => void
  toggleSport: (sport: SportFilterValue) => void
  toggleMarket: (market: MarketFilterValue) => void
  resetFilters: () => void
}

const defaultState: DashboardFilterState = {
  regions: ALL_REGION_CODES,
  sports: ALL_SPORT_FILTERS,
  markets: ALL_MARKET_FILTERS,
  minRoi: 0
}

export const useFeedFiltersStore = create<FeedFiltersState>()(
  persist(
    (set, get) => ({
      ...defaultState,
      setRegions: (regions: RegionCode[]) => {
        set({
          regions: [...regions]
        })
      },
      setSports: (sports: SportFilterValue[]) => {
        set({
          sports: [...sports]
        })
      },
      setMarkets: (markets: MarketFilterValue[]) => {
        set({
          markets: [...markets]
        })
      },
      setMinRoi: (minRoi: number) => {
        set({
          minRoi: Number.isFinite(minRoi) && minRoi > 0 ? minRoi : 0
        })
      },
      toggleRegion: (region: RegionCode) => {
        const { regions } = get()
        if (regions.includes(region)) {
          set({
            regions: regions.filter((value) => value !== region)
          })
        } else {
          set({
            regions: [...regions, region]
          })
        }
      },
      toggleSport: (sport: SportFilterValue) => {
        const { sports } = get()
        if (sports.includes(sport)) {
          set({
            sports: sports.filter((value) => value !== sport)
          })
        } else {
          set({
            sports: [...sports, sport]
          })
        }
      },
      toggleMarket: (market: MarketFilterValue) => {
        const { markets } = get()
        if (markets.includes(market)) {
          set({
            markets: markets.filter((value) => value !== market)
          })
        } else {
          set({
            markets: [...markets, market]
          })
        }
      },
      resetFilters: () => {
        set({
          ...defaultState
        })
      }
    }),
    {
      name: 'dashboard-feed-filters',
      storage,
      partialize: (state) => ({
        regions: state.regions,
        sports: state.sports,
        markets: state.markets,
        minRoi: state.minRoi
      })
    }
  )
)
