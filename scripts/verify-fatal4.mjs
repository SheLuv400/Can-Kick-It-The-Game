/**
 * Four-client Fatal 4 verification.
 *
 * Host, Guest 1, Guest 2 and Guest 3 meet in one private room, select FATAL 4,
 * ready up and play a full rotation. The test checks the four corners, active
 * turn locking, target switching, hidden hands, round advance and the 390px
 * battle layout.
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
  console.log(`[fatal4] PASS ${label}`)
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

async function visibleHandSize(page) {
  return page.locator('.hand__slot').count()
}

async function roomState(page) {
  return page.evaluate(() => window.__cikiRoomState ?? null)
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
    const guest3 = await restore(browser, 'b2')
    clients.push(host, guest1, guest2, guest3)
    const pages = () => clients.map((client) => client.page)

    const code = await createRoom(host.page)
    check('private room code generated', /^[A-Z0-9]{5}$/.test(code), code)
    await host.page.locator('.house-format').filter({ hasText: 'FATAL 4' }).click()
    await host.page.locator('.house-format.is-active').filter({ hasText: 'FATAL 4' }).waitFor()
    await host.page.locator('.format-stage').filter({ hasText: 'FOUR-WAY MAIN EVENT' }).waitFor()
    check('host selects Fatal 4', true)

    await joinRoom(guest1.page, code)
    await waitForPlayers([host.page], 2)
    await joinRoom(guest2.page, code)
    await waitForPlayers(pages().slice(0, 3), 3)
    await joinRoom(guest3.page, code)
    await waitForPlayers(pages(), 4)
    check('all four corners join the room', true)

    const names = await host.page.locator('.online-player.is-ready b').allInnerTexts()
    check('host sees exactly four players', names.length === 4 && new Set(names).size === 4, names.join(', '))
    check(
      'the four seats are the expected players',
      ['TEST_PLAYER_A1', 'TEST_PLAYER_A2', 'TEST_PLAYER_B1', 'TEST_PLAYER_B2'].every((name) => names.includes(name)),
      names.join(', '),
    )

    for (const client of clients) await markReady(client.page)
    await host.page.waitForFunction(
      () => document.querySelectorAll('.house-ready span.is-ready').length === 4,
      null,
      { timeout: 30_000 },
    )
    const start = host.page.getByRole('button', { name: /START MATCH/i })
    check('host can start when all four corners are ready', await start.isEnabled())
    await start.click()
    for (const page of pages()) await page.locator('.battle').waitFor({ timeout: 30_000 })
    for (const page of pages()) {
      const intro = page.locator('.house-intro')
      if (await intro.isVisible().catch(() => false)) await intro.click({ force: true }).catch(() => {})
      await intro.waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {})
    }

    for (const page of pages()) {
      await page.locator('.triple-mics.is-fatal').waitFor({ timeout: 20_000 })
      check('four-corner board is visible', (await page.locator('.triple-mic').count()) === 4)
    }
    await waitForActive(host.page, 'TEST_PLAYER_A1')
    check('host holds the opening turn in Fatal 4', true)
    check('host sees one target', (await host.page.locator('.triple-mic.is-target').count()) === 1)
    check('inactive guests cannot end the turn', !(await guest1.page.getByRole('button', { name: /END TURN/i }).isEnabled()))

    const hostTurnState = await roomState(guest1.page)
    check('guest receives the Fatal 4 match state', hostTurnState?.party?.format === 'fatal-4')
    check('guest sees four seats', hostTurnState?.party?.seats?.length === 4)
    check('guest is locked to Fatal 4 rules', hostTurnState?.houseRules?.format === 'fatal-4')
    check('waiting guest hand is hidden', hostTurnState?.player?.hand?.length === 0)
    check('guest sees the target hand hidden', hostTurnState?.rival?.hand?.length === 0)

    await host.page.locator('.triple-mic').filter({ hasText: 'TEST_PLAYER_B1' }).click()
    for (const page of pages()) await waitForTarget(page, 'TEST_PLAYER_B1')
    check('host can switch the target before acting', true)

    await host.page.getByRole('button', { name: /END TURN/i }).click()
    for (const page of pages()) await waitForActive(page, 'TEST_PLAYER_A2')
    check('turn two hands the mic to Guest 1', true)
    check('Guest 1 can act', await guest1.page.getByRole('button', { name: /END TURN/i }).isEnabled())
    check('Guest 1 sees its own hand', (await visibleHandSize(guest1.page)) > 0)
    check(
      'spectators do not see the active hand',
      (await visibleHandSize(host.page)) === 0 &&
        (await visibleHandSize(guest2.page)) === 0 &&
        (await visibleHandSize(guest3.page)) === 0,
    )

    await guest1.page.locator('.triple-mic').filter({ hasText: 'TEST_PLAYER_B2' }).click()
    for (const page of pages()) await waitForTarget(page, 'TEST_PLAYER_B2')
    await guest1.page.getByRole('button', { name: /END TURN/i }).click()
    for (const page of pages()) await waitForActive(page, 'TEST_PLAYER_B1')
    check('turn three hands the mic to Guest 2', true)

    await guest2.page.getByRole('button', { name: /END TURN/i }).click()
    for (const page of pages()) await waitForActive(page, 'TEST_PLAYER_B2')
    check('turn four hands the mic to Guest 3', true)
    check('Guest 3 sees its own hand', (await visibleHandSize(guest3.page)) > 0)

    await guest3.page.getByRole('button', { name: /END TURN/i }).click()
    for (const page of pages()) await waitForActive(page, 'TEST_PLAYER_A1')
    const wrapped = await roomState(guest1.page)
    check('the room wraps back to the host', wrapped?.party?.activeSeat === 'host')
    check('a full four-corner cycle advances the round', wrapped?.round > hostTurnState?.round, `${hostTurnState?.round} -> ${wrapped?.round}`)

    await host.page.setViewportSize({ width: 390, height: 844 })
    await host.page.waitForTimeout(150)
    const overflow = await host.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    check('Fatal 4 fits a 390px phone without horizontal overflow', !overflow)
    await host.page.screenshot({ path: 'artifacts/fatal4-mobile.png', fullPage: true })

    // Run the clock out without spending cards. This checks the live result
    // screen, every final crowd and the rematch reset rather than only the
    // rotation code.
    const activePages = [host, guest1, guest2, guest3]
    const activeNames = ['TEST_PLAYER_A1', 'TEST_PLAYER_A2', 'TEST_PLAYER_B1', 'TEST_PLAYER_B2']
    const turnsToCurfew = (13 - (wrapped?.round ?? 1)) * 4
    for (let turn = 0; turn < turnsToCurfew; turn += 1) {
      const page = activePages[turn % 4].page
      await page.getByRole('button', { name: /END TURN/i }).click()
      if (turn < turnsToCurfew - 1) {
        await waitForActive(activePages[(turn + 1) % 4].page, activeNames[(turn + 1) % 4])
      }
    }
    await host.page.locator('.result').waitFor({ timeout: 20_000 })
    check('Fatal 4 reaches the curfew result', true)
    check('the result lists all four final crowds', (await host.page.locator('.result__ff-seat').count()) === 4)
    check('the result does not reuse the two-player crowd layout', (await host.page.locator('.result__crowds').count()) === 0)
    check('the curfew result is readable', (await host.page.locator('.result h2').innerText()).includes('CURFEW'))

    await host.page.getByRole('button', { name: /RUN IT BACK/i }).click()
    await host.page.locator('.result').waitFor({ state: 'detached', timeout: 20_000 })
    await guest1.page.waitForFunction(
      () => {
        const state = window.__cikiRoomState
        return Boolean(state?.party) && state.phase !== 'over' && state.round === 1
      },
      null,
      { timeout: 20_000 },
    )
    const rematch = await roomState(guest1.page)
    check('rematch restores the four-corner party', rematch?.party?.order?.length === 4)
    check(
      'rematch restores all four crowds',
      Object.values(rematch?.party?.sides ?? {}).every((side) => side.crowd === 72),
    )
    await host.page.waitForTimeout(150)
    const rematchOverflow = await host.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    check('rematch keeps the 390px layout contained', !rematchOverflow)

    await guest3.page.locator('.battle__exit button').click()
    await guest3.page.getByRole('button', { name: /LEAVE THE SHOW/i }).click()
    const departedCorner = host.page.locator('.triple-mic.is-out').filter({ hasText: 'TEST_PLAYER_B2' })
    await departedCorner.waitFor({ timeout: 20_000 })
    check('a leaving Fatal 4 corner does not end the room', (await host.page.locator('.result').count()) === 0)
    check('a leaving corner is marked as left', (await departedCorner.innerText()).includes('LEFT'))
    check('no page errors during the four-corner match', errors.length === 0, errors.join(' | '))
    console.log(`[fatal4] ${checks.length} checks passed in room ${code}`)
  } finally {
    if (errors.length) console.log('ERRORS', errors)
    await browser.close()
  }
}

main().catch((error) => {
  console.error('VERIFY_FATAL4_FAILED', error)
  process.exitCode = 1
})
