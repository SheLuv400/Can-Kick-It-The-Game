/**
 * Three-client Triple Threat verification.
 *
 * Host, guest 1 and guest 2 meet in one private room, select the three-mic
 * format, ready up and play a real rotation. The test checks all three seats,
 * active-turn locking, target switching, privacy of hidden hands and the
 * host -> guest -> guest-2 -> host cycle.
 *
 * Run with:
 *   bun scripts/verify-triple.mjs
 * Requires the dev server on 127.0.0.1:3000 and the saved profiles from
 * scripts/verify-2v2.mjs.
 */
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.CIKI_BASE_URL ?? 'http://127.0.0.1:3000/'
const STATE_DIR = 'artifacts/2v2-profiles'
const checks = []
const errors = []

function check(label, condition, detail) {
  if (!condition) throw new Error(`CHECK FAILED: ${label}${detail ? ` — ${detail}` : ''}`)
  checks.push(label)
  console.log(`[triple] PASS ${label}`)
}

async function restore(browser, key) {
  const statePath = join(STATE_DIR, `${key}.json`)
  if (!existsSync(statePath)) throw new Error(`missing profile ${statePath}; run verify-2v2.mjs first`)
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1024 },
    storageState: statePath,
  })
  const page = await context.newPage()
  page.setDefaultTimeout(30_000)
  page.on('pageerror', (error) => errors.push(`${key} PAGEERROR: ${error.message}`))
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /ONLINE VS/i }).first().click()
  await page.locator('.online-choice').first().waitFor()
  return { context, page, key }
}

async function createRoom(page) {
  await page.locator('.online-choice').filter({ hasText: 'CREATE ROOM' }).click()
  await page.locator('.online-code').waitFor()
  await page.getByText(/ROOM OPEN · SHARE THE CODE/).waitFor()
  return (await page.locator('.online-code').innerText()).replace(/\s+/g, '')
}

async function joinRoom(page, code) {
  await page.locator('.online-choice').filter({ hasText: 'JOIN ROOM' }).click()
  await page.locator('input[placeholder="ABCDE"]').fill(code)
  await page.getByRole('button', { name: /JOIN THE ROOM/i }).click()
  await page.locator('.online-code').waitFor()
}

async function waitForPlayers(pages, count) {
  for (const page of pages) {
    await page.waitForFunction(
      (expected) => document.querySelectorAll('.online-player.is-ready').length === expected,
      count,
      { timeout: 45_000 },
    )
  }
}

async function markReady(page) {
  await page.getByRole('button', { name: /ACCEPT RULES/i }).click()
  await page.getByRole('button', { name: /CLEAR READY/i }).waitFor()
}

async function waitForActive(page, name) {
  await page.waitForFunction(
    (expected) => {
      const active = document.querySelector('.triple-mic.is-active')
      return Boolean(active) && (active.textContent ?? '').toUpperCase().includes(expected)
    },
    name.toUpperCase(),
    { timeout: 30_000 },
  )
}

async function waitForTarget(page, name) {
  await page.waitForFunction(
    (expected) => {
      const target = document.querySelector('.triple-mic.is-target')
      return Boolean(target) && (target.textContent ?? '').toUpperCase().includes(expected)
    },
    name.toUpperCase(),
    { timeout: 30_000 },
  )
}

async function roomState(page) {
  return page.evaluate(() => window.__cikiRoomState ?? null)
}

async function visibleHandSize(page) {
  return page.locator('.hand__slot').count()
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
  const clients = []
  try {
    const host = await restore(browser, 'a1')
    const guest1 = await restore(browser, 'a2')
    const guest2 = await restore(browser, 'b1')
    clients.push(host, guest1, guest2)
    const pages = () => clients.map((client) => client.page)

    const code = await createRoom(host.page)
    check('private room code generated', /^[A-Z0-9]{5}$/.test(code), code)
    await host.page.locator('.house-format').filter({ hasText: 'TRIPLE THREAT' }).click()
    await host.page.locator('.house-format.is-active').filter({ hasText: 'TRIPLE THREAT' }).waitFor()
    await host.page.locator('.format-stage').filter({ hasText: 'THREE MICS, ONE CROWN' }).waitFor()
    check('host selects Triple Threat', true)

    await joinRoom(guest1.page, code)
    await waitForPlayers([host.page], 2)
    await joinRoom(guest2.page, code)
    await waitForPlayers(pages(), 3)
    check('all three mics join the room', true)

    const names = await host.page.locator('.online-player.is-ready b').allInnerTexts()
    check('host sees exactly three players', names.length === 3 && new Set(names).size === 3, names.join(', '))
    check('the three seats are the expected players', names.includes('TEST_PLAYER_A1') && names.includes('TEST_PLAYER_A2') && names.includes('TEST_PLAYER_B1'))

    for (const client of clients) await markReady(client.page)
    await host.page.waitForFunction(
      () => document.querySelectorAll('.house-ready span.is-ready').length === 3,
      null,
      { timeout: 30_000 },
    )
    const start = host.page.getByRole('button', { name: /START MATCH/i })
    check('host can start when all three mics are ready', await start.isEnabled())
    await start.click()
    for (const page of pages()) await page.locator('.battle').waitFor({ timeout: 30_000 })
    for (const page of pages()) {
      const intro = page.locator('.house-intro')
      if (await intro.isVisible().catch(() => false)) await intro.click({ force: true }).catch(() => {})
      await intro.waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {})
    }

    for (const page of pages()) {
      await page.locator('.triple-mics').waitFor({ timeout: 20_000 })
      check('three-mic board is visible', (await page.locator('.triple-mic').count()) === 3)
    }
    await waitForActive(host.page, 'TEST_PLAYER_A1')
    await host.page.screenshot({ path: 'artifacts/triple-battle.png', fullPage: true })
    check('host holds the opening turn', true)
    check('host sees a target', (await host.page.locator('.triple-mic.is-target').count()) === 1)
    check('inactive guests cannot end the turn', !(await guest1.page.getByRole('button', { name: /END TURN/i }).isEnabled()))

    const hostTurnState = await roomState(guest1.page)
    check('guest receives the Triple Threat match state', hostTurnState?.party?.format === 'triple-threat')
    check('guest sees three seats', hostTurnState?.party?.seats?.length === 3)
    check('guest is locked to three-mic rules', hostTurnState?.houseRules?.format === 'triple-threat')
    check('waiting guest hand is hidden', hostTurnState?.player?.hand?.length === 0, String(hostTurnState?.player?.hand?.length))
    check('guest sees the target hand hidden', hostTurnState?.rival?.hand?.length === 0)

    await host.page.locator('.triple-mic').filter({ hasText: 'TEST_PLAYER_B1' }).click()
    for (const page of pages()) await waitForTarget(page, 'TEST_PLAYER_B1')
    check('host can switch the target before acting', true)

    await host.page.getByRole('button', { name: /END TURN/i }).click()
    for (const page of pages()) await waitForActive(page, 'TEST_PLAYER_A2')
    check('turn two hands the mic to guest 1', true)
    check('guest 1 can act on its turn', await guest1.page.getByRole('button', { name: /END TURN/i }).isEnabled())
    check('host is locked out on guest 1 turn', !(await host.page.getByRole('button', { name: /END TURN/i }).isEnabled()))
    check('guest 1 sees its own hand', (await visibleHandSize(guest1.page)) > 0)
    check('spectators do not see the active hand', (await visibleHandSize(host.page)) === 0 && (await visibleHandSize(guest2.page)) === 0)

    await guest1.page.locator('.triple-mic').filter({ hasText: 'TEST_PLAYER_A1' }).click()
    for (const page of pages()) await waitForTarget(page, 'TEST_PLAYER_A1')
    check('active guest can switch the target', true)

    await guest1.page.getByRole('button', { name: /END TURN/i }).click()
    for (const page of pages()) await waitForActive(page, 'TEST_PLAYER_B1')
    check('turn three hands the mic to guest 2', true)
    check('guest 2 sees its own hand', (await visibleHandSize(guest2.page)) > 0)
    const guest2State = await roomState(guest2.page)
    check('guest 2 is the active player in its own state', guest2State?.party?.activeSeat === 'guest-2', guest2State?.party?.activeSeat)

    await guest2.page.getByRole('button', { name: /END TURN/i }).click()
    for (const page of pages()) await waitForActive(page, 'TEST_PLAYER_A1')
    const wrapped = await roomState(guest1.page)
    check('the room wraps back to the host', wrapped?.party?.activeSeat === 'host')
    check('a full three-mic cycle advances the round', wrapped?.round > hostTurnState?.round, `${hostTurnState?.round} -> ${wrapped?.round}`)
    await host.page.setViewportSize({ width: 390, height: 844 })
    await host.page.waitForTimeout(150)
    const overflow = await host.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    check('Triple Threat fits a 390px phone without horizontal overflow', !overflow)
    await host.page.screenshot({ path: 'artifacts/triple-mobile.png', fullPage: true })
    check('no page errors during the three-mic match', errors.length === 0, errors.join(' | '))
    console.log(`[triple] ${checks.length} checks passed in room ${code}`)
  } finally {
    if (errors.length) console.log('ERRORS', errors)
    await browser.close()
  }
}

main().catch((error) => {
  console.error('VERIFY_TRIPLE_FAILED', error)
  process.exitCode = 1
})
