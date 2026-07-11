"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected APIs to the renderer process
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    selectOutputDirectory: () => electron_1.ipcRenderer.invoke('select-output-directory'),
    writeFile: (filePath, data) => electron_1.ipcRenderer.invoke('write-file-to-directory', filePath, data),
    createDirectory: (dirPath) => electron_1.ipcRenderer.invoke('create-directory', dirPath),
    isElectron: true,
});
