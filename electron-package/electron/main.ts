import { app, BrowserWindow, shell, dialog, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
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

  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    shell.openExternal(url);
    return { action: 'deny' } as any;
  });

  // Load the app
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
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
      } catch (e) {
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
ipcMain.handle('select-output-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Output Folder',
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// IPC: Handle file writing
ipcMain.handle('write-file-to-directory', async (_event: any, filePath: string, data: ArrayBuffer) => {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, Buffer.from(data));
  return true;
});

// IPC: Handle directory creation
ipcMain.handle('create-directory', async (_event: any, dirPath: string) => {
  fs.mkdirSync(dirPath, { recursive: true });
  return true;
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
