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
    minRoi: 0
};
exports.useFeedFiltersStore = (0, zustand_1.create)()((0, middleware_1.persist)((set, get) => ({
    ...defaultState,
    setRegions: (regions) => {
        set({
            regions: [...regions]
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
    setMinRoi: (minRoi) => {
        set({
            minRoi: Number.isFinite(minRoi) && minRoi > 0 ? minRoi : 0
        });
    },
    toggleRegion: (region) => {
        const { regions } = get();
        if (regions.includes(region)) {
            set({
                regions: regions.filter((value) => value !== region)
            });
        }
        else {
            set({
                regions: [...regions, region]
            });
        }
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
        minRoi: state.minRoi
    })
}));
