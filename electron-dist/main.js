"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: 'AI 图片处理器',
        icon: path_1.default.join(__dirname, '../public/app-icon.jpg'),
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        autoHideMenuBar: true,
        show: false,
    });
    // Graceful show
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    // Open external links in browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
    // Load the app
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:3000');
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../out/index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// IPC: Handle directory selection and file writing
const electron_2 = require("electron");
electron_2.ipcMain.handle('select-output-directory', async () => {
    const result = await electron_1.dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: '选择输出文件夹',
    });
    if (result.canceled)
        return null;
    return result.filePaths[0];
});
electron_2.ipcMain.handle('write-file-to-directory', async (_event, filePath, data) => {
    const dir = path_1.default.dirname(filePath);
    fs_1.default.mkdirSync(dir, { recursive: true });
    fs_1.default.writeFileSync(filePath, Buffer.from(data));
    return true;
});
electron_2.ipcMain.handle('create-directory', async (_event, dirPath) => {
    fs_1.default.mkdirSync(dirPath, { recursive: true });
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
