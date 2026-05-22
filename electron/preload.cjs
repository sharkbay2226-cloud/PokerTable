const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  apiBase: 'http://localhost:3001/api',
  isElectron: true,
});

contextBridge.exposeInMainWorld('licenseAPI', {
  getStatus: () => ipcRenderer.invoke('license:getStatus'),
  activateKey: (key) => ipcRenderer.invoke('license:activateKey', key),
  getOfflineChallenge: () => ipcRenderer.invoke('license:getOfflineChallenge'),
  verifyOfflineResponse: (resp) => ipcRenderer.invoke('license:verifyOfflineResponse', resp),
  openPurchase: () => ipcRenderer.invoke('license:openPurchase'),
  revalidate: () => ipcRenderer.invoke('license:revalidate'),
  onRevoked: (cb) => ipcRenderer.on('license:revoked', (_e, status) => cb(status)),
});
