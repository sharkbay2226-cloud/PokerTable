const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const { autoUpdater } = require('electron-updater');
const license = require('./license.cjs');

let serverProcess = null;
let revalidateTimer = null;
const isDev = !app.isPackaged;

function startServer() {
  const serverPath = path.join(__dirname, '..', 'server', 'index.js');
  serverProcess = fork(serverPath, [], {
    env: { ...process.env, API_PORT: '3001', USER_DATA_DIR: app.getPath('userData') },
    stdio: 'pipe',
  });
  serverProcess.stdout?.on('data', (d) => process.stdout.write('[server] ' + d));
  serverProcess.stderr?.on('data', (d) => process.stderr.write('[server] ' + d));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'Poker Diary',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  startRevalidation(win);
}

function startRevalidation(win) {
  const CHECK_MS = 60 * 60 * 1000;
  revalidateTimer = setInterval(async () => {
    await license.revalidateIfNeeded();
    const status = license.getLicenseStatus();
    if (status.status === 'expired' && status.reason !== 'trial_ended' && status.reason !== 'license_expired') {
      win.webContents.send('license:revoked', status);
    }
  }, CHECK_MS);
}

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update available',
    message: 'Version ' + info.version + ' is available.',
    detail: 'Update will be installed on exit.',
    buttons: ['OK'],
  });
});

autoUpdater.on('error', (err) => {
  console.error('[autoUpdater]', err.message);
});

ipcMain.handle('license:getStatus', () => {
  return license.getLicenseStatus();
});

ipcMain.handle('license:activateKey', (_e, key) => {
  return license.activateKey(key);
});

ipcMain.handle('license:getOfflineChallenge', () => {
  return license.getOfflineChallenge();
});

ipcMain.handle('license:verifyOfflineResponse', (_e, response) => {
  return license.verifyOfflineResponse(response);
});

ipcMain.handle('license:openPurchase', () => {
  shell.openExternal('https://t.me/PokerDiary_Bot');
});

ipcMain.handle('license:revalidate', async () => {
  await license.revalidateIfNeeded();
  return license.getLicenseStatus();
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  startServer();
  createWindow();
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (revalidateTimer) { clearInterval(revalidateTimer); revalidateTimer = null; }
  if (serverProcess) { serverProcess.kill(); serverProcess = null; }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (revalidateTimer) { clearInterval(revalidateTimer); revalidateTimer = null; }
  if (serverProcess) { serverProcess.kill(); serverProcess = null; }
});
