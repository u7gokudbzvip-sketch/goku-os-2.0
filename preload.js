// Preload script - exposes minimal safe APIs to the renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('goku', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (s) => ipcRenderer.invoke('settings:set', s),
  vfs: {
    ensureReady: () => ipcRenderer.invoke('vfs:ensure-ready'),
    list: (parentId) => ipcRenderer.invoke('vfs:list', parentId),
    get: (id) => ipcRenderer.invoke('vfs:get', id),
    createFolder: (parentId, name) => ipcRenderer.invoke('vfs:create-folder', parentId, name),
    createTextFile: (parentId, name, content) => ipcRenderer.invoke('vfs:create-text-file', parentId, name, content),
    rename: (id, newName) => ipcRenderer.invoke('vfs:rename', id, newName),
    trash: (id) => ipcRenderer.invoke('vfs:trash', id),
    restore: (id) => ipcRenderer.invoke('vfs:restore', id),
    deletePermanent: (id) => ipcRenderer.invoke('vfs:delete-permanent', id),
    move: (id, targetParentId) => ipcRenderer.invoke('vfs:move', id, targetParentId),
    write: (id, content) => ipcRenderer.invoke('vfs:write', id, content),
    read: (id) => ipcRenderer.invoke('vfs:read', id),
    properties: (id) => ipcRenderer.invoke('vfs:properties', id),
    search: (query, parentId) => ipcRenderer.invoke('vfs:search', query, parentId),
  }
});
