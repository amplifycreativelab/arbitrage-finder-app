"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useFeedStore = void 0;
const zustand_1 = require("zustand");
const trpc_1 = require("../../../lib/trpc");
exports.useFeedStore = (0, zustand_1.create)((set, get) => ({
    opportunities: [],
    fetchedAt: null,
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
        set({
            opportunities: snapshot.opportunities ?? [],
            fetchedAt: snapshot.fetchedAt
        });
    },
    refreshSnapshot: async () => {
        set({
            isLoading: true,
            error: null
        });
        try {
            const result = await trpc_1.trpcClient.pollAndGetFeedSnapshot.mutate();
            set({
                opportunities: result.opportunities,
                fetchedAt: result.fetchedAt,
                isLoading: false,
                error: null
            });
        }
        catch (error) {
            set({
                isLoading: false,
                error: error?.message ?? 'Unable to load opportunities'
            });
        }
    }
}));
