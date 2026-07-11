import { contextBridge, ipcRenderer } from 'electron';

// Expose protected APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
  writeFile: (filePath: string, data: ArrayBuffer) =>
    ipcRenderer.invoke('write-file-to-directory', filePath, data),
  createDirectory: (dirPath: string) =>
    ipcRenderer.invoke('create-directory', dirPath),
  isElectron: true,
});
