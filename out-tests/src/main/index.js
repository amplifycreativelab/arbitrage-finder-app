"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.acknowledgeFallbackWarning = exports.getStorageStatus = exports.saveApiKey = exports.getApiKeyForAdapter = void 0;
const path_1 = require("path");
const icon_png_asset_1 = __importDefault(require("../../resources/icon.png?asset"));
const main_1 = require("electron-trpc/main");
const router_1 = require("./services/router");
var credentials_1 = require("./credentials");
Object.defineProperty(exports, "getApiKeyForAdapter", { enumerable: true, get: function () { return credentials_1.getApiKeyForAdapter; } });
Object.defineProperty(exports, "saveApiKey", { enumerable: true, get: function () { return credentials_1.saveApiKey; } });
Object.defineProperty(exports, "getStorageStatus", { enumerable: true, get: function () { return credentials_1.getStorageStatus; } });
Object.defineProperty(exports, "acknowledgeFallbackWarning", { enumerable: true, get: function () { return credentials_1.acknowledgeFallbackWarning; } });
const hasElectronRuntime = typeof process !== 'undefined' && typeof process.versions !== 'undefined' && !!process.versions.electron;
let app;
let ipcMain;
let BrowserWindow;
let shell;
const isDev = !!process.env['ELECTRON_RENDERER_URL'];
if (hasElectronRuntime) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-var-requires
    const electron = require('electron');
    app = electron.app;
    ipcMain = electron.ipcMain;
    BrowserWindow = electron.BrowserWindow;
    shell = electron.shell;
}
function createWindow() {
    // Create the browser window.
    if (!BrowserWindow || !shell) {
        throw new Error('BrowserWindow or shell is not available; Electron runtime not detected.');
    }
    const mainWindow = new BrowserWindow({
        width: 900,
        minWidth: 900,
        height: 670,
        show: false,
        autoHideMenuBar: true,
        ...(process.platform === 'linux' ? { icon: icon_png_asset_1.default } : {}),
        webPreferences: {
            preload: (0, path_1.join)(__dirname, '../preload/index.js'),
            sandbox: false
        }
    });
    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
    });
    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return { action: 'deny' };
    });
    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (isDev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    }
    else {
        mainWindow.loadFile((0, path_1.join)(__dirname, '../renderer/index.html'));
    }
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
if (hasElectronRuntime && app && ipcMain && BrowserWindow) {
    app.whenReady().then(() => {
        // Set app user model id for windows
        if (process.platform === 'win32') {
            app.setAppUserModelId('com.electron');
        }
        // IPC test
        ipcMain.on('ping', () => console.log('pong'));
        createWindow();
        const [mainWindow] = BrowserWindow.getAllWindows();
        if (mainWindow) {
            (0, main_1.createIPCHandler)({
                router: router_1.appRouter,
                windows: [mainWindow]
            });
        }
        app.on('activate', function () {
            // On macOS it's common to re-create a window in the app when the
            // dock icon is clicked and there are no other windows open.
            if (BrowserWindow && BrowserWindow.getAllWindows().length === 0)
                createWindow();
        });
    });
    // Quit when all windows are closed, except on macOS. There, it's common
    // for applications and their menu bar to stay active until the user quits
    // explicitly with Cmd + Q.
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
