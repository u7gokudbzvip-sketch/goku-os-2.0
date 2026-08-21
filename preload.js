// Preload script - exposes minimal safe APIs to the renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('goku', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (s) => ipcRenderer.invoke('settings:set', s),
});
