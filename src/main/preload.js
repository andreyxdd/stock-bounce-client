const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getBounceResults: (req) => ipcRenderer.invoke('get-bounce-results', req),
  getDates: (req) => ipcRenderer.invoke('get-dates', req),
  conn: {
    myPing() {
      ipcRenderer.send('ipc-example', 'ping');
    },
    on(channel, func) {
      const validChannels = ['ipc-example'];
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    once(channel, func) {
      const validChannels = ['ipc-example'];
      if (validChannels.includes(channel)) {
        ipcRenderer.once(channel, (event, ...args) => func(...args));
      }
    },
  },
});
