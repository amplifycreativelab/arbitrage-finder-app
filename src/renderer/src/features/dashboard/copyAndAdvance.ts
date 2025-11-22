import { trpcClient } from '../../lib/trpc'
import type { ArbitrageOpportunity } from '../../../../../shared/types'
import { applyDashboardFilters } from './filters'
import { sortOpportunities } from './sortOpportunities'
import { formatSignalPayload } from './signalPayload'
import { useFeedFiltersStore } from './stores/feedFiltersStore'
import { useFeedStore } from './stores/feedStore'

export interface CopyAndAdvanceResult {
  success: boolean
  reason?: 'no-opportunities' | 'no-selection' | 'clipboard-error'
  copiedOpportunityId?: string
  nextSelectedOpportunityId?: string | null
}

export async function copyAndAdvanceCurrentOpportunity(): Promise<CopyAndAdvanceResult> {
  const feedState = useFeedStore.getState()
  const filterState = useFeedFiltersStore.getState()

  const opportunities: ArbitrageOpportunity[] = Array.isArray(feedState.opportunities)
    ? feedState.opportunities
    : []

  if (opportunities.length === 0) {
    return {
      success: false,
      reason: 'no-opportunities'
    }
  }

  const {
    selectedOpportunityId,
    selectedOpportunityIndex,
    providerMetadata,
    processedOpportunityIds,
    sortBy,
    sortDirection
  } = feedState

  let currentId: string | null = selectedOpportunityId

  if (!currentId && typeof selectedOpportunityIndex === 'number') {
    const candidate = opportunities[selectedOpportunityIndex]
    if (candidate) {
      currentId = candidate.id
    }
  }

  if (!currentId) {
    return {
      success: false,
      reason: 'no-selection'
    }
  }

  const currentOpportunity = opportunities.find((entry) => entry.id === currentId) ?? null

  if (!currentOpportunity) {
    return {
      success: false,
      reason: 'no-selection'
    }
  }

  const payload = formatSignalPayload(currentOpportunity, providerMetadata ?? null)

  try {
    await trpcClient.copySignalToClipboard.mutate({ text: payload })
  } catch {
    return {
      success: false,
      reason: 'clipboard-error'
    }
  }

  const filtered = applyDashboardFilters(opportunities, {
    regions: filterState.regions,
    sports: filterState.sports,
    markets: filterState.markets,
    bookmakers: filterState.bookmakers,
    minRoi: filterState.minRoi
  })

  if (!Array.isArray(filtered) || filtered.length === 0) {
    return {
      success: true,
      copiedOpportunityId: currentId,
      nextSelectedOpportunityId: currentId
    }
  }

  const sorted = sortOpportunities(filtered, sortBy, sortDirection)
  const visibleIds = sorted.map((entry) => entry.id)

  const previousProcessed = processedOpportunityIds ?? new Set<string>()
  const nextProcessed = new Set(previousProcessed)
  nextProcessed.add(currentId)

  const currentIndex = visibleIds.indexOf(currentId)

  let nextIndex: number | null = null

  if (currentIndex !== -1) {
    for (let index = currentIndex + 1; index < visibleIds.length; index += 1) {
      const candidateId = visibleIds[index]
      if (!nextProcessed.has(candidateId)) {
        nextIndex = index
        break
      }
    }
  }

  const nextId =
    nextIndex != null && nextIndex >= 0 && nextIndex < visibleIds.length
      ? visibleIds[nextIndex]
      : currentId

  useFeedStore.setState((state) => ({
    ...state,
    processedOpportunityIds: nextProcessed,
    selectedOpportunityId: nextId,
    selectedOpportunityIndex:
      nextIndex != null && nextIndex >= 0 ? nextIndex : currentIndex >= 0 ? currentIndex : null
  }))

  return {
    success: true,
    copiedOpportunityId: currentId,
    nextSelectedOpportunityId: nextId
  }
}
