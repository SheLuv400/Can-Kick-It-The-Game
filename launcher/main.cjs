'use strict'

const { app, BrowserWindow, dialog, ipcMain, net, screen, session, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const os = require('node:os')
const crypto = require('node:crypto')
const { execFile, spawn } = require('node:child_process')
const { promisify } = require('node:util')
const https = require('node:https')

app.setName('CanIKickItLauncher')
if (process.platform === 'win32') app.setAppUserModelId('com.ciki.launcher')

const REPO = 'SheLuv400/Can-Kick-It-The-Game'
const REPO_URL = `https://github.com/${REPO}`
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases?per_page=20`
const GAME_ASSET_RE = /^CanIKickIt-(\d+\.\d+\.\d+)-win32-x64\.zip$/i
const USER_AGENT = 'CIKI-Launcher/1.0.1'
const IS_WINDOWS = process.platform === 'win32'
const TASKLIST_PATH = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tasklist.exe')
const CHECK_INTERVAL_MS = 15 * 60 * 1000
const execFileAsync = promisify(execFile)

const DEFAULT_GAME_DIR = path.join(
  process.env.LOCALAPPDATA || app.getPath('appData'),
  'CanIKickItLauncher',
  'Game',
)

let mainWindow = null
let state = null
let settings = null
let settingsPath = null
let downloadController = null
let gameProcess = null
let checkTimer = null
let activeInstall = null

function log(level, message) {
  try {
    const line = `${new Date().toISOString()} [${level}] ${message}\n`
    fs.appendFileSync(path.join(app.getPath('userData'), 'launcher.log'), line)
  } catch {
    // Logging is best-effort only.
  }
}

function makeInitialState() {
  return {
    phase: 'idle',
    busy: false,
    online: true,
    launcherVersion: app.getVersion(),
    platform: IS_WINDOWS ? 'WINDOWS' : 'DESKTOP',
    gameDir: settings.gameDir,
    installedVersion: null,
    hasGameFiles: false,
    installSize: 0,
    freeSpace: 0,
    latestVersion: null,
    latestAsset: null,
    updateAvailable: false,
    gameRunning: false,
    autoCheck: settings.autoCheck,
    lastChecked: null,
    error: null,
    progress: null,
  }
}

function publish(patch) {
  if (!state) return
  Object.assign(state, patch)
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('launcher:state', state)
  }
}

function notify(text, tone = 'info') {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('launcher:notice', { text, tone, at: Date.now() })
  }
}

function loadSettings() {
  settingsPath = path.join(app.getPath('userData'), 'settings.json')
  let loaded = {}
  try {
    loaded = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
  } catch {
    loaded = {}
  }
  const gameDir = typeof loaded.gameDir === 'string' && path.isAbsolute(loaded.gameDir)
    ? loaded.gameDir
    : DEFAULT_GAME_DIR
  settings = {
    gameDir,
    autoCheck: loaded.autoCheck !== false,
  }
}

function saveSettings() {
  try {
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
    const temp = `${settingsPath}.tmp`
    fs.writeFileSync(temp, JSON.stringify(settings, null, 2))
    fs.renameSync(temp, settingsPath)
  } catch (error) {
    log('warn', `Could not save settings: ${error.message}`)
  }
}

async function pathExists(target) {
  try {
    await fsp.access(target)
    return true
  } catch {
    return false
  }
}

function pathExistsSync(target) {
  try {
    return fs.existsSync(target)
  } catch {
    return false
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isLockError(error) {
  const code = error && error.code ? String(error.code) : ''
  return code === 'EACCES' || code === 'EPERM' || code === 'EBUSY' || code === 'ENOTEMPTY'
}

async function detectGameProcess() {
  if (!IS_WINDOWS) return false
  try {
    const { stdout } = await execFileAsync(
      TASKLIST_PATH,
      ['/FI', 'IMAGENAME eq CanIKickIt.exe', '/NH', '/FO', 'CSV'],
      { windowsHide: true, timeout: 5000, maxBuffer: 1024 * 1024 },
    )
    return /"CanIKickIt\.exe"/i.test(stdout)
  } catch (error) {
    log('warn', `Could not check for a running game: ${error.message}`)
    return false
  }
}

async function renameWithRetry(from, to, attempts = 6) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await fsp.rename(from, to)
      return
    } catch (error) {
      if (!isLockError(error) || attempt === attempts - 1) throw error
      if (await detectGameProcess()) {
        const running = new Error('Can I Kick It? is still running.')
        running.code = 'GAME_RUNNING'
        throw running
      }
      await wait(600 * (attempt + 1))
    }
  }
}

async function folderSize(target) {
  let total = 0
  let entries
  try {
    entries = await fsp.readdir(target, { withFileTypes: true })
  } catch {
    return 0
  }
  for (const entry of entries) {
    const full = path.join(target, entry.name)
    try {
      if (entry.isDirectory()) total += await folderSize(full)
      else if (entry.isFile()) total += (await fsp.stat(full)).size
    } catch {
      // Skip files that disappear or are locked.
    }
  }
  return total
}

async function freeSpaceFor(target) {
  let probe = target
  for (let i = 0; i < 6; i += 1) {
    if (pathExistsSync(probe)) break
    const parent = path.dirname(probe)
    if (parent === probe) break
    probe = parent
  }
  try {
    const stats = await fsp.statfs(probe)
    return Number(stats.bavail) * Number(stats.bsize)
  } catch {
    return 0
  }
}

function normalizeVersion(value) {
  return String(value || '')
    .replace(/^v/i, '')
    .split(/[.+-]/)
    .slice(0, 3)
    .map((part) => Number.parseInt(part, 10) || 0)
}

function compareVersions(left, right) {
  const a = normalizeVersion(left)
  const b = normalizeVersion(right)
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i]
  }
  return 0
}

async function readInstalledVersion() {
  try {
    const raw = await fsp.readFile(path.join(state.gameDir, '.ciki-version'), 'utf8')
    const marker = JSON.parse(raw)
    return typeof marker.version === 'string' ? marker.version : null
  } catch {
    return null
  }
}

async function refreshInstallInfo(shouldPublish = true) {
  if (!state) return
  const exePath = path.join(state.gameDir, 'CanIKickIt.exe')
  const hasGameFiles = pathExistsSync(exePath)
  const installedVersion = await readInstalledVersion()
  const installSize = pathExistsSync(state.gameDir) ? await folderSize(state.gameDir) : 0
  const freeSpace = await freeSpaceFor(state.gameDir)
  const latest = state.latestVersion
  const updateAvailable = Boolean(latest) && (!installedVersion || compareVersions(latest, installedVersion) > 0)
  const patch = { hasGameFiles, installedVersion, installSize, freeSpace, updateAvailable }
  if (shouldPublish) publish(patch)
  else Object.assign(state, patch)
}

function pickLatestGameRelease(releases) {
  const candidates = []
  for (const release of Array.isArray(releases) ? releases : []) {
    if (!release || release.draft) continue
    for (const asset of Array.isArray(release.assets) ? release.assets : []) {
      const match = GAME_ASSET_RE.exec(asset.name || '')
      if (!match) continue
      candidates.push({
        version: match[1],
        name: asset.name,
        size: Number(asset.size) || 0,
        digest: typeof asset.digest === 'string' ? asset.digest : '',
        url: asset.browser_download_url,
        publishedAt: release.published_at || release.created_at || null,
        releaseTag: release.tag_name || '',
      })
    }
  }
  candidates.sort((a, b) => compareVersions(b.version, a.version))
  return candidates[0] || null
}

async function fetchJson(url) {
  const response = await net.fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': USER_AGENT,
    },
    cache: 'no-store',
  })
  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      throw new Error('GitHub is rate-limiting update checks. Try again in a few minutes.')
    }
    throw new Error(`GitHub returned ${response.status} while checking for updates.`)
  }
  return response.json()
}

function describeError(error) {
  const code = error && error.code ? String(error.code) : ''
  const message = error && error.message ? error.message : 'Something went wrong.'
  if (code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'EAI_AGAIN') {
    return "Can't reach GitHub. Check your connection and try again."
  }
  if (code === 'ENOSPC') return 'There is not enough free disk space for this update.'
  if (code === 'GAME_RUNNING') {
    return 'Can I Kick It? is still running. Close the game completely, then click Retry Update.'
  }
  if (code === 'EACCES' || code === 'EPERM' || code === 'EBUSY') {
    return 'Windows blocked the game folder update. Close the game completely and retry. If it still fails, choose a folder such as C:\\Games\\CanIKickItTheGame in Settings.'
  }
  if (/cancelled|canceled/i.test(message)) return 'Update cancelled.'
  return message
}

async function checkForUpdates() {
  if (!state || state.busy || state.phase === 'checking') return state
  publish({ phase: 'checking', error: null })
  try {
    const releases = await fetchJson(RELEASES_API)
    const latest = pickLatestGameRelease(releases)
    if (!latest) throw new Error('No Windows game build was found on GitHub yet.')
    state.latestVersion = latest.version
    state.latestAsset = latest
    await refreshInstallInfo(false)
    publish({
      phase: 'idle',
      online: true,
      latestVersion: latest.version,
      latestAsset: latest,
      updateAvailable: state.updateAvailable,
      lastChecked: Date.now(),
      error: null,
    })
    log('info', `Update check: latest game ${latest.version}, installed ${state.installedVersion || 'none'}.`)
  } catch (error) {
    const message = describeError(error)
    publish({
      phase: 'idle',
      online: false,
      lastChecked: Date.now(),
      error: message,
    })
    log('warn', `Update check failed: ${message}`)
  }
  return state
}

function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true })
    let stderr = ''
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr.trim() || `${path.basename(command)} exited with code ${code}.`))
    })
  })
}

async function extractZip(zipPath, destination) {
  await fsp.mkdir(destination, { recursive: true })
  if (IS_WINDOWS) {
    const command = "$ErrorActionPreference='Stop'; Expand-Archive -LiteralPath " +
      `${psQuote(zipPath)} -DestinationPath ${psQuote(destination)} -Force`
    await runProcess('powershell.exe', [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      command,
    ])
  } else {
    await runProcess('unzip', ['-q', '-o', zipPath, '-d', destination])
  }
}

function findGameRoot(root, depth = 0) {
  if (pathExistsSync(path.join(root, 'CanIKickIt.exe'))) return root
  if (depth >= 3) return null
  let entries = []
  try {
    entries = fs.readdirSync(root, { withFileTypes: true })
  } catch {
    return null
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const found = findGameRoot(path.join(root, entry.name), depth + 1)
    if (found) return found
  }
  return null
}

function downloadFile(url, destination, onProgress, signal) {
  return new Promise((resolve, reject) => {
    let settled = false
    let output = null

    const finish = (error, result) => {
      if (settled) return
      settled = true
      if (error) {
        if (output) output.destroy()
        reject(error)
      } else {
        resolve(result)
      }
    }

    const request = (currentUrl, redirects = 0) => {
      if (signal && signal.aborted) {
        finish(Object.assign(new Error('cancelled'), { name: 'AbortError' }))
        return
      }
      const requestHandle = https.get(currentUrl, {
        headers: {
          Accept: 'application/octet-stream',
          'User-Agent': USER_AGENT,
        },
      }, (response) => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
          response.resume()
          if (redirects >= 6 || !response.headers.location) {
            finish(new Error('GitHub sent an invalid download redirect.'))
            return
          }
          request(new URL(response.headers.location, currentUrl).toString(), redirects + 1)
          return
        }
        if (response.statusCode !== 200) {
          response.resume()
          finish(new Error(`GitHub returned ${response.statusCode} for the game download.`))
          return
        }

        const total = Number(response.headers['content-length']) || 0
        let received = 0
        let lastTick = Date.now()
        let lastBytes = 0

        output = fs.createWriteStream(destination)
        output.on('error', (error) => {
          requestHandle.destroy()
          finish(error)
        })

        response.on('data', (chunk) => {
          received += chunk.length
          const now = Date.now()
          if (now - lastTick >= 160) {
            const seconds = Math.max(0.001, (now - lastTick) / 1000)
            const speed = (received - lastBytes) / seconds
            onProgress({
              received,
              total,
              percent: total ? Math.min(100, (received / total) * 100) : 0,
              speed,
              eta: total && speed > 0 ? Math.max(0, (total - received) / speed) : null,
            })
            lastTick = now
            lastBytes = received
          }
        })
        response.on('error', (error) => finish(error))
        response.pipe(output)
        output.on('finish', () => {
          output.close(() => finish(null, { received, total }))
        })
      })

      requestHandle.on('error', (error) => finish(error))
      if (signal) {
        signal.addEventListener('abort', () => {
          finish(Object.assign(new Error('cancelled'), { name: 'AbortError' }), null)
          requestHandle.destroy()
          if (output) output.destroy()
        }, { once: true })
      }
    }

    request(url)
  })
}

async function fileDigest(filePath) {
  const hash = crypto.createHash('sha256')
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', resolve)
    stream.on('error', reject)
  })
  return hash.digest('hex')
}

function cancelUpdate() {
  if (downloadController) downloadController.abort()
}

async function installGame() {
  if (!state || state.busy) return state
  if (state.gameRunning) {
    publish({ error: 'Close the game before installing an update.' })
    return state
  }

  if (!state.latestAsset) {
    await checkForUpdates()
  }
  if (!state.latestAsset) {
    publish({ error: state.error || 'No update information is available yet.' })
    return state
  }

  const gameAlreadyRunning = await detectGameProcess()
  if (gameAlreadyRunning) {
    const message = 'Can I Kick It? is still running. Close the game completely, then click Retry Update.'
    publish({ phase: 'error', error: message })
    notify(message, 'error')
    log('warn', 'Update blocked: CanIKickIt.exe is running.')
    return state
  }

  const latest = state.latestAsset
  const gameDir = state.gameDir
  const parent = path.dirname(gameDir)
  const downloadsDir = path.join(app.getPath('userData'), 'downloads')
  const zipPath = path.join(downloadsDir, latest.name)
  const staging = path.join(parent, `.ciki-staging-${Date.now()}`)
  const backup = path.join(parent, `.ciki-backup-${Date.now()}`)
  let movedExisting = false

  state.busy = true
  activeInstall = { zipPath, staging, backup }
  publish({
    busy: true,
    phase: 'downloading',
    error: null,
    progress: { percent: 0, received: 0, total: latest.size, speed: 0, eta: null },
  })

  try {
    await fsp.mkdir(downloadsDir, { recursive: true })
    await fsp.rm(zipPath, { force: true })
    downloadController = new AbortController()

    await downloadFile(latest.url, zipPath, (progress) => {
      publish({ progress })
    }, downloadController.signal)

    publish({
      phase: 'installing',
      progress: { percent: 100, received: latest.size, total: latest.size, speed: 0, eta: 0 },
    })

    if (latest.digest && latest.digest.startsWith('sha256:')) {
      const expected = latest.digest.slice('sha256:'.length).toLowerCase()
      const actual = await fileDigest(zipPath)
      if (actual !== expected) {
        throw new Error('The downloaded update failed its SHA-256 integrity check.')
      }
    }

    await fsp.rm(staging, { recursive: true, force: true })
    await fsp.mkdir(staging, { recursive: true })
    await extractZip(zipPath, staging)

    const root = findGameRoot(staging)
    if (!root) {
      throw new Error('The downloaded build did not contain CanIKickIt.exe.')
    }

    await fsp.mkdir(parent, { recursive: true })
    if (await detectGameProcess()) {
      const running = new Error('Can I Kick It? is still running.')
      running.code = 'GAME_RUNNING'
      throw running
    }
    if (pathExistsSync(gameDir)) {
      await renameWithRetry(gameDir, backup)
      movedExisting = true
    }
    await renameWithRetry(root, gameDir)
    await fsp.writeFile(
      path.join(gameDir, '.ciki-version'),
      JSON.stringify({
        version: latest.version,
        installedAt: new Date().toISOString(),
        asset: latest.name,
      }, null, 2),
    )

    await fsp.rm(staging, { recursive: true, force: true })
    await fsp.rm(zipPath, { force: true })
    if (movedExisting) {
      await fsp.rm(backup, { recursive: true, force: true }).catch((error) => {
        log('warn', `Could not remove old game backup: ${error.message}`)
      })
    }

    state.latestVersion = latest.version
    await refreshInstallInfo(false)
    publish({
      busy: false,
      phase: 'idle',
      installedVersion: state.installedVersion,
      hasGameFiles: state.hasGameFiles,
      installSize: state.installSize,
      freeSpace: state.freeSpace,
      updateAvailable: state.updateAvailable,
      progress: null,
      error: null,
    })
    notify(`Game ${latest.version} is installed and ready to play.`, 'success')
    log('info', `Installed game ${latest.version} into ${gameDir}.`)
  } catch (error) {
    if (movedExisting && !pathExistsSync(gameDir) && pathExistsSync(backup)) {
      await fsp.rename(backup, gameDir).catch((rollbackError) => {
        log('error', `Rollback failed: ${rollbackError.message}`)
      })
    }
    await fsp.rm(staging, { recursive: true, force: true }).catch(() => {})
    await fsp.rm(zipPath, { force: true }).catch(() => {})
    const cancelled = error && (error.name === 'AbortError' || /cancelled/i.test(error.message || ''))
    if (cancelled) {
      publish({ busy: false, phase: 'idle', progress: null, error: null })
      notify('Update cancelled.', 'info')
    } else {
      const message = describeError(error)
      publish({ busy: false, phase: 'error', progress: null, error: message })
      notify(message, 'error')
      log('error', `Install failed (${error.code || 'no code'}): ${message}`)
    }
  } finally {
    downloadController = null
    activeInstall = null
    state.busy = false
  }
  return state
}

async function verifyAndRepair() {
  if (!state || state.busy) return state
  const exePath = path.join(state.gameDir, 'CanIKickIt.exe')
  const asarPath = path.join(state.gameDir, 'resources', 'app.asar')
  if (pathExistsSync(exePath) && pathExistsSync(asarPath)) {
    publish({ error: null })
    notify('Game files look complete.', 'success')
    return state
  }
  notify('Game files are missing. Installing a fresh copy now.', 'info')
  return installGame()
}

async function launchGame() {
  if (!state || state.busy) return state
  if (state.gameRunning) return state
  const exePath = path.join(state.gameDir, 'CanIKickIt.exe')
  if (!pathExistsSync(exePath)) {
    publish({ error: 'The game is not installed yet. Install it from this launcher first.' })
    return state
  }

  try {
    gameProcess = spawn(exePath, [], {
      cwd: state.gameDir,
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    })
    gameProcess.on('error', (error) => {
      publish({ gameRunning: false, error: describeError(error) })
      notify('The game could not be started.', 'error')
      log('error', `Launch failed: ${error.message}`)
    })
    gameProcess.on('exit', (code) => {
      gameProcess = null
      publish({ gameRunning: false })
      notify('Game closed. The launcher is ready when you are.', 'info')
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show()
        mainWindow.focus()
      }
      log('info', `Game exited with code ${code}.`)
    })
    gameProcess.unref()
    publish({ gameRunning: true, error: null })
    notify('Launching Can I Kick It? - The Game...', 'success')
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize()
  } catch (error) {
    gameProcess = null
    publish({ gameRunning: false, error: describeError(error) })
    notify('The game could not be started.', 'error')
    log('error', `Launch failed: ${error.message}`)
  }
  return state
}

async function clearCache() {
  if (!state || state.busy) return state
  try {
    await fsp.rm(path.join(app.getPath('userData'), 'downloads'), { recursive: true, force: true })
    await session.defaultSession.clearCache()
    publish({ error: null })
    notify('Download cache cleared. Your game and saves were not touched.', 'success')
  } catch (error) {
    publish({ error: describeError(error) })
    notify('Could not clear the cache.', 'error')
  }
  return state
}

async function chooseFolder() {
  if (!state || state.busy) return state
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose where the game is installed',
    defaultPath: path.dirname(state.gameDir),
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Use this folder',
  })
  if (result.canceled || !result.filePaths[0]) return state

  const selected = path.resolve(result.filePaths[0])
  if (path.parse(selected).root === selected) {
    notify('Choose a folder inside a drive, not the drive root.', 'error')
    return state
  }
  if (pathExistsSync(path.join(selected, 'CanIKickIt.exe'))) {
    settings.gameDir = selected
  } else if (path.basename(selected).toLowerCase() === 'canikickitthegame' || path.basename(selected).toLowerCase() === 'game') {
    settings.gameDir = selected
  } else {
    settings.gameDir = path.join(selected, 'CanIKickItTheGame')
  }
  saveSettings()
  state.gameDir = settings.gameDir
  await refreshInstallInfo(false)
  publish({
    gameDir: state.gameDir,
    installedVersion: state.installedVersion,
    hasGameFiles: state.hasGameFiles,
    installSize: state.installSize,
    freeSpace: state.freeSpace,
    updateAvailable: state.updateAvailable,
    error: null,
  })
  notify(`Game folder set to ${state.gameDir}`, 'info')
  return state
}

async function openGameFolder() {
  try {
    if (!pathExistsSync(state.gameDir)) await fsp.mkdir(state.gameDir, { recursive: true })
    const result = await shell.openPath(state.gameDir)
    if (result) throw new Error(result)
  } catch (error) {
    notify('Could not open the game folder.', 'error')
    log('warn', `Open folder failed: ${error.message}`)
  }
}

async function openExternal(url) {
  try {
    const parsed = new URL(url)
    const allowed = parsed.protocol === 'https:' && (
      parsed.hostname === 'github.com' ||
      parsed.hostname === 'api.github.com' ||
      parsed.hostname.endsWith('.freebuff.page')
    )
    if (!allowed) return
    await shell.openExternal(parsed.toString())
  } catch {
    // Ignore malformed or disallowed URLs.
  }
}

function createWindow() {
  const workArea = screen.getPrimaryDisplay().workAreaSize
  const width = Math.min(1500, Math.max(1120, workArea.width - 40))
  const height = Math.min(960, Math.max(740, workArea.height - 40))

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 1120,
    minHeight: 720,
    center: true,
    show: false,
    frame: false,
    backgroundColor: '#070509',
    title: 'Can I Kick It? - Game Launcher',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })

  mainWindow.setMenuBarVisibility(false)
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'))
  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.on('maximize', () => mainWindow.webContents.send('launcher:window-state', { maximized: true }))
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('launcher:window-state', { maximized: false }))
  mainWindow.on('closed', () => { mainWindow = null })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault())
}

function registerIpc() {
  ipcMain.handle('launcher:get-state', () => state)
  ipcMain.handle('launcher:check', () => checkForUpdates())
  ipcMain.handle('launcher:install', () => installGame())
  ipcMain.handle('launcher:cancel', () => { cancelUpdate(); return state })
  ipcMain.handle('launcher:launch', () => launchGame())
  ipcMain.handle('launcher:verify', () => verifyAndRepair())
  ipcMain.handle('launcher:open-game-folder', async () => { await openGameFolder(); return state })
  ipcMain.handle('launcher:clear-cache', () => clearCache())
  ipcMain.handle('launcher:choose-folder', () => chooseFolder())
  ipcMain.handle('launcher:set-auto-check', (_event, enabled) => {
    settings.autoCheck = Boolean(enabled)
    saveSettings()
    publish({ autoCheck: settings.autoCheck })
    return state
  })
  ipcMain.handle('launcher:open-external', async (_event, url) => {
    await openExternal(String(url || ''))
    return true
  })
  ipcMain.handle('launcher:open-logs', async () => {
    const target = path.join(app.getPath('userData'), 'launcher.log')
    if (!pathExistsSync(target)) await fsp.writeFile(target, '')
    await shell.showItemInFolder(target)
    return true
  })
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (!mainWindow) return false
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
    return mainWindow.isMaximized()
  })
  ipcMain.handle('window:close', () => mainWindow?.close())
}

async function bootstrap() {
  loadSettings()
  state = makeInitialState()
  registerIpc()
  createWindow()

  await refreshInstallInfo()
  if (settings.autoCheck) {
    setTimeout(() => { checkForUpdates() }, 900)
  }
  checkTimer = setInterval(() => {
    if (settings.autoCheck && !state.busy && !state.gameRunning) checkForUpdates()
  }, CHECK_INTERVAL_MS)
}

const hasLock = app.requestSingleInstanceLock()
if (!hasLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.whenReady().then(bootstrap).catch((error) => {
    log('error', `Startup failed: ${error.stack || error.message}`)
    dialog.showErrorBox('Launcher startup failed', error.message)
    app.quit()
  })
}

app.on('before-quit', () => {
  if (checkTimer) clearInterval(checkTimer)
  cancelUpdate()
})

app.on('window-all-closed', () => {
  app.quit()
})
