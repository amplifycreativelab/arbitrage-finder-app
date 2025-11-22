import { create } from 'zustand'

import type {
  ArbitrageOpportunity,
  DashboardStatusSnapshot,
  ProviderId,
  ProviderMetadata
} from '../../../../../../shared/types'
import { PROVIDERS } from '../../../../../../shared/types'
import { trpcClient } from '../../../lib/trpc'

export type FeedSortKey = 'time' | 'roi'
export type FeedSortDirection = 'asc' | 'desc'

export interface FeedSnapshot {
  providerId: ProviderId | null
  opportunities: ArbitrageOpportunity[]
  fetchedAt: string | null
  status: DashboardStatusSnapshot | null
}

interface FeedState {
  providerId: ProviderId | null
  providerMetadata: ProviderMetadata | null
  selectedOpportunityId: string | null
  selectedOpportunityIndex: number | null
   processedOpportunityIds: Set<string>
  opportunities: ArbitrageOpportunity[]
  fetchedAt: string | null
  status: DashboardStatusSnapshot | null
  isLoading: boolean
  error: string | null
  sortBy: FeedSortKey
  sortDirection: FeedSortDirection
  setSort: (key: FeedSortKey) => void
  setSnapshot: (snapshot: FeedSnapshot) => void
  refreshSnapshot: () => Promise<void>
  setSelectedOpportunityId: (id: string | null, index?: number | null) => void
  syncSelectionWithVisibleIds: (visibleOpportunityIds: string[]) => void
  moveSelectionByOffset: (offset: number, visibleOpportunityIds: string[]) => void
}

export const useFeedStore = create<FeedState>((set, get) => ({
  providerId: null,
  providerMetadata: null,
  selectedOpportunityId: null,
  selectedOpportunityIndex: null,
  processedOpportunityIds: new Set<string>(),
  opportunities: [],
  fetchedAt: null,
  status: null,
  isLoading: false,
  error: null,
  sortBy: 'time',
  sortDirection: 'asc',
  setSort: (key: FeedSortKey) => {
    const { sortBy, sortDirection } = get()

    if (key === sortBy) {
      set({
        sortBy: key,
        sortDirection: sortDirection === 'asc' ? 'desc' : 'asc'
      })
      return
    }

    set({
      sortBy: key,
      sortDirection: key === 'roi' ? 'desc' : 'asc'
    })
  },
  setSnapshot: (snapshot: FeedSnapshot) => {
    const providerMetadata =
      snapshot.providerId != null
        ? PROVIDERS.find((provider) => provider.id === snapshot.providerId) ?? null
        : null

    set((state) => {
      const nextOpportunities = snapshot.opportunities ?? []
      const nextProcessed = new Set<string>()

      for (const id of state.processedOpportunityIds) {
        if (nextOpportunities.some((opportunity) => opportunity.id === id)) {
          nextProcessed.add(id)
        }
      }

      return {
        providerId: snapshot.providerId,
        providerMetadata,
        opportunities: nextOpportunities,
        fetchedAt: snapshot.fetchedAt,
        status: snapshot.status,
        processedOpportunityIds: nextProcessed
      }
    })
  },
  refreshSnapshot: async () => {
    set({
      isLoading: true,
      error: null
    })

    try {
      const result = await trpcClient.pollAndGetFeedSnapshot.mutate()

      set((state) => {
        const nextOpportunities = result.opportunities ?? []
        const nextProcessed = new Set<string>()

        for (const id of state.processedOpportunityIds) {
          if (nextOpportunities.some((opportunity) => opportunity.id === id)) {
            nextProcessed.add(id)
          }
        }

        return {
          providerId: result.providerId ?? null,
          providerMetadata:
            result.providerId != null
              ? PROVIDERS.find(
                  (provider) => provider.id === (result.providerId as ProviderId)
                ) ?? null
              : null,
          opportunities: nextOpportunities,
          fetchedAt: result.fetchedAt,
          status: result.status ?? null,
          isLoading: false,
          error: null,
          processedOpportunityIds: nextProcessed
        }
      })
    } catch (error) {
      set({
        isLoading: false,
        error: (error as Error)?.message ?? 'Unable to load opportunities'
      })
    }
  },
  setSelectedOpportunityId: (id: string | null, index?: number | null) => {
    set({
      selectedOpportunityId: id,
      selectedOpportunityIndex: typeof index === 'number' ? index : null
    })
  },
  syncSelectionWithVisibleIds: (visibleOpportunityIds: string[]) => {
    const safeIds = Array.isArray(visibleOpportunityIds) ? visibleOpportunityIds : []

    if (safeIds.length === 0) {
      set({
        selectedOpportunityId: null,
        selectedOpportunityIndex: null
      })
      return
    }

    const { selectedOpportunityId, selectedOpportunityIndex } = get()

    const indexById =
      selectedOpportunityId != null ? safeIds.indexOf(selectedOpportunityId) : -1

    if (indexById !== -1) {
      set((state) => {
        if (
          state.selectedOpportunityId === selectedOpportunityId &&
          state.selectedOpportunityIndex === indexById
        ) {
          return state
        }

        return {
          selectedOpportunityId,
          selectedOpportunityIndex: indexById
        }
      })
      return
    }

    const nextIndex =
      selectedOpportunityIndex != null &&
      selectedOpportunityIndex >= 0 &&
      selectedOpportunityIndex < safeIds.length
        ? selectedOpportunityIndex
        : 0

    const nextId = safeIds[nextIndex] ?? null

    set((state) => {
      if (
        state.selectedOpportunityId === nextId &&
        state.selectedOpportunityIndex === nextIndex
      ) {
        return state
      }

      return {
        selectedOpportunityId: nextId,
        selectedOpportunityIndex: nextId != null ? nextIndex : null
      }
    })
  },
  moveSelectionByOffset: (offset: number, visibleOpportunityIds: string[]) => {
    const safeIds = Array.isArray(visibleOpportunityIds) ? visibleOpportunityIds : []

    if (safeIds.length === 0 || offset === 0) {
      return
    }

    const { selectedOpportunityId, selectedOpportunityIndex } = get()

    let baseIndex = selectedOpportunityId
      ? safeIds.indexOf(selectedOpportunityId)
      : -1

    if (baseIndex === -1) {
      if (
        selectedOpportunityIndex != null &&
        selectedOpportunityIndex >= 0 &&
        selectedOpportunityIndex < safeIds.length
      ) {
        baseIndex = selectedOpportunityIndex
      }
    }

    if (baseIndex === -1) {
      baseIndex = offset > 0 ? -1 : safeIds.length
    }

    const lastIndex = safeIds.length - 1
    const rawTargetIndex = baseIndex + offset
    const nextIndex =
      rawTargetIndex < 0
        ? 0
        : rawTargetIndex > lastIndex
          ? lastIndex
          : rawTargetIndex

    const nextId = safeIds[nextIndex] ?? null

    set((state) => {
      if (
        state.selectedOpportunityId === nextId &&
        state.selectedOpportunityIndex === nextIndex
      ) {
        return state
      }

      return {
        selectedOpportunityId: nextId,
        selectedOpportunityIndex: nextId != null ? nextIndex : null
      }
    })
  }
}))
