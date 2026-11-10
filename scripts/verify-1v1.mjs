/**
 * Two-client 1v1 Online VS smoke test.
 *
 * Confirms the existing 1v1 private room still starts, swaps turns and keeps
 * its normal 72 Crowd maximum after the 2v2 tag-team work.
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
  console.log(`[1v1] PASS ${label}`)
}

async function enterGame(page) {
  const gate = page.getByRole('button', { name: /PRESS START TO ENTER/i })
  if (await gate.isVisible().catch(() => false)) {
    await gate.click()
    await page.locator('.start-gate').waitFor({ state: 'detached' })
  }
}

async function restore(browser, key, name) {
  const statePath = join(STATE_DIR, `${key}.json`)
  if (!existsSync(statePath)) throw new Error(`missing profile ${statePath}; run verify-2v2.mjs first`)
  const mobile = key === 'a2'
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1024 },
    storageState: statePath,
  })
  const page = await context.newPage()
  page.setDefaultTimeout(30_000)
  page.on('pageerror', (error) => errors.push(`${key} PAGEERROR: ${error.message}`))
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await enterGame(page)
  await page.getByRole('button', { name: /ONLINE VS/i }).first().click()
  await page.locator('.online-choice').first().waitFor()
  return { context, page, name }
}

async function waitForSeats(page, count) {
  await page.waitForFunction(
    (expected) => document.querySelectorAll('.online-player.is-ready').length === expected,
    count,
    { timeout: 30_000 },
  )
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
  const clients = []
  try {
    const host = await restore(browser, 'a1', 'TEST_PLAYER_A1')
    const guest = await restore(browser, 'a2', 'TEST_PLAYER_A2')
    clients.push(host, guest)
    check('1v1 uses a desktop host and mobile guest', (await host.page.evaluate(() => innerWidth)) === 1440 && (await guest.page.evaluate(() => innerWidth)) === 390)

    await host.page.locator('.online-choice').filter({ hasText: 'CREATE ROOM' }).click()
    await host.page.getByText(/ROOM OPEN · SHARE THE CODE/).waitFor()
    const code = (await host.page.locator('.online-code').innerText()).replace(/\s+/g, '')
    check('1v1 room code generated', /^[A-Z0-9]{5}$/.test(code), code)
    check(
      '1v1 is the default format',
      (await host.page.locator('.house-format.is-active').innerText()).includes('1V1'),
    )

    await guest.page.locator('.online-choice').filter({ hasText: 'JOIN ROOM' }).click()
    await guest.page.locator('input[placeholder="ABCDE"]').fill(code)
    await guest.page.getByRole('button', { name: /JOIN THE ROOM/i }).click()
    await waitForSeats(host.page, 2)
    await waitForSeats(guest.page, 2)
    check('both 1v1 seats filled', (await host.page.locator('.online-player.is-ready').count()) === 2)

    for (const client of clients) {
      await client.page.getByRole('button', { name: /ACCEPT RULES/i }).click()
      await client.page.getByRole('button', { name: /CLEAR READY/i }).waitFor()
    }
    const start = host.page.getByRole('button', { name: /START MATCH/i })
    await host.page.waitForFunction(
      () => document.querySelectorAll('.house-ready span.is-ready').length === 2,
      null,
      { timeout: 30_000 },
    )
    check('host can start the 1v1', await start.isEnabled())
    await start.click()

    for (const client of clients) await client.page.locator('.battle').waitFor({ timeout: 30_000 })
    await host.page.getByRole('button', { name: /Skip cinematic/i }).click({ force: true }).catch(() => {})
    await guest.page.getByRole('button', { name: /Skip cinematic/i }).click({ force: true }).catch(() => {})
    check('both clients entered the 1v1 battle', true)

    await guest.page.waitForFunction(() => Boolean(window.__cikiRoomState?.player), null, {
      timeout: 30_000,
    })
    const raw = await guest.page.evaluate(() => window.__cikiRoomState)
    check('1v1 sends no tag-team party', raw.party == null)
    check(
      '1v1 keeps the 72 Crowd maximum',
      raw.player.maxCrowd === 72 && raw.rival.maxCrowd === 72,
      `${raw.player.maxCrowd}/${raw.rival.maxCrowd}`,
    )

    const endTurn = (page) => page.getByRole('button', { name: /END TURN/i })
    await host.page
      .waitForFunction(
        () => {
          const button = [...document.querySelectorAll('button')].find((entry) =>
            /END TURN/i.test(entry.textContent ?? ''),
          )
          return Boolean(button) && !button.disabled
        },
        null,
        { timeout: 15_000 },
      )
      .catch(() => {})
    check('host can act first in 1v1', await endTurn(host.page).isEnabled())
    check('guest waits for the host in 1v1', !(await endTurn(guest.page).isEnabled()))

    await endTurn(host.page).click()
    await guest.page
      .waitForFunction(
        () => {
          const button = [...document.querySelectorAll('button')].find((entry) =>
            /END TURN/i.test(entry.textContent ?? ''),
          )
          return Boolean(button) && !button.disabled
        },
        null,
        { timeout: 20_000 },
      )
      .catch(() => {})
    check('guest takes the 1v1 turn', await endTurn(guest.page).isEnabled())
    check('host is locked out on the guest turn', !(await endTurn(host.page).isEnabled()))

    check('no 1v1 page errors', errors.length === 0, errors.join(' | '))
    console.log(`[1v1] ${checks.length} checks passed in room ${code}`)
  } finally {
    if (errors.length) console.log('ERRORS', errors)
    await browser.close()
  }
}

main().catch((error) => {
  console.error('VERIFY_FAILED', error)
  process.exitCode = 1
})
