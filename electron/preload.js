const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object.
contextBridge.exposeInMainWorld('electronAPI', {
  // You can expose functions here to interact with the main process.
  // For example, to handle file system operations, database access, etc.
  // Example:
  // send: (channel, data) => ipcRenderer.send(channel, data),
  // receive: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
});

console.log('Preload script loaded.');
