"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepScanButton = DeepScanButton;
const jsx_runtime_1 = require("react/jsx-runtime");
const button_1 = require("../../components/ui/button");
const deepScanStore_1 = require("./stores/deepScanStore");
function DeepScanButton() {
    const status = (0, deepScanStore_1.useDeepScanStore)((state) => state.progress.status);
    const isStarting = (0, deepScanStore_1.useDeepScanStore)((state) => state.isStarting);
    const setDialogOpen = (0, deepScanStore_1.useDeepScanStore)((state) => state.setDialogOpen);
    const cancelScan = (0, deepScanStore_1.useDeepScanStore)((state) => state.cancelScan);
    const isScanning = status === 'scanning';
    if (isScanning) {
        return ((0, jsx_runtime_1.jsx)(button_1.Button, { variant: "outline", className: "h-8 px-3 text-[11px]", onClick: () => void cancelScan(), "data-testid": "deep-scan-cancel-button", children: "Cancel Scan" }));
    }
    return ((0, jsx_runtime_1.jsx)(button_1.Button, { className: "h-8 px-3 text-[11px]", onClick: () => setDialogOpen(true), disabled: isStarting, "data-testid": "deep-scan-start-button", children: "Start Deep Scan" }));
}
exports.default = DeepScanButton;
