import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { RegionCode } from '../../../../../../shared/filters'
import {
  ALL_MARKET_FILTERS,
  ALL_MARKET_GROUPS,
  ALL_REGION_CODES,
  ALL_SPORT_FILTERS,
  type DashboardFilterState,
  type MarketFilterValue,
  type MarketGroup,
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
  bookmakerSelections: Record<string, string[]>
  continuousDeepScanEnabled: boolean
  continuousDeepScanMaxEventsPerCycle: number
  deepScanCacheTtlMinutes: number
  deepScanBatchSize: number
  deepScanRoiThresholds: {
    globalMinRoi: number
    marketGroupMinRoi: Partial<Record<MarketGroup, number>>
  }
  setRegions: (regions: RegionCode[]) => void
  setSports: (sports: SportFilterValue[]) => void
  setMarkets: (markets: MarketFilterValue[]) => void
  setMarketGroups: (marketGroups: MarketGroup[]) => void
  setBookmakers: (bookmakers: string[]) => void
  setMinRoi: (minRoi: number) => void
  setContinuousDeepScanEnabled: (enabled: boolean) => void
  setContinuousDeepScanMaxEventsPerCycle: (maxEvents: number) => void
  setDeepScanCacheTtlMinutes: (minutes: number) => void
  setDeepScanBatchSize: (size: number) => void
  setDeepScanGlobalMinRoi: (minRoi: number) => void
  setDeepScanMarketGroupMinRoi: (group: MarketGroup, minRoi: number) => void
  toggleRegion: (region: RegionCode) => void
  toggleSport: (sport: SportFilterValue) => void
  toggleMarket: (market: MarketFilterValue) => void
  toggleMarketGroup: (marketGroup: MarketGroup) => void
  toggleBookmaker: (bookmaker: string) => void
  resetFilters: () => void
}

const defaultState = {
  regions: ALL_REGION_CODES,
  sports: ALL_SPORT_FILTERS,
  markets: ALL_MARKET_FILTERS,
  marketGroups: ALL_MARKET_GROUPS,
  bookmakers: [],
  bookmakerSelections: {},
  minRoi: 0,
  continuousDeepScanEnabled: true,
  continuousDeepScanMaxEventsPerCycle: 50,
  deepScanCacheTtlMinutes: 5,
  deepScanBatchSize: 10,
  deepScanRoiThresholds: {
    globalMinRoi: 0,
    marketGroupMinRoi: {}
  }
}

const getRegionKey = (regions: RegionCode[]): string => {
  return regions.slice().sort().join(',')
}

const normalizeMinRoi = (minRoi: number): number => {
  return Number.isFinite(minRoi) && minRoi > 0 ? minRoi : 0
}

export const useFeedFiltersStore = create<FeedFiltersState>()(
  persist(
    (set, get) => ({
      ...defaultState,
      setRegions: (regions: RegionCode[]) => {
        const { bookmakerSelections } = get()
        const newKey = getRegionKey(regions)
        const restoredBookmakers = bookmakerSelections[newKey] ?? []
        set({
          regions: [...regions],
          bookmakers: restoredBookmakers
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
      setMarketGroups: (marketGroups: MarketGroup[]) => {
        set({
          marketGroups: [...marketGroups]
        })
      },
      setBookmakers: (bookmakers: string[]) => {
        const { regions, bookmakerSelections } = get()
        const regionKey = getRegionKey(regions)
        set({
          bookmakers: [...bookmakers],
          bookmakerSelections: {
            ...bookmakerSelections,
            [regionKey]: [...bookmakers]
          }
        })
      },
      setMinRoi: (minRoi: number) => {
        set({
          minRoi: normalizeMinRoi(minRoi)
        })
      },
      setContinuousDeepScanEnabled: (enabled: boolean) => {
        set({
          continuousDeepScanEnabled: Boolean(enabled)
        })
      },
      setContinuousDeepScanMaxEventsPerCycle: (maxEvents: number) => {
        const normalized = Number.isFinite(maxEvents) ? Math.max(1, Math.floor(maxEvents)) : 50
        set({
          continuousDeepScanMaxEventsPerCycle: normalized
        })
      },
      setDeepScanCacheTtlMinutes: (minutes: number) => {
        const normalized = Number.isFinite(minutes) ? Math.max(1, Math.min(60, Math.floor(minutes))) : 5
        set({
          deepScanCacheTtlMinutes: normalized
        })
      },
      setDeepScanBatchSize: (size: number) => {
        const normalized = Number.isFinite(size) ? Math.max(5, Math.min(50, Math.floor(size))) : 10
        set({
          deepScanBatchSize: normalized
        })
      },
      setDeepScanGlobalMinRoi: (minRoi: number) => {
        const { deepScanRoiThresholds } = get()
        set({
          deepScanRoiThresholds: {
            ...deepScanRoiThresholds,
            globalMinRoi: normalizeMinRoi(minRoi)
          }
        })
      },
      setDeepScanMarketGroupMinRoi: (group: MarketGroup, minRoi: number) => {
        const { deepScanRoiThresholds } = get()
        const nextValue = normalizeMinRoi(minRoi)
        const nextOverrides = {
          ...deepScanRoiThresholds.marketGroupMinRoi
        }
        if (nextValue > 0) {
          nextOverrides[group] = nextValue
        } else {
          delete nextOverrides[group]
        }
        set({
          deepScanRoiThresholds: {
            ...deepScanRoiThresholds,
            marketGroupMinRoi: nextOverrides
          }
        })
      },
      toggleRegion: (region: RegionCode) => {
        const { regions, bookmakerSelections } = get()
        let newRegions: RegionCode[]
        if (regions.includes(region)) {
          newRegions = regions.filter((value) => value !== region)
        } else {
          newRegions = [...regions, region]
        }
        const newKey = getRegionKey(newRegions)
        const restoredBookmakers = bookmakerSelections[newKey] ?? []
        set({
          regions: newRegions,
          bookmakers: restoredBookmakers
        })
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
      toggleMarketGroup: (marketGroup: MarketGroup) => {
        const { marketGroups } = get()
        const groups = marketGroups ?? []
        if (groups.includes(marketGroup)) {
          set({
            marketGroups: groups.filter((value) => value !== marketGroup)
          })
        } else {
          set({
            marketGroups: [...groups, marketGroup]
          })
        }
      },
      toggleBookmaker: (bookmaker: string) => {
        const { bookmakers, regions, bookmakerSelections } = get()
        let newBookmakers: string[]
        if (bookmakers.includes(bookmaker)) {
          newBookmakers = bookmakers.filter((value) => value !== bookmaker)
        } else {
          newBookmakers = [...bookmakers, bookmaker]
        }
        const regionKey = getRegionKey(regions)
        set({
          bookmakers: newBookmakers,
          bookmakerSelections: {
            ...bookmakerSelections,
            [regionKey]: newBookmakers
          }
        })
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
        marketGroups: state.marketGroups,
        bookmakers: state.bookmakers,
        bookmakerSelections: state.bookmakerSelections,
        minRoi: state.minRoi,
        continuousDeepScanEnabled: state.continuousDeepScanEnabled,
        continuousDeepScanMaxEventsPerCycle: state.continuousDeepScanMaxEventsPerCycle,
        deepScanCacheTtlMinutes: state.deepScanCacheTtlMinutes,
        deepScanBatchSize: state.deepScanBatchSize,
        deepScanRoiThresholds: state.deepScanRoiThresholds
      })
    }
  )
)
