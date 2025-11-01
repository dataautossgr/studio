const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Important for running Next.js in Electron
      nodeIntegration: false,
      contextIsolation: true,
      // Allow loading local resources in development for Next.js hot-reloading
      webSecurity: !isDev 
    },
  });

  const loadURL = isDev
    ? 'http://localhost:9002' // URL of the Next.js dev server
    : `file://${path.join(__dirname, '../out/index.html')}`; // Path to the exported Next.js app

  win.loadURL(loadURL);

  if (isDev) {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

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
