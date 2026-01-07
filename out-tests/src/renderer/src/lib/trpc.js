"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trpcClient = void 0;
const client_1 = require("@trpc/client");
const renderer_1 = require("electron-trpc/renderer");
const hasElectronTrpc = typeof globalThis !== 'undefined' &&
    typeof globalThis.electronTRPC !== 'undefined';
function createTestTrpcClient() {
    const notConnectedError = () => {
        throw new Error('TRPC renderer client is not connected. In tests or non-Electron environments, stub trpcClient methods as needed.');
    };
    const noopMutation = async (..._args) => {
        return notConnectedError();
    };
    const noopQuery = async (..._args) => {
        return notConnectedError();
    };
    const client = {
        saveApiKey: { mutate: noopMutation },
        isProviderConfigured: { query: noopQuery },
        getActiveProvider: { query: noopQuery },
        setActiveProvider: { mutate: noopMutation },
        getStorageStatus: { query: noopQuery },
        acknowledgeFallbackWarning: { mutate: noopMutation },
        getFeedSnapshot: { query: noopQuery },
        pollAndGetFeedSnapshot: { mutate: noopMutation },
        copySignalToClipboard: { mutate: noopMutation },
        openLogDirectory: { mutate: noopMutation }
    };
    return client;
}
exports.trpcClient = hasElectronTrpc
    ? (0, client_1.createTRPCProxyClient)({
        links: [(0, renderer_1.ipcLink)()]
    })
    : createTestTrpcClient();
