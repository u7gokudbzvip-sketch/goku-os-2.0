// Register VFS and initialize in the main process
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;

// require vfs backend
const vfsModule = require('./src/backend/vfs');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#101216',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools when env DEV is set
  if (process.env.DEV) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

const SETTINGS_FILE = () => path.join(app.getPath('userData'), 'settings.json');

async function readSettings() {
  try {
    const p = SETTINGS_FILE();
    const raw = await fs.readFile(p, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return {}; // defaults
  }
}

async function writeSettings(data) {
  try {
    const p = SETTINGS_FILE();
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, JSON.stringify(data, null, 2), 'utf8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// IPC handlers for settings
ipcMain.handle('settings:get', async () => {
  return await readSettings();
});

ipcMain.handle('settings:set', async (_, data) => {
  return await writeSettings(data);
});

let vfsInstance = null;

app.whenReady().then(async () => {
  // init VFS module with ipcMain and app
  vfsInstance = vfsModule.init(app, ipcMain);
  // ensure default folders exist before showing desktop
  try {
    await vfsInstance.ensureReady();
    console.log('VFS ready');
  } catch (e) {
    console.warn('VFS initialization failed', e);
  }

  createWindow();
});

app.on('window-all-closed', () => {
  // On macOS keep app alive until user quits explicitly
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
