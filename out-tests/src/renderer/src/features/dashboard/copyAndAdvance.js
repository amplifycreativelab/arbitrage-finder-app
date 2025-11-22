"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyAndAdvanceCurrentOpportunity = copyAndAdvanceCurrentOpportunity;
const trpc_1 = require("../../lib/trpc");
const filters_1 = require("./filters");
const sortOpportunities_1 = require("./sortOpportunities");
const signalPayload_1 = require("./signalPayload");
const feedFiltersStore_1 = require("./stores/feedFiltersStore");
const feedStore_1 = require("./stores/feedStore");
async function copyAndAdvanceCurrentOpportunity() {
    const feedState = feedStore_1.useFeedStore.getState();
    const filterState = feedFiltersStore_1.useFeedFiltersStore.getState();
    const opportunities = Array.isArray(feedState.opportunities)
        ? feedState.opportunities
        : [];
    if (opportunities.length === 0) {
        return {
            success: false,
            reason: 'no-opportunities'
        };
    }
    const { selectedOpportunityId, selectedOpportunityIndex, providerMetadata, processedOpportunityIds, sortBy, sortDirection } = feedState;
    let currentId = selectedOpportunityId;
    if (!currentId && typeof selectedOpportunityIndex === 'number') {
        const candidate = opportunities[selectedOpportunityIndex];
        if (candidate) {
            currentId = candidate.id;
        }
    }
    if (!currentId) {
        return {
            success: false,
            reason: 'no-selection'
        };
    }
    const currentOpportunity = opportunities.find((entry) => entry.id === currentId) ?? null;
    if (!currentOpportunity) {
        return {
            success: false,
            reason: 'no-selection'
        };
    }
    const payload = (0, signalPayload_1.formatSignalPayload)(currentOpportunity, providerMetadata ?? null);
    try {
        await trpc_1.trpcClient.copySignalToClipboard.mutate({ text: payload });
    }
    catch {
        return {
            success: false,
            reason: 'clipboard-error'
        };
    }
    const filtered = (0, filters_1.applyDashboardFilters)(opportunities, {
        regions: filterState.regions,
        sports: filterState.sports,
        markets: filterState.markets,
        bookmakers: filterState.bookmakers,
        minRoi: filterState.minRoi
    });
    if (!Array.isArray(filtered) || filtered.length === 0) {
        return {
            success: true,
            copiedOpportunityId: currentId,
            nextSelectedOpportunityId: currentId
        };
    }
    const sorted = (0, sortOpportunities_1.sortOpportunities)(filtered, sortBy, sortDirection);
    const visibleIds = sorted.map((entry) => entry.id);
    const previousProcessed = processedOpportunityIds ?? new Set();
    const nextProcessed = new Set(previousProcessed);
    nextProcessed.add(currentId);
    const currentIndex = visibleIds.indexOf(currentId);
    let nextIndex = null;
    if (currentIndex !== -1) {
        for (let index = currentIndex + 1; index < visibleIds.length; index += 1) {
            const candidateId = visibleIds[index];
            if (!nextProcessed.has(candidateId)) {
                nextIndex = index;
                break;
            }
        }
    }
    const nextId = nextIndex != null && nextIndex >= 0 && nextIndex < visibleIds.length
        ? visibleIds[nextIndex]
        : currentId;
    feedStore_1.useFeedStore.setState((state) => ({
        ...state,
        processedOpportunityIds: nextProcessed,
        selectedOpportunityId: nextId,
        selectedOpportunityIndex: nextIndex != null && nextIndex >= 0 ? nextIndex : currentIndex >= 0 ? currentIndex : null
    }));
    return {
        success: true,
        copiedOpportunityId: currentId,
        nextSelectedOpportunityId: nextId
    };
}
