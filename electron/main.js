const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // In dev mode, we load from a web server, so webSecurity can be enabled.
      // In production, we load from file system, so it might need to be disabled
      // if you face CORS issues, but it's better to handle those properly.
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

// This is a fix for the Firebase connection error in Electron.
// It tells Electron to ignore certificate errors, which can happen with localhost connections.
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-insecure-localhost', 'true');


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
