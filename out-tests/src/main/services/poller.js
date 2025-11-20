"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyActiveProviderChanged = notifyActiveProviderChanged;
exports.getActiveProviderForPolling = getActiveProviderForPolling;
let activeProviderIdForPolling = null;
function notifyActiveProviderChanged(providerId) {
    activeProviderIdForPolling = providerId;
    // Future stories will wire this into real poller/adapters refresh logic.
}
function getActiveProviderForPolling() {
    return activeProviderIdForPolling;
}
