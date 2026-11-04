import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
page.setDefaultTimeout(5000)
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`CONSOLE: ${message.text()}`)
})
page.on('pageerror', (error) => errors.push(`PAGEERROR: ${error.message}`))

const base = 'http://127.0.0.1:3000/'
const wait = (ms) => page.waitForTimeout(ms)

async function load(theme = 'b', width = 1440, height = 1000) {
  await page.setViewportSize({ width, height })
  await page.goto(base)
  await page.evaluate((value) => {
    localStorage.setItem(
      'ciki.settings.v1',
      JSON.stringify({ theme: value, selectedDirection: value, difficulty: 'OPENING' }),
    )
  }, theme)
  await page.reload()
  await wait(1800)
}

async function shot(name, fullPage = false) {
  await page.screenshot({ path: `artifacts/${name}.png`, fullPage })
  console.log('shot', name)
}

async function dismissCinematics() {
  for (let index = 0; index < 8; index += 1) {
    if (!(await page.locator('.cine').isVisible().catch(() => false))) return
    if (
      !globalThis.eraShot &&
      (await page.locator('.cine--wide').isVisible().catch(() => false))
    ) {
      globalThis.eraShot = true
      await shot('b-era-final')
    }
    await page.locator('.cine__skip').click().catch(() => {})
    await wait(300)
  }
}

async function uiState() {
  return page.evaluate(() => {
    const text = (selector) => document.querySelector(selector)?.textContent?.trim() ?? ''
    return {
      turn: text('.turnbox__label'),
      stage: document.querySelectorAll('.stage--player .card').length,
      hand: document.querySelectorAll('.hand__slot').length,
      hype: text('.crowd--player .hype-chip b'),
      crowd: text('.crowd--player .crowd__value'),
      rival: text('.crowd--rival .crowd__value'),
      feature: Boolean(document.querySelector('.feature-chip--ready')),
      encoreButtons: document.querySelectorAll('.stage--player .card-act--encore:not([disabled])').length,
      counter: Boolean(document.querySelector('.counter')),
      result: Boolean(document.querySelector('.result__panel')),
      era: text('.hud__era span'),
    }
  })
}

async function waitForTurnOrResult() {
  for (let index = 0; index < 90; index += 1) {
    const state = await uiState()
    if (state.result) return 'result'
    if (state.counter) {
      await page.getByRole('button', { name: /CLAPBACK/i }).click()
      await wait(550)
      await dismissCinematics()
      continue
    }
    if (await page.locator('.cine').isVisible().catch(() => false)) {
      await dismissCinematics()
      continue
    }
    if (state.turn.includes('YOUR TURN')) return 'player'
    await wait(500)
  }
  return 'timeout'
}

async function playOne() {
  const state = await uiState()
  if (state.stage >= 5) return false
  const cards = page.locator('.hand__slot .card.is-interactive')
  if ((await cards.count()) === 0) return false
  await cards.first().click()
  await wait(600)
  await dismissCinematics()
  return true
}

try {
  // Main menu
  await load('b')
  await shot('b-menu-final')

  // Direction sheet, with B selected.
  await page.getByRole('button', { name: /DESIGN ROOM/i }).click()
  await wait(900)
  await shot('b-lab-final', true)

  // Collection and the inspect/showcase modal.
  await load('b')
  await page.locator('.topnav button').filter({ hasText: 'THE 26' }).click()
  await wait(900)
  await shot('b-collection-final', true)
  await page.locator('.collection__card .card.is-interactive').first().click()
  await wait(700)
  await shot('b-showcase-final')
  await page.locator('.showcase__actions .btn--ghost').click()
  await wait(300)

  // Mixtape builder.
  await load('b')
  await page.locator('.topnav button').filter({ hasText: 'MIXTAPE' }).click()
  await wait(900)
  await shot('b-builder-final', true)

  // Intro and battlefield.
  await load('b')
  await page.getByRole('button', { name: /TAKE THE STAGE/i }).click()
  await wait(300)
  await shot('b-intro-final')
  await page.getByRole('button', { name: /START THE SHOW/i }).click()
  await wait(900)
  await dismissCinematics()
  await shot('b-battle-final')

  // A compact match for the B cinematics and result.
  let featured = false
  let encores = false
  let result = false
  for (let turn = 0; turn < 11; turn += 1) {
    const before = await uiState()
    if (before.result) {
      result = true
      break
    }
    if (!before.turn.includes('YOUR TURN')) {
      const outcome = await waitForTurnOrResult()
      if (outcome === 'result') {
        result = true
        break
      }
      if (outcome === 'timeout') break
    }
    await dismissCinematics()

    if (!featured && (await page.locator('.feature-chip--ready').isVisible().catch(() => false))) {
      await page.locator('.feature-chip--ready').click()
      await wait(500)
      featured = true
      await shot('b-feature-final')
      await dismissCinematics()
    }

    if (!encores && (await page.locator('.stage--player .card-act--encore:not([disabled])').count()) > 0) {
      await page.locator('.stage--player .card-act--encore:not([disabled])').first().click()
      await wait(500)
      encores = true
      await shot('b-encore-final')
      await dismissCinematics()
    }

    let plays = 0
    while (plays < 2) {
      if (!(await playOne())) break
      plays += 1
      if (!featured && (await page.locator('.feature-chip--ready').isVisible().catch(() => false))) {
        await page.locator('.feature-chip--ready').click()
        await wait(500)
        featured = true
        await shot('b-feature-final')
        await dismissCinematics()
      }
    }

    if (!featured && (await page.locator('.feature-chip--ready').isVisible().catch(() => false))) {
      await page.locator('.feature-chip--ready').click()
      await wait(500)
      featured = true
      await shot('b-feature-final')
      await dismissCinematics()
    }

    const end = page.getByRole('button', { name: /END TURN/i })
    if (!(await end.isEnabled())) {
      const outcome = await waitForTurnOrResult()
      if (outcome === 'result') {
        result = true
        break
      }
      continue
    }
    await end.click()
    await wait(900)
    const outcome = await waitForTurnOrResult()
    if (outcome === 'result') {
      result = true
      break
    }
    if (outcome === 'timeout') break
  }

  if (result || (await page.locator('.result__panel').isVisible().catch(() => false))) {
    await shot('b-result-final')
    console.log('RESULT', (await page.locator('.result__panel').innerText()).replace(/\n/g, ' | '))
  } else {
    await shot('b-battle-late-final')
    console.log('No result within the compact capture run')
  }

  // B on a phone.
  await load('b', 390, 844)
  await shot('b-menu-mobile-final', true)
  await page.getByRole('button', { name: /TAKE THE STAGE/i }).click()
  await wait(300)
  await page.getByRole('button', { name: /START THE SHOW/i }).click()
  await wait(900)
  await dismissCinematics()
  await shot('b-battle-mobile-final')
  await page.locator('.battle__exit .link-btn').click()
  await wait(250)
  await page.getByRole('button', { name: /LEAVE THE SHOW/i }).click()
  await wait(500)
  await page.locator('.topnav button').filter({ hasText: 'THE 26' }).click()
  await wait(800)
  await shot('b-collection-mobile-final', true)
  await page.locator('.subpage__top .link-btn').first().click()
  await wait(500)
  await page.locator('.topnav button').filter({ hasText: 'MIXTAPE' }).click()
  await wait(800)
  await shot('b-builder-mobile-final', true)

  console.log('B POLISH ERRORS', JSON.stringify(errors, null, 2))
  if (errors.length > 0) process.exitCode = 1
} catch (error) {
  console.error('B POLISH FAILED', error)
  await page.screenshot({ path: 'artifacts/b-polish-failure.png' }).catch(() => {})
  process.exitCode = 1
} finally {
  await browser.close()
}
