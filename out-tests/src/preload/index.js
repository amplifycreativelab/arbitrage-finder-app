"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const preload_1 = require("@electron-toolkit/preload");
const client_1 = require("@trpc/client");
const renderer_1 = require("electron-trpc/renderer");
// Electron-TRPC bridge: attach to both preload globalThis and renderer via contextBridge
const exposeElectronTRPC = () => {
    const handler = {
        sendMessage: (operation) => electron_1.ipcRenderer.send(renderer_1.ELECTRON_TRPC_CHANNEL, operation),
        onMessage: (callback) => electron_1.ipcRenderer.on(renderer_1.ELECTRON_TRPC_CHANNEL, (_event, payload) => callback(payload))
    };
    globalThis.electronTRPC = handler;
    if (process.contextIsolated) {
        try {
            electron_1.contextBridge.exposeInMainWorld('electronTRPC', handler);
        }
        catch {
            // no-op if already exposed
        }
    }
    else {
        // @ts-ignore
        window.electronTRPC = handler;
    }
};
// Register the TRPC bridge immediately so renderer and preload can find it before creating clients.
exposeElectronTRPC();
const trpcClient = (0, client_1.createTRPCProxyClient)({
    links: [(0, renderer_1.ipcLink)()]
});
const credentialsApi = {
    async saveApiKey(providerId, apiKey) {
        await trpcClient.saveApiKey.mutate({ providerId, apiKey });
    },
    async isProviderConfigured(providerId) {
        const result = await trpcClient.isProviderConfigured.query({ providerId });
        return result.isConfigured;
    },
    async getStorageStatus() {
        return trpcClient.getStorageStatus.query();
    },
    async acknowledgeFallbackWarning() {
        await trpcClient.acknowledgeFallbackWarning.mutate();
    }
};
// Custom APIs for renderer
const api = {
    credentials: credentialsApi
};
if (process.contextIsolated) {
    try {
        electron_1.contextBridge.exposeInMainWorld('electron', preload_1.electronAPI);
        electron_1.contextBridge.exposeInMainWorld('api', api);
    }
    catch (error) {
        console.error(error);
    }
}
else {
    // @ts-ignore (define in dts)
    window.electron = preload_1.electronAPI;
    // @ts-ignore (define in dts)
    window.api = api;
}
