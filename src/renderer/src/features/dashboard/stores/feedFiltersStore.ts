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
// Story 8.7: Aggressive scan imports
import type { TierBoundaries, TierWeights } from '../../../../../../shared/types'
import { DEFAULT_TIER_BOUNDARIES, DEFAULT_TIER_WEIGHTS, DEFAULT_AGGRESSIVE_SCAN_CONFIG } from '../../../../../../shared/types'

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
  deepScanIntervalMinutes: number
  deepScanConcurrentRequests: number
  deepScanScope: 'all-sports' | 'selected-sports' | 'selected-leagues'
  // Story 8.7: Aggressive scan settings
  aggressiveScanEnabled: boolean
  aggressiveScanQuotaTargetPercent: number
  aggressiveScanHorizonHours: number
  aggressiveScanImminentIntervalSeconds: number
  aggressiveScanTierBoundaries: TierBoundaries
  aggressiveScanTierWeights: TierWeights
  aggressiveScanBoostDurationMinutes: number
  aggressiveScanBoostIntervalSeconds: number
  aggressiveScanMaxBoostedEvents: number
  aggressiveScanMaxCachedEvents: number
  aggressiveScanDiscoveryIntervalMinutes: number
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
  setDeepScanIntervalMinutes: (minutes: number) => void
  setDeepScanConcurrentRequests: (concurrentRequests: number) => void
  setDeepScanScope: (scope: 'all-sports' | 'selected-sports' | 'selected-leagues') => void
  // Story 8.7: Aggressive scan setters
  setAggressiveScanEnabled: (enabled: boolean) => void
  setAggressiveScanQuotaTargetPercent: (percent: number) => void
  setAggressiveScanHorizonHours: (hours: number) => void
  setAggressiveScanImminentIntervalSeconds: (seconds: number) => void
  setAggressiveScanTierBoundaries: (boundaries: TierBoundaries) => void
  setAggressiveScanTierWeights: (weights: TierWeights) => void
  setAggressiveScanBoostDurationMinutes: (minutes: number) => void
  setAggressiveScanBoostIntervalSeconds: (seconds: number) => void
  setAggressiveScanMaxBoostedEvents: (count: number) => void
  setAggressiveScanMaxCachedEvents: (count: number) => void
  setAggressiveScanDiscoveryIntervalMinutes: (minutes: number) => void
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
  },
  deepScanIntervalMinutes: 5,
  deepScanConcurrentRequests: 2,
  deepScanScope: 'all-sports' as const,
  // Story 8.7: Aggressive scan defaults
  aggressiveScanEnabled: DEFAULT_AGGRESSIVE_SCAN_CONFIG.enabled,
  aggressiveScanQuotaTargetPercent: DEFAULT_AGGRESSIVE_SCAN_CONFIG.quotaTargetPercent,
  aggressiveScanHorizonHours: DEFAULT_AGGRESSIVE_SCAN_CONFIG.scanHorizonHours,
  aggressiveScanImminentIntervalSeconds: DEFAULT_AGGRESSIVE_SCAN_CONFIG.imminentPollIntervalSeconds,
  aggressiveScanTierBoundaries: DEFAULT_TIER_BOUNDARIES,
  aggressiveScanTierWeights: DEFAULT_TIER_WEIGHTS,
  aggressiveScanBoostDurationMinutes: DEFAULT_AGGRESSIVE_SCAN_CONFIG.arbBoostDurationMinutes,
  aggressiveScanBoostIntervalSeconds: DEFAULT_AGGRESSIVE_SCAN_CONFIG.arbBoostPollIntervalSeconds,
  aggressiveScanMaxBoostedEvents: DEFAULT_AGGRESSIVE_SCAN_CONFIG.maxBoostedEvents,
  aggressiveScanMaxCachedEvents: DEFAULT_AGGRESSIVE_SCAN_CONFIG.maxCachedEvents,
  aggressiveScanDiscoveryIntervalMinutes: DEFAULT_AGGRESSIVE_SCAN_CONFIG.eventDiscoveryIntervalMinutes
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
      setDeepScanIntervalMinutes: (minutes: number) => {
        const normalized = Number.isFinite(minutes) ? Math.max(1, Math.min(30, Math.floor(minutes))) : 5
        set({
          deepScanIntervalMinutes: normalized
        })
      },
      setDeepScanConcurrentRequests: (concurrentRequests: number) => {
        const normalized = Number.isFinite(concurrentRequests) ? Math.max(1, Math.min(10, Math.floor(concurrentRequests))) : 2
        set({
          deepScanConcurrentRequests: normalized
        })
      },
      setDeepScanScope: (scope: 'all-sports' | 'selected-sports' | 'selected-leagues') => {
        set({
          deepScanScope: scope
        })
      },
      // Story 8.7: Aggressive scan setters
      setAggressiveScanEnabled: (enabled: boolean) => {
        set({ aggressiveScanEnabled: Boolean(enabled) })
      },
      setAggressiveScanQuotaTargetPercent: (percent: number) => {
        const normalized = Number.isFinite(percent) ? Math.max(50, Math.min(90, Math.floor(percent))) : 75
        set({ aggressiveScanQuotaTargetPercent: normalized })
      },
      setAggressiveScanHorizonHours: (hours: number) => {
        const normalized = Number.isFinite(hours) ? Math.max(12, Math.min(72, Math.floor(hours))) : 48
        set({ aggressiveScanHorizonHours: normalized })
      },
      setAggressiveScanImminentIntervalSeconds: (seconds: number) => {
        const normalized = Number.isFinite(seconds) ? Math.max(15, Math.min(120, Math.floor(seconds))) : 45
        set({ aggressiveScanImminentIntervalSeconds: normalized })
      },
      setAggressiveScanTierBoundaries: (boundaries: TierBoundaries) => {
        set({ aggressiveScanTierBoundaries: boundaries })
      },
      setAggressiveScanTierWeights: (weights: TierWeights) => {
        set({ aggressiveScanTierWeights: weights })
      },
      setAggressiveScanBoostDurationMinutes: (minutes: number) => {
        const normalized = Number.isFinite(minutes) ? Math.max(1, Math.min(30, Math.floor(minutes))) : 5
        set({ aggressiveScanBoostDurationMinutes: normalized })
      },
      setAggressiveScanBoostIntervalSeconds: (seconds: number) => {
        const normalized = Number.isFinite(seconds) ? Math.max(10, Math.min(60, Math.floor(seconds))) : 20
        set({ aggressiveScanBoostIntervalSeconds: normalized })
      },
      setAggressiveScanMaxBoostedEvents: (count: number) => {
        const normalized = Number.isFinite(count) ? Math.max(1, Math.min(50, Math.floor(count))) : 10
        set({ aggressiveScanMaxBoostedEvents: normalized })
      },
      setAggressiveScanMaxCachedEvents: (count: number) => {
        const normalized = Number.isFinite(count) ? Math.max(100, Math.min(10000, Math.floor(count))) : 3000
        set({ aggressiveScanMaxCachedEvents: normalized })
      },
      setAggressiveScanDiscoveryIntervalMinutes: (minutes: number) => {
        const normalized = Number.isFinite(minutes) ? Math.max(10, Math.min(120, Math.floor(minutes))) : 30
        set({ aggressiveScanDiscoveryIntervalMinutes: normalized })
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
        deepScanRoiThresholds: state.deepScanRoiThresholds,
        deepScanIntervalMinutes: state.deepScanIntervalMinutes,
        deepScanConcurrentRequests: state.deepScanConcurrentRequests,
        deepScanScope: state.deepScanScope,
        // Story 8.7: Persist aggressive scan settings
        aggressiveScanEnabled: state.aggressiveScanEnabled,
        aggressiveScanQuotaTargetPercent: state.aggressiveScanQuotaTargetPercent,
        aggressiveScanHorizonHours: state.aggressiveScanHorizonHours,
        aggressiveScanImminentIntervalSeconds: state.aggressiveScanImminentIntervalSeconds,
        aggressiveScanTierBoundaries: state.aggressiveScanTierBoundaries,
        aggressiveScanTierWeights: state.aggressiveScanTierWeights,
        aggressiveScanBoostDurationMinutes: state.aggressiveScanBoostDurationMinutes,
        aggressiveScanBoostIntervalSeconds: state.aggressiveScanBoostIntervalSeconds,
        aggressiveScanMaxBoostedEvents: state.aggressiveScanMaxBoostedEvents,
        aggressiveScanMaxCachedEvents: state.aggressiveScanMaxCachedEvents,
        aggressiveScanDiscoveryIntervalMinutes: state.aggressiveScanDiscoveryIntervalMinutes
      })
    }
  )
)
