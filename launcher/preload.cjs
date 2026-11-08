const { contextBridge, ipcRenderer } = require('electron')

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('cikiLauncher', {
  getState: () => ipcRenderer.invoke('launcher:get-state'),
  check: () => ipcRenderer.invoke('launcher:check'),
  install: () => ipcRenderer.invoke('launcher:install'),
  cancel: () => ipcRenderer.invoke('launcher:cancel'),
  launch: () => ipcRenderer.invoke('launcher:launch'),
  verify: () => ipcRenderer.invoke('launcher:verify'),
  openGameFolder: () => ipcRenderer.invoke('launcher:open-game-folder'),
  clearCache: () => ipcRenderer.invoke('launcher:clear-cache'),
  chooseFolder: () => ipcRenderer.invoke('launcher:choose-folder'),
  setAutoCheck: (enabled) => ipcRenderer.invoke('launcher:set-auto-check', Boolean(enabled)),
  openExternal: (url) => ipcRenderer.invoke('launcher:open-external', url),
  openLogs: () => ipcRenderer.invoke('launcher:open-logs'),
  onState: (callback) => subscribe('launcher:state', callback),
  onNotice: (callback) => subscribe('launcher:notice', callback),
  onWindowState: (callback) => subscribe('launcher:window-state', callback),
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
})
