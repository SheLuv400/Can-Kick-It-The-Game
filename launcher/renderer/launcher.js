'use strict'

const $ = (selector) => document.querySelector(selector)
const $$ = (selector) => Array.from(document.querySelectorAll(selector))

const eventSlides = [
  {
    title: 'THE FESTIVAL &<br>TOUR CIRCUIT',
    festival: 'BLACKTOP FREQUENCY FEST',
    detail: '72-HOUR EVENT · SOLO TOUR &amp; ONLINE FESTIVAL',
    date: 'FRI, NOV 6 – MON, NOV 9',
    accent: '#f05a28',
  },
  {
    title: 'THE FESTIVAL &<br>TOUR CIRCUIT',
    festival: 'VELVET AFTERDARK SESSIONS',
    detail: 'R&amp;B NIGHTS · SOLO TOUR &amp; ONLINE FESTIVAL',
    date: 'FRI, NOV 13 – MON, NOV 16',
    accent: '#c24dff',
  },
  {
    title: 'THE FESTIVAL &<br>TOUR CIRCUIT',
    festival: 'CRATE CITY COMEBACK JAM',
    detail: 'CRATE DIGGERS · SOLO TOUR &amp; ONLINE FESTIVAL',
    date: 'FRI, NOV 20 – MON, NOV 23',
    accent: '#f3b52c',
  },
]

let api = null
let state = null
let activeSlide = 0
let slideTimer = null
let toastTimer = null
let lastNotice = 0

function formatBytes(bytes, decimals = 1) {
  const value = Number(bytes) || 0
  if (value <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = value
  let index = 0
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }
  const precision = index >= 3 ? decimals : 0
  return `${size.toFixed(precision)} ${units[index]}`
}

function formatSpeed(bytesPerSecond) {
  if (!bytesPerSecond) return '—'
  return `${formatBytes(bytesPerSecond)}/s`
}

function formatEta(seconds) {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return '—'
  const total = Math.ceil(seconds)
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`
}

function timeAgo(timestamp) {
  if (!timestamp) return 'Not checked yet'
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  return `${Math.round(hours / 24)} days ago`
}

function setText(selector, text) {
  const element = $(selector)
  if (element) element.textContent = text
}

function setIcon(selector, symbol) {
  const use = $(`${selector} use`)
  if (use) use.setAttribute('href', `#${symbol}`)
}

function showToast(text, tone = 'info') {
  const toast = $('#toast')
  if (!toast) return
  setText('#toast-text', text)
  toast.classList.remove('error', 'success')
  if (tone === 'error' || tone === 'success') toast.classList.add(tone)
  toast.hidden = false
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.hidden = true }, 4500)
}

function setSlide(index) {
  activeSlide = (index + eventSlides.length) % eventSlides.length
  const slide = eventSlides[activeSlide]
  const card = $('#event-card')
  if (card) card.style.setProperty('--event-accent', slide.accent)
  const title = $('#event-title')
  if (title) title.innerHTML = slide.title
  const festival = $('#event-festival')
  if (festival) festival.textContent = slide.festival
  const detail = $('#event-detail')
  if (detail) detail.innerHTML = slide.detail
  const date = $('#event-date')
  if (date) date.textContent = slide.date
  $$('.event-dot').forEach((dot, dotIndex) => {
    dot.classList.toggle('active', dotIndex === activeSlide)
  })
}

function restartCarousel() {
  clearInterval(slideTimer)
  slideTimer = setInterval(() => setSlide(activeSlide + 1), 8000)
}

function openSettings() {
  const modal = $('#settings-modal')
  if (!modal) return
  modal.hidden = false
  setText('#settings-path', state?.gameDir || '—')
  setText('#modal-version', `Launcher v${state?.launcherVersion || '1.0.1'}`)
  const auto = $('#auto-check')
  if (auto) auto.checked = Boolean(state?.autoCheck)
}

function closeSettings() {
  const modal = $('#settings-modal')
  if (modal) modal.hidden = true
}

function updateVersionPanel() {
  if (!state) return
  const installed = state.installedVersion
  const latest = state.latestVersion
  const checking = state.phase === 'checking'
  const busy = Boolean(state.busy)
  const updateButton = $('#update-button')
  const updateLabel = $('#update-label')
  const versionStatus = $('#version-status')
  const versionPill = $('#version-pill')

  setText('#installed-version', installed || (state.hasGameFiles ? 'FILES FOUND' : 'NOT INSTALLED'))
  setText('#latest-version', latest || '—')

  versionStatus.classList.remove('is-good', 'is-error')
  versionPill.classList.remove('good', 'error')
  if (updateButton) updateButton.disabled = false

  if (checking) {
    setText('#version-status', 'CHECKING FOR UPDATES…')
    if (updateLabel) updateLabel.textContent = 'CHECKING…'
    if (updateButton) updateButton.disabled = true
  } else if (busy) {
    setText('#version-status', state.phase === 'installing' ? 'INSTALLING UPDATE…' : 'DOWNLOADING UPDATE…')
    if (updateLabel) updateLabel.textContent = state.phase === 'installing' ? 'INSTALLING…' : 'UPDATING…'
    if (updateButton) updateButton.disabled = true
  } else if (state.gameRunning) {
    setText('#version-status', 'GAME IS RUNNING')
    if (updateLabel) updateLabel.textContent = 'CLOSE GAME TO UPDATE'
    if (updateButton) updateButton.disabled = true
  } else if (state.phase === 'error' && state.error) {
    setText('#version-status', 'UPDATE FAILED')
    versionStatus.classList.add('is-error')
    versionPill.classList.add('error')
    if (updateLabel) updateLabel.textContent = 'RETRY UPDATE'
  } else if (!state.online && state.error) {
    setText('#version-status', 'OFFLINE · CHECK FAILED')
    versionStatus.classList.add('is-error')
    versionPill.classList.add('error')
    if (updateLabel) updateLabel.textContent = 'RETRY CHECK'
  } else if (state.updateAvailable) {
    setText('#version-status', installed ? 'UPDATE AVAILABLE' : 'READY TO INSTALL')
    if (updateLabel) updateLabel.textContent = installed ? 'UPDATE GAME' : 'INSTALL GAME'
  } else if (installed && latest) {
    setText('#version-status', 'UP TO DATE')
    versionStatus.classList.add('is-good')
    versionPill.classList.add('good')
    if (updateLabel) updateLabel.textContent = 'UP TO DATE'
    if (updateButton) updateButton.disabled = true
  } else if (latest) {
    setText('#version-status', 'READY TO INSTALL')
    if (updateLabel) updateLabel.textContent = 'INSTALL GAME'
  } else {
    setText('#version-status', 'NO UPDATE INFO YET')
    if (updateLabel) updateLabel.textContent = 'CHECK FOR UPDATES'
  }

  setText('#last-checked', state.lastChecked
    ? `Last checked ${timeAgo(state.lastChecked)}. Updates are delivered through GitHub Releases.`
    : 'Updates are delivered through GitHub Releases.')
}

function updateStatusCard() {
  if (!state) return
  const card = $('#status-card')
  const icon = $('#status-icon')
  const title = $('#status-title')
  const detail = $('#status-detail')
  const progressWrap = $('#progress-wrap')
  const cancel = $('#cancel-button')
  if (!card) return
  card.classList.remove('error', 'ready')
  progressWrap.hidden = true
  cancel.hidden = true

  if (state.busy && state.progress) {
    const progress = state.progress
    const installing = state.phase === 'installing'
    setText('#status-title', installing ? 'INSTALLING GAME…' : 'UPDATING GAME…')
    setText('#status-detail', installing
      ? 'Extracting the latest build into your game folder.'
      : 'Keep the launcher open while the update downloads.')
    setIcon('#status-icon', installing ? 'i-settings' : 'i-download')
    progressWrap.hidden = false
    const percent = Math.max(0, Math.min(100, Math.round(progress.percent || 0)))
    $('#progress-fill').style.width = `${percent}%`
    setText('#progress-percent', `${percent}%`)
    setText('#progress-detail', installing
      ? `Installing version ${state.latestVersion || ''}`
      : `Downloading ${state.latestVersion ? `v${state.latestVersion}` : 'update'} · ${formatBytes(progress.received)} of ${formatBytes(progress.total)}`)
    setText('#progress-speed', installing ? 'Please wait…' : `${formatSpeed(progress.speed)} · ETA ${formatEta(progress.eta)}`)
    cancel.hidden = installing
    icon.classList.add('working')
    return
  }

  icon.classList.remove('working')
  setText('#status-detail', '')
  if (state.gameRunning) {
    setText('#status-title', 'GAME IS RUNNING')
    setText('#status-detail', 'The launcher is tracking your session. Close the game to install updates.')
    setIcon('#status-icon', 'i-play')
    return
  }
  if (state.error) {
    card.classList.add('error')
    setText('#status-title', 'UPDATE NEEDS ATTENTION')
    setText('#status-detail', state.error)
    setIcon('#status-icon', 'i-close')
    return
  }
  if (state.updateAvailable) {
    setText('#status-title', 'UPDATE READY')
    setText('#status-detail', state.installedVersion
      ? `Version ${state.latestVersion} is available. Install it now or play your current build.`
      : `Install version ${state.latestVersion || ''} to start playing.`)
    setIcon('#status-icon', 'i-download')
    return
  }
  if (state.installedVersion && state.latestVersion) {
    card.classList.add('ready')
    setText('#status-title', 'ALL SET')
    setText('#status-detail', `You're on the latest build. The stage is yours.`)
    setIcon('#status-icon', 'i-check')
    return
  }
  setText('#status-title', 'READY TO INSTALL')
  setText('#status-detail', 'Download the latest Windows build and start your run.')
  setIcon('#status-icon', 'i-download')
}

function render(nextState) {
  if (!nextState) return
  state = nextState
  const version = state.launcherVersion || '1.0.1'
  setText('#title-version', `v${version}`)
  setText('#footer-version', `LAUNCHER v${version}`)
  setText('#modal-version', `Launcher v${version}`)
  setText('#platform-label', state.platform || 'WINDOWS')

  const net = $('#net-status')
  const online = Boolean(state.online)
  net.classList.toggle('offline', !online)
  setText('#net-label', online ? 'Online' : 'Offline')

  setText('#game-path', state.gameDir || '—')
  const gamePath = $('#game-path')
  if (gamePath) gamePath.title = state.gameDir || ''
  setText('#settings-path', state.gameDir || '—')
  setText('#install-size', formatBytes(state.installSize))
  setText('#free-space', formatBytes(state.freeSpace))
  const freeSpace = $('#free-space')
  if (freeSpace) freeSpace.classList.toggle('good', Number(state.freeSpace) > 2 * 1024 * 1024 * 1024)

  updateVersionPanel()
  updateStatusCard()

  const updateButton = $('#update-button')
  if (updateButton) {
    updateButton.disabled = Boolean(state.busy || state.gameRunning || state.phase === 'checking' ||
      (state.installedVersion && state.latestVersion && !state.updateAvailable))
  }

  const playButton = $('#play-button')
  const playLabel = $('#play-label')
  if (playButton && playLabel) {
    if (state.gameRunning) {
      playLabel.textContent = 'GAME RUNNING'
      playButton.disabled = true
    } else if (state.busy) {
      playLabel.textContent = state.phase === 'installing' ? 'INSTALLING…' : 'UPDATING…'
      playButton.disabled = true
    } else if (!state.installedVersion && !state.hasGameFiles) {
      playLabel.textContent = 'INSTALL GAME'
      playButton.disabled = false
    } else {
      playLabel.textContent = 'PLAY GAME'
      playButton.disabled = false
    }
  }

  const auto = $('#auto-check')
  if (auto) auto.checked = Boolean(state.autoCheck)
}

async function handlePlay() {
  if (!state || state.busy || state.gameRunning) return
  if (!state.installedVersion && !state.hasGameFiles) {
    await api.install()
    return
  }
  await api.launch()
}

function bindEvents() {
  $$('[data-action]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.preventDefault()
      const action = button.dataset.action
      if (action === 'home') {
        $$('.nav-item').forEach((item) => item.classList.remove('active'))
        button.classList.add('active')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else if (action === 'play') {
        await handlePlay()
      } else if (action === 'updates') {
        $$('.nav-item').forEach((item) => item.classList.remove('active'))
        button.classList.add('active')
        await api.check()
        const panel = $('#version-panel')
        if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      } else if (action === 'files') {
        $$('.nav-item').forEach((item) => item.classList.remove('active'))
        button.classList.add('active')
        await api.openGameFolder()
      } else if (action === 'settings') {
        openSettings()
      } else if (action === 'support') {
        await api.openExternal('https://github.com/SheLuv400/Can-Kick-It-The-Game/issues')
      } else if (action === 'news') {
        await api.openExternal('https://github.com/SheLuv400/Can-Kick-It-The-Game/releases')
      }
    })
  })

  $('#play-button')?.addEventListener('click', handlePlay)
  $('#update-button')?.addEventListener('click', async () => {
    if (!state) return
    if (!state.latestVersion || (!state.online && !state.latestVersion)) {
      await api.check()
    } else {
      await api.install()
    }
  })
  $('#cancel-button')?.addEventListener('click', () => api.cancel())
  $('#open-folder')?.addEventListener('click', () => api.openGameFolder())
  $('#open-folder-two')?.addEventListener('click', () => api.openGameFolder())
  $('#clear-cache')?.addEventListener('click', () => api.clearCache())
  $('#verify')?.addEventListener('click', () => api.verify())
  $('#open-release')?.addEventListener('click', () => api.openExternal('https://github.com/SheLuv400/Can-Kick-It-The-Game/releases/latest'))

  $('#event-prev')?.addEventListener('click', () => { setSlide(activeSlide - 1); restartCarousel() })
  $('#event-next')?.addEventListener('click', () => { setSlide(activeSlide + 1); restartCarousel() })
  $$('.event-dot').forEach((dot) => {
    dot.addEventListener('click', () => { setSlide(Number(dot.dataset.slide) || 0); restartCarousel() })
  })

  $('#win-min')?.addEventListener('click', () => api.window.minimize())
  $('#win-max')?.addEventListener('click', () => api.window.maximize())
  $('#win-close')?.addEventListener('click', () => api.window.close())

  $('#close-settings')?.addEventListener('click', closeSettings)
  $('#settings-modal')?.addEventListener('click', (event) => {
    if (event.target === $('#settings-modal')) closeSettings()
  })
  $('#choose-folder')?.addEventListener('click', async () => {
    const updated = await api.chooseFolder()
    if (updated) render(updated)
    setText('#settings-path', state?.gameDir || '—')
  })
  $('#modal-open-folder')?.addEventListener('click', () => api.openGameFolder())
  $('#open-logs')?.addEventListener('click', () => api.openLogs())
  $('#auto-check')?.addEventListener('change', async (event) => {
    const updated = await api.setAutoCheck(event.target.checked)
    if (updated) render(updated)
    showToast(event.target.checked ? 'Startup update checks enabled.' : 'Startup update checks disabled.', 'info')
  })

  $$('[data-link]').forEach((button) => {
    button.addEventListener('click', () => {
      const link = button.dataset.link
      if (link === 'patch') api.openExternal('https://github.com/SheLuv400/Can-Kick-It-The-Game/releases/latest')
      else if (link === 'requirements') api.openExternal('https://github.com/SheLuv400/Can-Kick-It-The-Game#windows')
      else api.openExternal('https://github.com/SheLuv400/Can-Kick-It-The-Game')
    })
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSettings()
  })
}

function createMockApi() {
  let mock = {
    phase: 'idle',
    busy: false,
    online: true,
    launcherVersion: '1.0.1',
    platform: 'WINDOWS',
    gameDir: 'C:\\Games\\CanIKickItTheGame',
    installedVersion: '1.3.0',
    hasGameFiles: true,
    installSize: 421 * 1024 * 1024,
    freeSpace: 412.3 * 1024 * 1024 * 1024,
    latestVersion: '1.4.0',
    latestAsset: { version: '1.4.0', size: 173491477 },
    updateAvailable: true,
    gameRunning: false,
    autoCheck: true,
    lastChecked: Date.now() - 4 * 60 * 1000,
    error: null,
    progress: null,
  }
  const stateListeners = new Set()
  const noticeListeners = new Set()
  let cancelled = false
  const emit = () => stateListeners.forEach((listener) => listener({ ...mock }))
  const notice = (text, tone = 'info') => noticeListeners.forEach((listener) => listener({ text, tone, at: Date.now() }))
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  return {
    getState: async () => ({ ...mock }),
    check: async () => {
      mock.phase = 'checking'
      mock.error = null
      emit()
      await wait(650)
      mock.phase = 'idle'
      mock.online = true
      mock.latestVersion = '1.4.0'
      mock.latestAsset = { version: '1.4.0', size: 173491477 }
      mock.updateAvailable = mock.installedVersion !== '1.4.0'
      mock.lastChecked = Date.now()
      emit()
      return { ...mock }
    },
    install: async () => {
      if (mock.busy) return { ...mock }
      cancelled = false
      mock.busy = true
      mock.phase = 'downloading'
      mock.error = null
      const total = 173491477
      let received = 0
      emit()
      while (received < total) {
        if (cancelled) {
          mock.busy = false
          mock.phase = 'idle'
          mock.progress = null
          emit()
          notice('Update cancelled.', 'info')
          return { ...mock }
        }
        received = Math.min(total, received + total / 52)
        mock.progress = {
          received,
          total,
          percent: (received / total) * 100,
          speed: 24.8 * 1024 * 1024,
          eta: Math.max(0, (total - received) / (24.8 * 1024 * 1024)),
        }
        emit()
        await wait(90)
      }
      mock.phase = 'installing'
      mock.progress = { received: total, total, percent: 100, speed: 0, eta: 0 }
      emit()
      await wait(1300)
      mock.installedVersion = '1.4.0'
      mock.latestVersion = '1.4.0'
      mock.updateAvailable = false
      mock.busy = false
      mock.phase = 'idle'
      mock.progress = null
      mock.installSize = 421 * 1024 * 1024
      emit()
      notice('Game 1.4.0 is installed and ready to play.', 'success')
      return { ...mock }
    },
    cancel: () => { cancelled = true; return { ...mock } },
    launch: async () => {
      mock.gameRunning = true
      emit()
      notice('Launching Can I Kick It? - The Game...', 'success')
      setTimeout(() => { mock.gameRunning = false; emit() }, 9000)
      return { ...mock }
    },
    verify: async () => { notice('Game files look complete.', 'success'); return { ...mock } },
    openGameFolder: async () => { notice('Opening the game folder…', 'info'); return true },
    clearCache: async () => { notice('Download cache cleared. Your game and saves were not touched.', 'success'); return { ...mock } },
    chooseFolder: async () => { notice('Folder selection is available in the Windows launcher.', 'info'); return { ...mock } },
    setAutoCheck: async (enabled) => { mock.autoCheck = enabled; emit(); return { ...mock } },
    openExternal: async () => true,
    openLogs: async () => true,
    onState: (listener) => { stateListeners.add(listener); return () => stateListeners.delete(listener) },
    onNotice: (listener) => { noticeListeners.add(listener); return () => noticeListeners.delete(listener) },
    onWindowState: () => () => {},
    window: { minimize: () => {}, maximize: () => {}, close: () => {} },
  }
}

async function init() {
  api = window.cikiLauncher || createMockApi()
  bindEvents()
  setSlide(0)
  restartCarousel()
  const card = $('#event-card')
  card?.addEventListener('mouseenter', () => clearInterval(slideTimer))
  card?.addEventListener('mouseleave', restartCarousel)

  api.onState((nextState) => render(nextState))
  api.onNotice(({ text, tone }) => {
    const now = Date.now()
    if (now - lastNotice < 50) return
    lastNotice = now
    if (text) showToast(text, tone)
  })
  api.onWindowState(() => {})

  render(await api.getState())
}

init().catch((error) => {
  console.error(error)
  showToast(error.message || 'The launcher could not load.', 'error')
})
