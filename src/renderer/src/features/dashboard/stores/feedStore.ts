import { create } from 'zustand'

import type { ArbitrageOpportunity } from '../../../../../../shared/types'
import { trpcClient } from '../../../lib/trpc'

export type FeedSortKey = 'time' | 'roi'
export type FeedSortDirection = 'asc' | 'desc'

export interface FeedSnapshot {
  opportunities: ArbitrageOpportunity[]
  fetchedAt: string | null
}

interface FeedState {
  opportunities: ArbitrageOpportunity[]
  fetchedAt: string | null
  isLoading: boolean
  error: string | null
  sortBy: FeedSortKey
  sortDirection: FeedSortDirection
  setSort: (key: FeedSortKey) => void
  setSnapshot: (snapshot: FeedSnapshot) => void
  refreshSnapshot: () => Promise<void>
}

export const useFeedStore = create<FeedState>((set, get) => ({
  opportunities: [],
  fetchedAt: null,
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
    set({
      opportunities: snapshot.opportunities ?? [],
      fetchedAt: snapshot.fetchedAt
    })
  },
  refreshSnapshot: async () => {
    set({
      isLoading: true,
      error: null
    })

    try {
      const result = await trpcClient.pollAndGetFeedSnapshot.mutate()

      set({
        opportunities: result.opportunities,
        fetchedAt: result.fetchedAt,
        isLoading: false,
        error: null
      })
    } catch (error) {
      set({
        isLoading: false,
        error: (error as Error)?.message ?? 'Unable to load opportunities'
      })
    }
  }
}))
