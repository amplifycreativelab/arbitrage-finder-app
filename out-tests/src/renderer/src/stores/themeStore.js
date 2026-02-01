"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useThemeStore = void 0;
exports.initTheme = initTheme;
exports.useTheme = useTheme;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const STORAGE_KEY = 'arb-finder-theme';
function getSystemTheme() {
    if (typeof window === 'undefined')
        return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function applyTheme(isDark) {
    if (typeof document === 'undefined')
        return;
    const root = document.documentElement;
    if (isDark) {
        root.classList.add('dark');
    }
    else {
        root.classList.remove('dark');
    }
}
exports.useThemeStore = (0, zustand_1.create)()((0, middleware_1.persist)((set, get) => ({
    mode: 'system',
    isDark: false,
    setMode: (mode) => {
        const isDark = mode === 'system' ? getSystemTheme() : mode === 'dark';
        applyTheme(isDark);
        set({ mode, isDark });
    },
    toggle: () => {
        const newMode = get().isDark ? 'light' : 'dark';
        const isDark = newMode === 'dark';
        applyTheme(isDark);
        set({ mode: newMode, isDark });
    },
    resolveTheme: () => {
        const { mode } = get();
        const isDark = mode === 'system' ? getSystemTheme() : mode === 'dark';
        applyTheme(isDark);
        set({ isDark });
    },
}), {
    name: STORAGE_KEY,
    onRehydrateStorage: () => (state) => {
        if (state) {
            const isDark = state.mode === 'system' ? getSystemTheme() : state.mode === 'dark';
            applyTheme(isDark);
            state.isDark = isDark;
        }
    },
}));
// Initialize theme on load
function initTheme() {
    if (typeof window === 'undefined')
        return;
    const state = exports.useThemeStore.getState();
    state.resolveTheme();
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
        if (exports.useThemeStore.getState().mode === 'system') {
            const isDark = e.matches;
            applyTheme(isDark);
            exports.useThemeStore.setState({ isDark });
        }
    });
}
// Helper for theme initialization in components
function useTheme() {
    const { isDark, toggle, setMode, mode } = (0, exports.useThemeStore)();
    return { isDark, toggle, setMode, mode };
}
