const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
    selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
    writeFile: (filePath, data) => ipcRenderer.invoke('write-file-to-directory', filePath, data),
    createDirectory: (dirPath) => ipcRenderer.invoke('create-directory', dirPath),
    isElectron: true,
});
