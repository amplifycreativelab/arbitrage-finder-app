"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDashboardErrorStore = void 0;
const zustand_1 = require("zustand");
const mapIpcError_1 = require("../../../lib/mapIpcError");
function generateErrorId() {
    return `err-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}
exports.useDashboardErrorStore = (0, zustand_1.create)((set) => ({
    systemError: null,
    providerErrors: new Map(),
    inlineErrors: new Map(),
    setSystemError: (error) => {
        if (error === null) {
            set({ systemError: null });
            return;
        }
        const mappedError = (0, mapIpcError_1.mapIpcError)(error);
        set({
            systemError: {
                id: generateErrorId(),
                mappedError,
                timestamp: Date.now(),
                dismissed: false
            }
        });
    },
    dismissSystemError: () => {
        set((state) => {
            if (!state.systemError)
                return state;
            return {
                systemError: { ...state.systemError, dismissed: true }
            };
        });
        // Clear after a short delay to allow exit animation
        setTimeout(() => {
            set({ systemError: null });
        }, 300);
    },
    setProviderError: (providerId, error) => {
        set((state) => {
            const newErrors = new Map(state.providerErrors);
            if (error === null) {
                newErrors.delete(providerId);
            }
            else {
                const mappedError = (0, mapIpcError_1.mapIpcError)(error);
                newErrors.set(providerId, {
                    id: generateErrorId(),
                    mappedError,
                    timestamp: Date.now(),
                    dismissed: false
                });
            }
            return { providerErrors: newErrors };
        });
    },
    dismissProviderError: (providerId) => {
        set((state) => {
            const newErrors = new Map(state.providerErrors);
            const existing = newErrors.get(providerId);
            if (existing) {
                newErrors.set(providerId, { ...existing, dismissed: true });
            }
            return { providerErrors: newErrors };
        });
        // Clear after delay
        setTimeout(() => {
            set((state) => {
                const newErrors = new Map(state.providerErrors);
                newErrors.delete(providerId);
                return { providerErrors: newErrors };
            });
        }, 300);
    },
    clearProviderErrors: () => {
        set({ providerErrors: new Map() });
    },
    setInlineError: (controlId, error) => {
        set((state) => {
            const newErrors = new Map(state.inlineErrors);
            if (error === null) {
                newErrors.delete(controlId);
            }
            else {
                const mappedError = (0, mapIpcError_1.mapIpcError)(error);
                newErrors.set(controlId, {
                    id: generateErrorId(),
                    mappedError,
                    timestamp: Date.now(),
                    dismissed: false
                });
            }
            return { inlineErrors: newErrors };
        });
    },
    dismissInlineError: (controlId) => {
        set((state) => {
            const newErrors = new Map(state.inlineErrors);
            newErrors.delete(controlId);
            return { inlineErrors: newErrors };
        });
    },
    clearInlineErrors: () => {
        set({ inlineErrors: new Map() });
    },
    clearAllErrors: () => {
        set({
            systemError: null,
            providerErrors: new Map(),
            inlineErrors: new Map()
        });
    }
}));
