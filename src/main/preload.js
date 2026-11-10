const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getBounceResults: (req) => ipcRenderer.invoke('get-bounce-results', req),
  getDates: (req) => ipcRenderer.invoke('get-dates', req),
});
