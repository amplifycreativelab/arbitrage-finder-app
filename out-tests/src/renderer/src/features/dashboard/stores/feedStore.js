"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useFeedStore = void 0;
const zustand_1 = require("zustand");
const types_1 = require("../../../../../../shared/types");
const trpc_1 = require("../../../lib/trpc");
const dashboardErrorStore_1 = require("./dashboardErrorStore");
exports.useFeedStore = (0, zustand_1.create)((set, get) => ({
    providerId: null,
    enabledProviderIds: [],
    providerMetadata: null,
    selectedOpportunityId: null,
    selectedOpportunityIndex: null,
    processedOpportunityIds: new Set(),
    opportunities: [],
    fetchedAt: null,
    status: null,
    isLoading: false,
    error: null,
    sortBy: 'time',
    sortDirection: 'asc',
    setSort: (key) => {
        const { sortBy, sortDirection } = get();
        if (key === sortBy) {
            set({
                sortBy: key,
                sortDirection: sortDirection === 'asc' ? 'desc' : 'asc'
            });
            return;
        }
        set({
            sortBy: key,
            sortDirection: key === 'roi' ? 'desc' : 'asc'
        });
    },
    setSnapshot: (snapshot) => {
        const providerMetadata = snapshot.providerId != null
            ? types_1.PROVIDERS.find((provider) => provider.id === snapshot.providerId) ?? null
            : null;
        set((state) => {
            const nextOpportunities = snapshot.opportunities ?? [];
            const nextProcessed = new Set();
            for (const id of state.processedOpportunityIds) {
                if (nextOpportunities.some((opportunity) => opportunity.id === id)) {
                    nextProcessed.add(id);
                }
            }
            return {
                providerId: snapshot.providerId,
                enabledProviderIds: snapshot.enabledProviderIds ?? [],
                providerMetadata,
                opportunities: nextOpportunities,
                fetchedAt: snapshot.fetchedAt,
                status: snapshot.status,
                processedOpportunityIds: nextProcessed
            };
        });
    },
    refreshSnapshot: async () => {
        set({
            isLoading: true,
            error: null
        });
        try {
            const result = await trpc_1.trpcClient.pollAndGetFeedSnapshot.mutate();
            // Clear any previous system error on success
            dashboardErrorStore_1.useDashboardErrorStore.getState().setSystemError(null);
            set((state) => {
                const nextOpportunities = result.opportunities ?? [];
                const nextProcessed = new Set();
                for (const id of state.processedOpportunityIds) {
                    if (nextOpportunities.some((opportunity) => opportunity.id === id)) {
                        nextProcessed.add(id);
                    }
                }
                return {
                    providerId: result.providerId ?? null,
                    enabledProviderIds: result.enabledProviderIds ?? [],
                    providerMetadata: result.providerId != null
                        ? types_1.PROVIDERS.find((provider) => provider.id === result.providerId) ?? null
                        : null,
                    opportunities: nextOpportunities,
                    fetchedAt: result.fetchedAt,
                    status: result.status ?? null,
                    isLoading: false,
                    error: null,
                    processedOpportunityIds: nextProcessed
                };
            });
        }
        catch (error) {
            const errorMessage = error?.message ?? 'Unable to load opportunities';
            // Store the simple error message in feed store for backward compatibility
            set({
                isLoading: false,
                error: errorMessage
            });
            // Also notify the dashboard error store for system error bar display
            dashboardErrorStore_1.useDashboardErrorStore.getState().setSystemError({
                category: 'SystemError',
                code: 'UNEXPECTED_ERROR',
                message: errorMessage,
                correlationId: `poll-${Date.now().toString(36)}`
            });
        }
    },
    setSelectedOpportunityId: (id, index) => {
        set({
            selectedOpportunityId: id,
            selectedOpportunityIndex: typeof index === 'number' ? index : null
        });
    },
    syncSelectionWithVisibleIds: (visibleOpportunityIds) => {
        const safeIds = Array.isArray(visibleOpportunityIds) ? visibleOpportunityIds : [];
        if (safeIds.length === 0) {
            set({
                selectedOpportunityId: null,
                selectedOpportunityIndex: null
            });
            return;
        }
        const { selectedOpportunityId, selectedOpportunityIndex } = get();
        const indexById = selectedOpportunityId != null ? safeIds.indexOf(selectedOpportunityId) : -1;
        if (indexById !== -1) {
            set((state) => {
                if (state.selectedOpportunityId === selectedOpportunityId &&
                    state.selectedOpportunityIndex === indexById) {
                    return state;
                }
                return {
                    selectedOpportunityId,
                    selectedOpportunityIndex: indexById
                };
            });
            return;
        }
        const nextIndex = selectedOpportunityIndex != null &&
            selectedOpportunityIndex >= 0 &&
            selectedOpportunityIndex < safeIds.length
            ? selectedOpportunityIndex
            : 0;
        const nextId = safeIds[nextIndex] ?? null;
        set((state) => {
            if (state.selectedOpportunityId === nextId &&
                state.selectedOpportunityIndex === nextIndex) {
                return state;
            }
            return {
                selectedOpportunityId: nextId,
                selectedOpportunityIndex: nextId != null ? nextIndex : null
            };
        });
    },
    moveSelectionByOffset: (offset, visibleOpportunityIds) => {
        const safeIds = Array.isArray(visibleOpportunityIds) ? visibleOpportunityIds : [];
        if (safeIds.length === 0 || offset === 0) {
            return;
        }
        const { selectedOpportunityId, selectedOpportunityIndex } = get();
        let baseIndex = selectedOpportunityId
            ? safeIds.indexOf(selectedOpportunityId)
            : -1;
        if (baseIndex === -1) {
            if (selectedOpportunityIndex != null &&
                selectedOpportunityIndex >= 0 &&
                selectedOpportunityIndex < safeIds.length) {
                baseIndex = selectedOpportunityIndex;
            }
        }
        if (baseIndex === -1) {
            baseIndex = offset > 0 ? -1 : safeIds.length;
        }
        const lastIndex = safeIds.length - 1;
        const rawTargetIndex = baseIndex + offset;
        const nextIndex = rawTargetIndex < 0
            ? 0
            : rawTargetIndex > lastIndex
                ? lastIndex
                : rawTargetIndex;
        const nextId = safeIds[nextIndex] ?? null;
        set((state) => {
            if (state.selectedOpportunityId === nextId &&
                state.selectedOpportunityIndex === nextIndex) {
                return state;
            }
            return {
                selectedOpportunityId: nextId,
                selectedOpportunityIndex: nextId != null ? nextIndex : null
            };
        });
    }
}));
