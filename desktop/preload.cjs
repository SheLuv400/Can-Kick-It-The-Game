const { contextBridge, ipcRenderer } = require('electron')

const STATE_CHANNEL = 'desktop:state-changed'

contextBridge.exposeInMainWorld('cikiDesktop', {
  getState: () => ipcRenderer.invoke('desktop:get-state'),
  setMode: (mode) => ipcRenderer.invoke('desktop:set-mode', mode),
  quit: () => ipcRenderer.invoke('desktop:quit'),
  onStateChange: (callback) => {
    if (typeof callback !== 'function') return () => {}
    const listener = (_event, state) => callback(state)
    ipcRenderer.on(STATE_CHANNEL, listener)
    return () => ipcRenderer.removeListener(STATE_CHANNEL, listener)
  },
})
