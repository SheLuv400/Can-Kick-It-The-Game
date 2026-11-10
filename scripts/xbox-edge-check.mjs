import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.env.XBOX_CHECK_URL || 'http://127.0.0.1:3000/'
const OUT = process.env.XBOX_CHECK_OUT || 'artifacts/xbox-edge'
const VIEWPORT = { width: 1920, height: 1080 }
const HEADLESS = process.env.XBOX_CHECK_HEADLESS !== '0'

mkdirSync(OUT, { recursive: true })

const checks = []
const evidence = {}

function details(value) {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function record(name, pass, detail = '') {
  checks.push({ name, pass: Boolean(pass), detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${details(detail)}` : ''}`)
}

function rectOf(box) {
  if (!box) return null
  const x = Number(box.x)
  const y = Number(box.y)
  const width = Number(box.width)
  const height = Number(box.height)
  return {
    x: Number(x.toFixed(1)),
    y: Number(y.toFixed(1)),
    width: Number(width.toFixed(1)),
    height: Number(height.toFixed(1)),
    right: Number((box.right ?? x + width).toFixed(1)),
    bottom: Number((box.bottom ?? y + height).toFixed(1)),
  }
}

function overlapArea(a, b) {
  if (!a || !b) return 0
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x))
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y))
  return width * height
}

const browser = await chromium.launch({
  headless: HEADLESS,
  // Headless Chromium normally permits autoplay. Enforce the real browser
  // policy so the controller-only fallback test proves a trusted retry.
  args: ['--no-sandbox', '--autoplay-policy=user-gesture-required'],
})

async function addAudioProbe(context) {
  await context.addInitScript(() => {
    window.__audioContexts = []
    window.__audioElements = []
    window.__oscillatorStarts = 0
    window.__bufferStarts = 0

    const NativeAudio = window.Audio
    window.Audio = new Proxy(NativeAudio, {
      construct(target, args) {
        const element = Reflect.construct(target, args)
        window.__audioElements.push(element)
        return element
      },
    })

    const NativeContext = window.AudioContext
    window.AudioContext = new Proxy(NativeContext, {
      construct(target, args) {
        const context = Reflect.construct(target, args)
        window.__audioContexts.push(context)
        return context
      },
    })
    if (window.webkitAudioContext) {
      const NativeWebkit = window.webkitAudioContext
      window.webkitAudioContext = new Proxy(NativeWebkit, {
        construct(target, args) {
          const context = Reflect.construct(target, args)
          window.__audioContexts.push(context)
          return context
        },
      })
    }

    if (typeof OscillatorNode !== 'undefined') {
      const start = OscillatorNode.prototype.start
      OscillatorNode.prototype.start = function patchedOscillatorStart(...args) {
        window.__oscillatorStarts += 1
        return start.apply(this, args)
      }
    }
    if (typeof AudioBufferSourceNode !== 'undefined') {
      const start = AudioBufferSourceNode.prototype.start
      AudioBufferSourceNode.prototype.start = function patchedBufferStart(...args) {
        window.__bufferStarts += 1
        return start.apply(this, args)
      }
    }
  })
}

async function presetConsole(context, scale) {
  await context.addInitScript((tvUiScale) => {
    localStorage.setItem(
      'ciki.settings.v1',
      JSON.stringify({
        displayMode: 'console',
        tvUiScale,
        tvSafeArea: 24,
        graphicsPreset: 'high',
        musicVolume: 0.28,
        sfxVolume: 0.45,
      }),
    )
  }, scale)
}

async function audioSnapshot(page) {
  return page.evaluate(() => ({
    contexts: (window.__audioContexts ?? []).map((context) => context.state),
    elements: (window.__audioElements ?? []).map((element) => ({
      src: element.src.split('/').slice(-1)[0],
      paused: element.paused,
      currentTime: Number(element.currentTime.toFixed(2)),
      readyState: element.readyState,
    })),
    oscillators: window.__oscillatorStarts ?? 0,
    buffers: window.__bufferStarts ?? 0,
  }))
}

async function installVirtualXboxPad(page) {
  await page.evaluate(() => {
    const buttons = Array.from({ length: 17 }, () => ({
      pressed: false,
      touched: false,
      value: 0,
    }))
    const pad = {
      index: 0,
      id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)',
      connected: true,
      mapping: 'standard',
      axes: [0, 0, 0, 0],
      buttons,
      timestamp: performance.now(),
    }
    window.__virtualPad = pad
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true,
      value: () => [pad],
    })
  })
  await page.waitForTimeout(450)
}

async function padPress(page, button, hold = 700) {
  await page.evaluate((index) => {
    const pad = window.__virtualPad
    const value = pad?.buttons[index]
    if (!value) return
    value.pressed = true
    value.touched = true
    value.value = 1
    pad.timestamp = performance.now()
  }, button)
  await page.waitForTimeout(hold)
  await page.evaluate((index) => {
    const pad = window.__virtualPad
    const value = pad?.buttons[index]
    if (!value) return
    value.pressed = false
    value.value = 0
    pad.timestamp = performance.now()
  }, button)
  await page.waitForTimeout(150)
}

async function ensureController(page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const active = await page.evaluate(() =>
      document.body.classList.contains('is-controller'),
    )
    if (active) return true
    await padPress(page, 13)
    await page.waitForTimeout(300)
  }
  return page.evaluate(() => document.body.classList.contains('is-controller'))
}

async function focusInfo(page) {
  return page.evaluate(() => {
    const element = document.activeElement
    if (!(element instanceof HTMLElement)) return null
    const box = element.getBoundingClientRect()
    return {
      tag: element.tagName,
      text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
      aria: element.getAttribute('aria-label'),
      className: element.className?.toString().slice(0, 120),
      controller: document.body.classList.contains('is-controller'),
      inBattle: Boolean(element.closest('.battle')),
      box: {
        x: Number(box.x.toFixed(1)),
        y: Number(box.y.toFixed(1)),
        width: Number(box.width.toFixed(1)),
        height: Number(box.height.toFixed(1)),
        right: Number(box.right.toFixed(1)),
        bottom: Number(box.bottom.toFixed(1)),
      },
    }
  })
}

async function layout(page, selectors) {
  return page.evaluate((requested) => {
    const result = {
      viewport: { width: innerWidth, height: innerHeight },
      scroll: {
        x: scrollX,
        y: scrollY,
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      },
      boxes: {},
    }
    for (const [name, selector] of Object.entries(requested)) {
      const element = document.querySelector(selector)
      if (!element) {
        result.boxes[name] = null
        continue
      }
      const box = element.getBoundingClientRect()
      result.boxes[name] = {
        x: Number(box.x.toFixed(1)),
        y: Number(box.y.toFixed(1)),
        width: Number(box.width.toFixed(1)),
        height: Number(box.height.toFixed(1)),
        right: Number(box.right.toFixed(1)),
        bottom: Number(box.bottom.toFixed(1)),
      }
    }
    return result
  }, selectors)
}

async function checkHorizontal(page, label) {
  const metrics = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }))
  record(
    `${label}: no horizontal overflow`,
    metrics.document <= metrics.viewport + 1 && metrics.body <= metrics.viewport + 1,
    metrics,
  )
  return metrics
}

async function clippedTextReport(page) {
  return page.evaluate(() => {
    const selectors = [
      '.arena-mode__name',
      '.arena-mode__meta',
      '.settings-block h3',
      '.settings-choice__label',
      '.settings-choice__options button',
      '.settings-controller__row b',
      '.settings-controller__row em',
      '.side__head',
      '.hand__label',
      '.turnbox',
      '.btn--end',
      '.move-card',
    ]
    const results = []
    for (const element of document.querySelectorAll(selectors.join(','))) {
      if (!(element instanceof HTMLElement)) continue
      const box = element.getBoundingClientRect()
      if (box.width < 2 || box.height < 2) continue
      if (box.bottom < 0 || box.top > innerHeight) continue
      const style = getComputedStyle(element)
      const clips =
        style.overflow === 'hidden' ||
        style.overflowX === 'hidden' ||
        style.overflowY === 'hidden' ||
        style.textOverflow === 'ellipsis'
      if (!clips) continue
      const horizontal = element.scrollWidth > element.clientWidth + 2
      const vertical = element.scrollHeight > element.clientHeight + 2
      if (horizontal || vertical) {
        results.push({
          className: element.className?.toString().slice(0, 100),
          text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 90),
          client: [element.clientWidth, element.clientHeight],
          scroll: [element.scrollWidth, element.scrollHeight],
        })
      }
    }
    return results
  })
}

async function enterTrusted(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('.start-gate').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: /PRESS START TO ENTER/i }).click()
  await page.locator('.start-gate').waitFor({ state: 'detached' })
  await page.waitForTimeout(900)
}

async function startBattle(page) {
  await page.getByRole('button', { name: /PLAY — take the stage/i }).click()
  await page.getByRole('button', { name: /START THE SHOW/i }).waitFor({ state: 'visible' })
  await page.getByRole('button', { name: /START THE SHOW/i }).click()
  await page.waitForTimeout(1100)
  const skip = page.getByRole('button', { name: /Skip cinematic/i })
  if (await skip.isVisible().catch(() => false)) {
    await skip.click({ force: true })
    await page.waitForTimeout(500)
  }
  await page.locator('.battle').waitFor({ state: 'visible' })
}

async function backToMenu(page) {
  const back = page
    .locator('.team__brand, .subpage__top .link-btn, .career-top .link-btn')
    .first()
  await back.click()
  await page.locator('.arena-modes').waitFor({ state: 'visible' })
  await page.waitForTimeout(400)
}

async function auditScreen(page, options) {
  const { name, ariaName, selector, screenshot, backName } = options
  await page.getByRole('button', { name: ariaName }).click()
  await page.locator(selector).waitFor({ state: 'visible' })
  await page.waitForTimeout(500)

  await checkHorizontal(page, name)
  const controlCount = await page.locator(`${selector} button:not([disabled])`).count()
  record(`${name}: interactive controls rendered`, controlCount > 0, `${controlCount} buttons`)
  await page.screenshot({ path: `${OUT}/${screenshot}` })

  await padPress(page, 13)
  await page.waitForTimeout(350)
  const focus = await focusInfo(page)
  const inScreen = await page.evaluate(
    (screen) => Boolean(document.activeElement?.closest(screen)),
    selector,
  )
  record(`${name}: controller takes focus inside the screen`, Boolean(focus?.controller && inScreen), focus)
  evidence[name] = { controlCount, focus }

  await backToMenu(page)
  const menuVisible = await page.locator('.arena-mode--play').isVisible()
  record(`${name}: returns to the main menu`, menuVisible, backName)
}

async function auditSettings(page, label, screenshot) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const dialog = page.locator('.settings-modal')
  await dialog.waitFor({ state: 'visible' })
  await page.waitForTimeout(400)
  const metrics = await layout(page, {
    panel: '.settings-panel',
    close: '.settings-modal .icon-btn[aria-label="Close settings"]',
    footer: '.settings-foot',
    controller: '.settings-controller',
  })
  record(
    `${label}: settings panel fits the viewport`,
    Boolean(metrics.boxes.panel && metrics.boxes.panel.y >= 0 && metrics.boxes.panel.bottom <= VIEWPORT.height),
    metrics.boxes.panel,
  )
  record(
    `${label}: settings close button is visible`,
    Boolean(
      metrics.boxes.close &&
        metrics.boxes.close.y >= 0 &&
        metrics.boxes.close.bottom <= VIEWPORT.height &&
        metrics.boxes.close.x >= 0 &&
        metrics.boxes.close.right <= VIEWPORT.width,
    ),
    metrics.boxes.close,
  )
  await page.screenshot({ path: `${OUT}/${screenshot}` })

  const scrolled = await page.locator('.settings-panel').evaluate((panel) => {
    panel.scrollTop = panel.scrollHeight
    return {
      scrollTop: panel.scrollTop,
      scrollHeight: panel.scrollHeight,
      clientHeight: panel.clientHeight,
    }
  })
  await page.waitForTimeout(350)
  const footerVisible = await page.locator('.settings-panel .settings-foot').isVisible()
  const closeBox = await page.locator('.settings-modal .icon-btn[aria-label="Close settings"]').boundingBox()
  record(
    `${label}: settings can scroll to its footer without losing the close button`,
    footerVisible && Boolean(closeBox && closeBox.y >= 0 && closeBox.y + closeBox.height <= VIEWPORT.height),
    { scrolled, closeBox: rectOf(closeBox) },
  )
  await page.screenshot({ path: `${OUT}/${screenshot.replace('.png', '-bottom.png')}` })

  await page.locator('.settings-modal .icon-btn[aria-label="Close settings"]').click()
  await dialog.waitFor({ state: 'detached' })
  await page.waitForTimeout(300)
}

async function auditBattleLayout(page, label) {
  const metrics = await layout(page, {
    battle: '.battle',
    hud: '.battle__hud',
    board: '.battle__board',
    rivalStage: '.stage--rival',
    playerStage: '.stage--player',
    hand: '.hand',
    turnbox: '.turnbox',
    endTurn: '.btn--end',
    exit: '.battle__exit',
    tools: '.battle__tools',
  })
  await checkHorizontal(page, label)
  const { battle, rivalStage, playerStage, hand, turnbox, endTurn } = metrics.boxes
  record(`${label}: battle renders`, Boolean(battle && metrics.boxes.board), metrics.scroll)
  record(
    `${label}: rival and player stages do not overlap`,
    !overlapArea(rivalStage, playerStage),
    { rivalStage, playerStage },
  )
  record(`${label}: hand and turn controls do not overlap`, !overlapArea(hand, turnbox), {
    hand,
    turnbox,
  })
  record(
    `${label}: end-turn is inside the turn block`,
    Boolean(endTurn && turnbox && endTurn.x >= turnbox.x - 1 && endTurn.right <= turnbox.right + 1),
    { endTurn, turnbox },
  )
  const clipped = await clippedTextReport(page)
  record(`${label}: visible key text is not clipped`, clipped.length === 0, clipped)
  return metrics
}

async function makeScaleContext(scale) {
  const context = await browser.newContext({ viewport: VIEWPORT })
  await addAudioProbe(context)
  await presetConsole(context, scale)
  const page = await context.newPage()
  page.setDefaultTimeout(20_000)
  return { context, page }
}

const failuresAtStart = []
let mainContext
try {
  // ---------------------------------------------------------------- 100% main
  const main = await makeScaleContext(100)
  mainContext = main.context
  const page = main.page

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.locator('.start-gate').waitFor({ state: 'visible' })
  const beforeGate = await audioSnapshot(page)
  await page.screenshot({ path: `${OUT}/A-start-gate-1920x1080.png` })
  record('start gate is present before entry', true, await page.title())
  record(
    'no AudioContext is created before a trusted gesture',
    beforeGate.contexts.length === 0,
    beforeGate,
  )

  await page.getByRole('button', { name: /PRESS START TO ENTER/i }).click()
  await page.locator('.start-gate').waitFor({ state: 'detached' })
  await page.waitForTimeout(1000)
  const afterGate = await audioSnapshot(page)
  const menuTrack = afterGate.elements.find((element) => element.src.includes('ciki-main-theme'))
  record(
    'trusted start unlocks one audio context per engine',
    afterGate.contexts.length === 2 && afterGate.contexts.every((state) => state === 'running'),
    afterGate.contexts,
  )
  record(
    'trusted start begins menu music',
    Boolean(menuTrack && !menuTrack.paused && menuTrack.currentTime > 0.3),
    menuTrack,
  )
  record(
    'trusted start shows no audio fallback notice',
    (await page.locator('.audio-notice').count()) === 0,
    await page.locator('.audio-notice').count(),
  )
  await page.screenshot({ path: `${OUT}/B-main-menu-tv-100.png` })
  const menuMetrics = await layout(page, {
    play: '.arena-mode--play',
    lastDoor: '.arena-mode--career',
    radio: '.arena-radio',
  })
  record(
    '100% menu: all eight modes and radio are inside 1080p',
    Boolean(
      menuMetrics.boxes.lastDoor &&
        menuMetrics.boxes.lastDoor.bottom <= VIEWPORT.height &&
        menuMetrics.boxes.radio &&
        menuMetrics.boxes.radio.bottom <= VIEWPORT.height,
    ),
    menuMetrics.boxes,
  )
  await checkHorizontal(page, '100% menu')
  evidence.menu100 = menuMetrics

  await installVirtualXboxPad(page)

  await auditScreen(page, {
    name: 'Collection',
    ariaName: /COLLECTION — all fifty artists/i,
    selector: '.collection',
    screenshot: 'C-collection-tv-100.png',
    backName: 'collection back',
  })
  await auditScreen(page, {
    name: 'Mixtape',
    ariaName: /MIXTAPE STUDIO — build the 26/i,
    selector: '.builder',
    screenshot: 'D-mixtape-tv-100.png',
    backName: 'builder back',
  })
  await auditScreen(page, {
    name: 'Ultimate Team',
    ariaName: /ULTIMATE TEAM — Record Label HQ/i,
    selector: '.team',
    screenshot: 'E-ultimate-team-tv-100.png',
    backName: 'team back',
  })
  await auditScreen(page, {
    name: 'Career',
    ariaName: /MY ARTIST CAREER/i,
    selector: '.career',
    screenshot: 'F-career-tv-100.png',
    backName: 'career back',
  })
  await auditSettings(page, '100%', 'G-settings-tv-100.png')

  const contextsAfterMenus = await audioSnapshot(page)
  record(
    'menu navigation does not create duplicate AudioContexts',
    contextsAfterMenus.contexts.length === 2,
    contextsAfterMenus.contexts,
  )

  // Controller menu: Start opens Settings, B closes it.
  await page.locator('.arena-mode--play').focus()
  const menuActivated = await ensureController(page)
  const menuFocus = await focusInfo(page)
  record('controller activates the main-menu focus ring', menuActivated && Boolean(menuFocus?.controller), menuFocus)
  await page.locator('.arena-mode--play').focus()
  await padPress(page, 9)
  await page.locator('.settings-modal').waitFor({ state: 'visible' })
  record('controller Start opens Settings from the menu', true)
  await page.screenshot({ path: `${OUT}/controller-settings-open.png` })
  await padPress(page, 1, 700)
  await page.locator('.settings-modal').waitFor({ state: 'detached' })
  record('controller B closes Settings', true)

  // Start the battle with controller A, then use a trusted pointer only to
  // dismiss the optional cinematic.
  await page.locator('.arena-mode--play').focus()
  await padPress(page, 0)
  await page.locator('.show-intro').waitFor({ state: 'visible' })
  record('controller A opens the show intro', true)
  await page.waitForTimeout(500)
  await padPress(page, 0)
  await page.waitForTimeout(300)
  if (await page.locator('.show-intro').isVisible().catch(() => false)) {
    // The first press after a focus change only establishes focus; press again
    // to activate START THE SHOW, matching the controller focus contract.
    await padPress(page, 0)
  }
  await page.locator('.show-intro').waitFor({ state: 'detached' })
  await page.locator('.battle').waitFor({ state: 'visible' })
  record('controller A starts the show', true)
  const skip = page.getByRole('button', { name: /Skip cinematic/i })
  if (await skip.isVisible().catch(() => false)) {
    await skip.click({ force: true })
    await page.waitForTimeout(700)
  }
  const battleAudio = await audioSnapshot(page)
  const battleTrack = battleAudio.elements.find((element) => element.src.includes('southern-steel'))
  record(
    'battle music starts from the same unlocked audio context',
    battleAudio.contexts.length === 2 &&
      battleAudio.contexts.every((state) => state === 'running') &&
      Boolean(battleTrack && !battleTrack.paused && battleTrack.currentTime > 0.2),
    { contexts: battleAudio.contexts, battleTrack },
  )
  record(
    'DJ KICKIT announcer buffers play in battle',
    battleAudio.buffers > 0,
    { buffers: battleAudio.buffers, oscillators: battleAudio.oscillators },
  )

  await page.screenshot({ path: `${OUT}/H-battle-tv-100.png` })
  const battle100 = await auditBattleLayout(page, '100% battle')
  record(
    '100% battle: hand and END TURN are fully inside 1080p',
    Boolean(
      battle100.boxes.hand &&
        battle100.boxes.hand.bottom <= VIEWPORT.height &&
        battle100.boxes.endTurn &&
        battle100.boxes.endTurn.bottom <= VIEWPORT.height,
    ),
    { hand: battle100.boxes.hand, endTurn: battle100.boxes.endTurn },
  )
  evidence.battle100 = battle100

  // Controller battle actions.
  const battleActivated = await ensureController(page)
  await page.waitForTimeout(300)
  const battleFocus = await focusInfo(page)
  record(
    'controller focuses the battle board',
    battleActivated && Boolean(battleFocus?.controller && battleFocus.inBattle),
    battleFocus,
  )

  await padPress(page, 2)
  await page.locator('.card-inspector').waitFor({ state: 'visible' })
  record('X opens the focused card inspector', true)
  await page.screenshot({ path: `${OUT}/I-card-inspector-tv-100.png` })
  await padPress(page, 1, 500)
  await page.locator('.card-inspector').waitFor({ state: 'detached' })
  record('B closes the card inspector', true)

  await padPress(page, 3)
  await page.locator('.backstage-modal').waitFor({ state: 'visible' })
  record('Y opens Backstage', true)
  await padPress(page, 1, 500)
  await page.locator('.backstage-modal').waitFor({ state: 'detached' })
  record('B closes Backstage', true)

  const beforePauseSfx = await audioSnapshot(page)
  await padPress(page, 9)
  await page.locator('.battle-pause').waitFor({ state: 'visible' })
  record('controller Start opens the battle pause menu', true)
  await page.screenshot({ path: `${OUT}/J-battle-pause-tv-100.png` })
  const afterPauseSfx = await audioSnapshot(page)
  record(
    'pause SFX reaches the unlocked audio graph',
    afterPauseSfx.oscillators > beforePauseSfx.oscillators ||
      afterPauseSfx.buffers > beforePauseSfx.buffers,
    { before: beforePauseSfx.oscillators, after: afterPauseSfx.oscillators },
  )
  await padPress(page, 1, 500)
  await page.locator('.battle-pause').waitFor({ state: 'detached' })
  record('B closes the battle pause menu', true)

  await padPress(page, 5)
  const handFocus = await focusInfo(page)
  record(
    'RB moves controller focus into the hand',
    Boolean(handFocus?.text && (await page.evaluate(() => Boolean(document.activeElement?.closest('.hand'))))),
    handFocus,
  )
  await padPress(page, 7)
  const areaFocus = await focusInfo(page)
  record(
    'RT moves controller focus across battle areas',
    Boolean(areaFocus?.inBattle && areaFocus.text),
    areaFocus,
  )

  await page.evaluate(() => {
    document
      .querySelector('.stage--player .stage-unit[role="button"]')
      ?.focus({ preventScroll: true })
  })
  await padPress(page, 0)
  await page.locator('.move-dock').waitFor({ state: 'visible' })
  record('A opens the move dock for the focused artist', true)
  await page.screenshot({ path: `${OUT}/K-move-dock-tv-100.png` })
  await page.locator('button[aria-label="Close moves"]').click()
  await page.locator('.move-dock').waitFor({ state: 'detached' })
  record('the move dock can be closed', true)

  await page.locator('.btn--end').scrollIntoViewIfNeeded()
  const beforeEndTurn = await audioSnapshot(page)
  await page.locator('.btn--end').click()
  await page.waitForTimeout(500)
  const afterEndTurn = await audioSnapshot(page)
  record(
    'ENDING THE TURN is usable and triggers its SFX',
    afterEndTurn.oscillators > beforeEndTurn.oscillators ||
      afterEndTurn.buffers > beforeEndTurn.buffers,
    { before: beforeEndTurn.oscillators, after: afterEndTurn.oscillators },
  )
  const contextsAtEnd = await audioSnapshot(page)
  record(
    'the whole session keeps exactly two AudioContexts',
    contextsAtEnd.contexts.length === 2,
    contextsAtEnd.contexts,
  )

  // ------------------------------------------------------- 125% and 150% TV
  for (const scale of [125, 150]) {
    const { context, page: scaled } = await makeScaleContext(scale)
    await enterTrusted(scaled)
    await checkHorizontal(scaled, `${scale}% menu`)
    const menu = await layout(scaled, {
      firstDoor: '.arena-mode--play',
      lastDoor: '.arena-mode--career',
      radio: '.arena-radio',
    })
    await scaled.screenshot({ path: `${OUT}/menu-tv-${scale}.png`, fullPage: true })
    const doorCount = await scaled.locator('.arena-mode').count()
    record(`${scale}% menu: all eight modes render`, doorCount === 8, doorCount)
    let reachable = true
    for (const door of await scaled.locator('.arena-mode').all()) {
      try {
        await door.scrollIntoViewIfNeeded()
        const box = await door.boundingBox()
        if (!box || box.x < -1 || box.x + box.width > VIEWPORT.width + 1) reachable = false
      } catch {
        reachable = false
      }
    }
    record(`${scale}% menu: every mode is horizontally reachable`, reachable, menu.boxes)

    await auditSettings(scaled, `${scale}%`, `settings-tv-${scale}.png`)

    await startBattle(scaled)
    await scaled.screenshot({ path: `${OUT}/battle-tv-${scale}-top.png` })
    const battle = await auditBattleLayout(scaled, `${scale}% battle`)
    const initiallyVisible = Boolean(
      battle.boxes.endTurn && battle.boxes.endTurn.bottom <= VIEWPORT.height,
    )
    await scaled.locator('.btn--end').scrollIntoViewIfNeeded()
    await scaled.waitForTimeout(350)
    const actionBox = rectOf(await scaled.locator('.btn--end').boundingBox())
    record(
      `${scale}% battle: END TURN can be brought fully on screen`,
      Boolean(actionBox && actionBox.y >= 0 && actionBox.bottom <= VIEWPORT.height),
      { initiallyVisible, actionBox, documentHeight: battle.scroll.height },
    )
    await scaled.screenshot({ path: `${OUT}/battle-tv-${scale}-actions.png` })
    const clipped = await clippedTextReport(scaled)
    record(`${scale}% battle: key action text remains readable`, clipped.length === 0, clipped)
    evidence[`battle${scale}`] = { battle, actionBox, initiallyVisible }
    await context.close()
  }

  // ------------------------------------------- Controller-only audio fallback
  const fallback = await browser.newContext({ viewport: VIEWPORT })
  await fallback.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({
      pressed: false,
      touched: false,
      value: 0,
    }))
    const pad = {
      index: 0,
      id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)',
      connected: true,
      mapping: 'standard',
      axes: [0, 0, 0, 0],
      buttons,
      timestamp: performance.now(),
    }
    window.__virtualPad = pad
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true,
      value: () => [pad],
    })

    // Headless Chromium ignores Chrome's autoplay policy flag. Model a
    // suspended AudioContext explicitly: only a trusted pointer/key event may
    // release it. Synthetic gamepad clicks never set window.__allowAudio.
    window.__allowAudio = false
    window.__audioContexts = []
    const allow = (event) => {
      if (event.isTrusted) window.__allowAudio = true
    }
    document.addEventListener('pointerdown', allow, true)
    document.addEventListener('keydown', allow, true)

    const WrappedContext = window.AudioContext
    window.AudioContext = new Proxy(WrappedContext, {
      construct(target, args) {
        const raw = Reflect.construct(target, args)
        const blocked = new Proxy(raw, {
          get(context, property) {
            if (property === 'state') {
              return window.__allowAudio ? context.state : 'suspended'
            }
            if (property === 'resume') {
              return () =>
                window.__allowAudio
                  ? context.resume()
                  : Promise.reject(new Error('Audio activation required'))
            }
            const value = Reflect.get(context, property, context)
            return typeof value === 'function' ? value.bind(context) : value
          },
        })
        window.__audioContexts.push(blocked)
        return blocked
      },
    })
  })
  const fallbackPage = await fallback.newPage()
  fallbackPage.setDefaultTimeout(20_000)
  await fallbackPage.goto(BASE, { waitUntil: 'networkidle' })
  const fallbackGate = fallbackPage.locator('.start-gate')
  await fallbackGate.waitFor()
  await ensureController(fallbackPage)
  // The first A press may only establish the start-gate focus while the first
  // paint is still settling. Retry the held press until the untrusted click
  // enters, without ever dispatching a trusted pointer event.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (!(await fallbackGate.isVisible().catch(() => false))) break
    await padPress(fallbackPage, 0, 450)
    await fallbackPage.waitForTimeout(300)
  }
  await fallbackGate.waitFor({ state: 'detached' })
  await fallbackPage.waitForTimeout(300)
  const fallbackAudio = await audioSnapshot(fallbackPage)
  const noticeVisible = await fallbackPage.locator('.audio-notice').isVisible().catch(() => false)
  record(
    'controller-only entry enters without faking a trusted audio gesture',
    fallbackAudio.contexts.every((state) => state !== 'running'),
    fallbackAudio,
  )
  record('controller-only entry shows the audio fallback notice', noticeVisible)
  await fallbackPage.screenshot({ path: `${OUT}/L-audio-notice-controller-only.png` })
  if (noticeVisible) {
    await fallbackPage.getByRole('button', { name: /ENABLE AUDIO/i }).click()
    await fallbackPage.waitForTimeout(900)
    const enabled = await audioSnapshot(fallbackPage)
    record(
      'trusted ENABLE AUDIO recovers controller-only entry',
      enabled.contexts.length === 2 && enabled.contexts.every((state) => state === 'running'),
      enabled.contexts,
    )
    record(
      'audio fallback notice disappears after a real gesture',
      !(await fallbackPage.locator('.audio-notice').isVisible().catch(() => false)),
    )
  }
  await fallback.close()
} catch (error) {
  failuresAtStart.push(String(error?.stack || error))
  console.error('XBOX CHECK CRASHED', error)
} finally {
  await mainContext?.close().catch(() => {})
  await browser.close().catch(() => {})
}

const report = {
  generatedAt: new Date().toISOString(),
  url: BASE,
  viewport: VIEWPORT,
  environment: 'Headless Chromium on desktop with a virtual standard-mapping Xbox pad',
  hardwareTested: false,
  hardwareNote:
    'NOT HARDWARE TESTED: no Xbox Series S/X console or physical Xbox controller was available.',
  checks,
  evidence,
  crashed: failuresAtStart,
  summary: {
    passed: checks.filter((item) => item.pass).length,
    failed: checks.filter((item) => !item.pass).length,
    total: checks.length,
  },
}
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
console.log(`\nSUMMARY ${report.summary.passed}/${report.summary.total} checks passed`)
if (failuresAtStart.length || report.summary.failed) process.exitCode = 1
