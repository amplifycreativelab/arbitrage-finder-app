"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trpcClient = void 0;
const client_1 = require("@trpc/client");
const renderer_1 = require("electron-trpc/renderer");
const hasElectronTrpc = typeof globalThis !== 'undefined' &&
    typeof globalThis.electronTRPC !== 'undefined';
exports.trpcClient = (0, client_1.createTRPCProxyClient)({
    // In Electron renderer we use ipcLink; in tests or non-Electron environments
    // we fall back to an empty link array and avoid touching the electronTRPC global.
    links: hasElectronTrpc ? [(0, renderer_1.ipcLink)()] : []
});
