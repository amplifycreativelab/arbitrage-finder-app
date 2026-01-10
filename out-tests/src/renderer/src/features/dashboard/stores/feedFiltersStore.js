"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useFeedFiltersStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const filters_1 = require("../filters");
const memoryStorage = (() => {
    const map = new Map();
    const storage = {
        getItem: (key) => {
            return map.has(key) ? map.get(key) : null;
        },
        setItem: (key, value) => {
            map.set(key, value);
        },
        removeItem: (key) => {
            map.delete(key);
        }
    };
    return storage;
})();
function getStorage() {
    if (typeof window !== 'undefined' && window && window.localStorage) {
        return window.localStorage;
    }
    return memoryStorage;
}
const storage = (0, middleware_1.createJSONStorage)(() => getStorage());
const defaultState = {
    regions: filters_1.ALL_REGION_CODES,
    sports: filters_1.ALL_SPORT_FILTERS,
    markets: filters_1.ALL_MARKET_FILTERS,
    marketGroups: filters_1.ALL_MARKET_GROUPS,
    bookmakers: [],
    bookmakerSelections: {},
    minRoi: 0
};
const getRegionKey = (regions) => {
    return regions.slice().sort().join(',');
};
exports.useFeedFiltersStore = (0, zustand_1.create)()((0, middleware_1.persist)((set, get) => ({
    ...defaultState,
    setRegions: (regions) => {
        const { bookmakerSelections } = get();
        const newKey = getRegionKey(regions);
        const restoredBookmakers = bookmakerSelections[newKey] ?? [];
        set({
            regions: [...regions],
            bookmakers: restoredBookmakers
        });
    },
    setSports: (sports) => {
        set({
            sports: [...sports]
        });
    },
    setMarkets: (markets) => {
        set({
            markets: [...markets]
        });
    },
    setMarketGroups: (marketGroups) => {
        set({
            marketGroups: [...marketGroups]
        });
    },
    setBookmakers: (bookmakers) => {
        const { regions, bookmakerSelections } = get();
        const regionKey = getRegionKey(regions);
        set({
            bookmakers: [...bookmakers],
            bookmakerSelections: {
                ...bookmakerSelections,
                [regionKey]: [...bookmakers]
            }
        });
    },
    setMinRoi: (minRoi) => {
        set({
            minRoi: Number.isFinite(minRoi) && minRoi > 0 ? minRoi : 0
        });
    },
    toggleRegion: (region) => {
        const { regions, bookmakerSelections } = get();
        let newRegions;
        if (regions.includes(region)) {
            newRegions = regions.filter((value) => value !== region);
        }
        else {
            newRegions = [...regions, region];
        }
        const newKey = getRegionKey(newRegions);
        const restoredBookmakers = bookmakerSelections[newKey] ?? [];
        set({
            regions: newRegions,
            bookmakers: restoredBookmakers
        });
    },
    toggleSport: (sport) => {
        const { sports } = get();
        if (sports.includes(sport)) {
            set({
                sports: sports.filter((value) => value !== sport)
            });
        }
        else {
            set({
                sports: [...sports, sport]
            });
        }
    },
    toggleMarket: (market) => {
        const { markets } = get();
        if (markets.includes(market)) {
            set({
                markets: markets.filter((value) => value !== market)
            });
        }
        else {
            set({
                markets: [...markets, market]
            });
        }
    },
    toggleMarketGroup: (marketGroup) => {
        const { marketGroups } = get();
        const groups = marketGroups ?? [];
        if (groups.includes(marketGroup)) {
            set({
                marketGroups: groups.filter((value) => value !== marketGroup)
            });
        }
        else {
            set({
                marketGroups: [...groups, marketGroup]
            });
        }
    },
    toggleBookmaker: (bookmaker) => {
        const { bookmakers, regions, bookmakerSelections } = get();
        let newBookmakers;
        if (bookmakers.includes(bookmaker)) {
            newBookmakers = bookmakers.filter((value) => value !== bookmaker);
        }
        else {
            newBookmakers = [...bookmakers, bookmaker];
        }
        const regionKey = getRegionKey(regions);
        set({
            bookmakers: newBookmakers,
            bookmakerSelections: {
                ...bookmakerSelections,
                [regionKey]: newBookmakers
            }
        });
    },
    resetFilters: () => {
        set({
            ...defaultState
        });
    }
}), {
    name: 'dashboard-feed-filters',
    storage,
    partialize: (state) => ({
        regions: state.regions,
        sports: state.sports,
        markets: state.markets,
        marketGroups: state.marketGroups,
        bookmakers: state.bookmakers,
        bookmakerSelections: state.bookmakerSelections,
        minRoi: state.minRoi
    })
}));
