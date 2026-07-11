"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: 'AI Image Processor',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        autoHideMenuBar: true,
        show: false,
    });
    mainWindow.once('ready-to-show', () => {
        if (mainWindow) {
            mainWindow.show();
        }
    });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
    // Load the app
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
    }
    else {
        // Try multiple possible locations for the built app
        const possiblePaths = [
            path.join(__dirname, '..', 'out', 'index.html'),
            path.join(process.resourcesPath || '', 'out', 'index.html'),
            path.join(__dirname, '..', '..', 'out', 'index.html'),
        ];
        let loaded = false;
        for (const p of possiblePaths) {
            try {
                if (fs.existsSync(p)) {
                    mainWindow.loadFile(p);
                    loaded = true;
                    break;
                }
            }
            catch (e) {
                // continue
            }
        }
        if (!loaded) {
            // Fallback: try the most common path
            mainWindow.loadFile(path.join(__dirname, '..', 'out', 'index.html'));
        }
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// IPC: Handle directory selection
electron_1.ipcMain.handle('select-output-directory', async () => {
    const result = await electron_1.dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Output Folder',
    });
    if (result.canceled)
        return null;
    return result.filePaths[0];
});
// IPC: Handle file writing
electron_1.ipcMain.handle('write-file-to-directory', async (_event, filePath, data) => {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, Buffer.from(data));
    return true;
});
// IPC: Handle directory creation
electron_1.ipcMain.handle('create-directory', async (_event, dirPath) => {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
});
// App lifecycle
electron_1.app.whenReady().then(createWindow);
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
