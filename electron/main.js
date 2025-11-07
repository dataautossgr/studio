const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');

// This is a fix for potential SSL/CORS issues in Electron production builds.
// It tells Electron to ignore certificate errors.
app.commandLine.appendSwitch('ignore-certificate-errors');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true 
    },
  });

  // If in development, load from the Next.js dev server.
  // Otherwise, load the static build output.
  const loadURL = isDev
    ? 'http://127.0.0.1:9002'
    : `file://${path.join(__dirname, '../out/index.html')}`;

  win.loadURL(loadURL);

  if (isDev) {
    win.webContents.openDevTools();
  }
}


app.whenReady().then(() => {
  createWindow();

  // Only check for updates in production.
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
