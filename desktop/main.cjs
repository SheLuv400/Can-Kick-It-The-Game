const { app, BrowserWindow, dialog, ipcMain, screen, session, shell } = require('electron')
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.join(__dirname, 'dist')
const BASE_PORT = 42713
const WINDOW_MODES = new Set(['windowed', 'borderless', 'fullscreen'])
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
}

let serverPort = null
let mainWindow = null
let windowMode = 'windowed'
let lastNonFullscreen = 'windowed'
let frameless = false
let windowedBounds = null
let stateSaveTimer = null

function createServer() {
  return http.createServer((req, res) => {
    let pathname = '/'
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname)
    } catch {
      res.writeHead(400).end('Bad request')
      return
    }
    let file = path.normalize(path.join(ROOT, pathname))
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden')
      return
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(ROOT, 'index.html')
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' })
    fs.createReadStream(file).pipe(res)
  })
}

function windowStatePath() {
  return path.join(app.getPath('userData'), 'window-state.json')
}

function validBounds(bounds) {
  return Boolean(
    bounds &&
      [bounds.x, bounds.y, bounds.width, bounds.height].every(
        (value) => typeof value === 'number' && Number.isFinite(value),
      ) &&
      bounds.width >= 640 &&
      bounds.height >= 480,
  )
}

function defaultWindowedBounds() {
  const area = screen.getPrimaryDisplay().workArea
  const width = Math.min(Math.max(640, area.width - 120), area.width)
  const height = Math.min(Math.max(480, area.height - 100), area.height)
  return {
    width,
    height,
    x: area.x + Math.max(0, Math.round((area.width - width) / 2)),
    y: area.y + Math.max(0, Math.round((area.height - height) / 2)),
  }
}

function getWindowedBounds() {
  return windowedBounds ?? defaultWindowedBounds()
}

function readWindowState() {
  windowedBounds = defaultWindowedBounds()
  try {
    const saved = JSON.parse(fs.readFileSync(windowStatePath(), 'utf8'))
    if (WINDOW_MODES.has(saved.mode)) windowMode = saved.mode
    if (WINDOW_MODES.has(saved.lastNonFullscreen) && saved.lastNonFullscreen !== 'fullscreen') {
      lastNonFullscreen = saved.lastNonFullscreen
    }
    if (typeof saved.frameless === 'boolean') frameless = saved.frameless
    if (validBounds(saved.bounds)) windowedBounds = saved.bounds
  } catch {
    // First run, or the state file was removed. Use a centered window.
  }
  if (lastNonFullscreen === 'fullscreen') lastNonFullscreen = 'windowed'
  if (windowMode === 'windowed') {
    frameless = false
    lastNonFullscreen = 'windowed'
  }
  if (windowMode === 'borderless') {
    frameless = true
    lastNonFullscreen = 'borderless'
  }
  if (windowMode === 'fullscreen') {
    if (lastNonFullscreen === 'borderless') frameless = true
    if (lastNonFullscreen === 'windowed') frameless = false
  }
}

function saveWindowState() {
  try {
    const file = windowStatePath()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(
      file,
      JSON.stringify({
        mode: windowMode,
        lastNonFullscreen,
        frameless,
        bounds: windowedBounds,
      }),
    )
  } catch {
    // Display preferences are helpful, not critical; the game still runs.
  }
}

function scheduleWindowStateSave() {
  clearTimeout(stateSaveTimer)
  stateSaveTimer = setTimeout(saveWindowState, 250)
}

function getWindowState() {
  return {
    mode: windowMode,
    frameless,
    maximized: Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isMaximized()),
    platform: process.platform,
  }
}

function broadcastWindowState() {
  const state = getWindowState()
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
      win.webContents.send('desktop:state-changed', state)
    }
  }
}

function rememberWindowedBounds(win = mainWindow) {
  if (!win || win.isDestroyed() || frameless || windowMode !== 'windowed' || win.isFullScreen()) {
    return
  }
  const bounds = win.isMaximized() ? win.getNormalBounds() : win.getBounds()
  if (validBounds(bounds)) {
    windowedBounds = bounds
    scheduleWindowStateSave()
  }
}

function windowOptions(mode) {
  const source = getWindowedBounds()
  const bounds =
    mode === 'borderless' ? screen.getDisplayMatching(source).workArea : source
  return {
    ...bounds,
    minWidth: 960,
    minHeight: 640,
    frame: !frameless,
    resizable: !frameless,
    maximizable: !frameless,
    backgroundColor: '#08070a',
    autoHideMenuBar: true,
    title: 'CAN I KICK IT?',
    show: false,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  }
}

function showWindow(win, mode) {
  if (mode === 'borderless') {
    const area = screen.getDisplayMatching(win.getBounds()).workArea
    win.setResizable(false)
    win.setMaximizable(false)
    win.setBounds(area)
  } else if (mode === 'fullscreen') {
    win.setFullScreen(true)
  } else {
    win.setResizable(true)
    win.setMaximizable(true)
    win.setBounds(getWindowedBounds())
  }
  win.show()
  win.focus()
  broadcastWindowState()
}

function toggleFullscreen() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  setWindowMode(windowMode === 'fullscreen' ? lastNonFullscreen : 'fullscreen')
}

function wireWindow(win) {
  win.on('move', () => rememberWindowedBounds(win))
  win.on('resize', () => rememberWindowedBounds(win))
  win.on('maximize', broadcastWindowState)
  win.on('unmaximize', broadcastWindowState)
  win.on('enter-full-screen', broadcastWindowState)
  win.on('leave-full-screen', broadcastWindowState)
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      event.preventDefault()
      toggleFullscreen()
    }
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://127.0.0.1:${serverPort}`)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })
}

function createWindow(mode, onReady) {
  const win = new BrowserWindow(windowOptions(mode))
  mainWindow = win
  win.setMenuBarVisibility(false)
  wireWindow(win)
  win.once('ready-to-show', () => {
    if (onReady) onReady(win)
    else showWindow(win, mode)
  })
  win.loadURL(`http://127.0.0.1:${serverPort}/`)
  return win
}

function recreateWindow(mode) {
  const previous = mainWindow
  if (previous && !previous.isDestroyed()) previous.hide()
  createWindow(mode, (win) => {
    if (previous && !previous.isDestroyed()) previous.destroy()
    showWindow(win, mode)
  })
}

function applyWindowModeLayout(mode) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mode === 'borderless') {
    const area = screen.getDisplayMatching(mainWindow.getBounds()).workArea
    mainWindow.setResizable(false)
    mainWindow.setMaximizable(false)
    mainWindow.setBounds(area)
  } else if (mode === 'windowed') {
    mainWindow.setResizable(true)
    mainWindow.setMaximizable(true)
    mainWindow.setBounds(getWindowedBounds())
  }
}

function setWindowMode(mode) {
  if (!WINDOW_MODES.has(mode)) throw new Error(`Unknown window mode: ${mode}`)
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { state: getWindowState(), reloading: false }
  }

  const current = windowMode
  if (mode === current) {
    if (mode === 'fullscreen' && !mainWindow.isFullScreen()) mainWindow.setFullScreen(true)
    return { state: getWindowState(), reloading: false }
  }

  if (mode === 'fullscreen') {
    lastNonFullscreen = current
    windowMode = 'fullscreen'
    saveWindowState()
    mainWindow.setFullScreen(true)
    broadcastWindowState()
    return { state: getWindowState(), reloading: false }
  }

  const targetFrameless = mode === 'borderless'
  if (targetFrameless !== frameless) {
    // Electron cannot add or remove a native frame in place. Re-create the
    // BrowserWindow so the borderless setting is real rather than cosmetic.
    windowMode = mode
    lastNonFullscreen = mode
    frameless = targetFrameless
    saveWindowState()
    recreateWindow(mode)
    return { state: getWindowState(), reloading: true }
  }

  windowMode = mode
  lastNonFullscreen = mode
  saveWindowState()
  const finish = () => {
    applyWindowModeLayout(mode)
    saveWindowState()
    broadcastWindowState()
  }
  if (current === 'fullscreen') {
    mainWindow.once('leave-full-screen', finish)
    mainWindow.setFullScreen(false)
  } else {
    finish()
  }
  return { state: getWindowState(), reloading: false }
}

function registerDesktopIpc() {
  ipcMain.handle('desktop:get-state', () => getWindowState())
  ipcMain.handle('desktop:set-mode', (_event, mode) => setWindowMode(mode))
  ipcMain.handle('desktop:quit', async () => {
    const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null
    const options = {
      type: 'question',
      title: 'Exit CAN I KICK IT?',
      message: 'Exit the show?',
      detail: 'Your mixtape, progress and window setting are saved automatically.',
      buttons: ['EXIT GAME', 'CANCEL'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    }
    const result = win ? await dialog.showMessageBox(win, options) : await dialog.showMessageBox(options)
    if (result.response !== 0) return false
    app.quit()
    return true
  })
}

function launch(server, port) {
  server.listen(port, '127.0.0.1', () => {
    serverPort = server.address().port
    createWindow(windowMode)
  })
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && port < BASE_PORT + 5) {
      launch(createServer(), port + 1)
      return
    }
    throw error
  })
}

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

function allowLocalAudioCapture() {
  const isLocalApp = (url) =>
    typeof url === 'string' && url.startsWith('http://127.0.0.1:')
  const isAudioOnly = (details) => {
    const types = details?.mediaTypes ?? (details?.mediaType ? [details.mediaType] : null)
    return !types || types.every((type) => type === 'audio')
  }
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback, details) => {
      callback(
        permission === 'media' &&
          isLocalApp(webContents?.getURL?.()) &&
          isAudioOnly(details),
      )
    },
  )
  session.defaultSession.setPermissionCheckHandler(
    (_webContents, permission, requestingOrigin, details) =>
      permission === 'media' &&
      isLocalApp(requestingOrigin) &&
      isAudioOnly(details),
  )
}

app.whenReady().then(() => {
  readWindowState()
  allowLocalAudioCapture()
  registerDesktopIpc()
  launch(createServer(), BASE_PORT)
})
app.on('before-quit', () => {
  clearTimeout(stateSaveTimer)
  rememberWindowedBounds()
  saveWindowState()
})
app.on('window-all-closed', () => app.quit())
