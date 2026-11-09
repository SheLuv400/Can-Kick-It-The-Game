/**
 * Two-client room chat and voice verification.
 *
 * Host and guest meet in a real 1v1 private room, exchange text in the lobby,
 * turn text off and back on, join voice with Chromium's fake microphone, verify
 * that each side receives a live remote audio track, start the battle and
 * exchange chat from the battle drawer.
 *
 * Run with:
 *   bun scripts/verify-chat.mjs
 * Requires the dev server on 127.0.0.1:3000 and the saved profiles from
 * scripts/verify-2v2.mjs (or verify-1v1.mjs).
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
  console.log(`[chat] PASS ${label}`)
}

async function restore(browser, key) {
  const statePath = join(STATE_DIR, `${key}.json`)
  if (!existsSync(statePath)) throw new Error(`missing profile ${statePath}; run verify-1v1.mjs first`)
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1024 },
    storageState: statePath,
    permissions: ['microphone'],
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

async function waitForSeats(page, count) {
  await page.waitForFunction(
    (expected) => document.querySelectorAll('.online-player.is-ready').length === expected,
    count,
    { timeout: 30_000 },
  )
}

async function sendChat(page, text) {
  const input = page.getByRole('textbox', { name: 'Chat message' })
  await input.fill(text)
  await page.getByRole('button', { name: /^SEND$/ }).click()
}

async function waitForMessage(page, text) {
  await page.locator('.room-chat__message', { hasText: text }).waitFor({ timeout: 20_000 })
}

function voiceButton(page) {
  return page.locator('.room-chat__toggle--voice')
}

async function remoteAudioSummary(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('audio')]
      .map((audio) => {
        const stream = audio.srcObject
        if (!(stream instanceof MediaStream)) return null
        return {
          tracks: stream.getAudioTracks().length,
          live: stream.getAudioTracks().filter((track) => track.readyState === 'live').length,
          readyState: audio.readyState,
        }
      })
      .filter(Boolean),
  )
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  })
  const clients = []
  try {
    const host = await restore(browser, 'a1')
    const guest = await restore(browser, 'a2')
    clients.push(host, guest)

    const code = await createRoom(host.page)
    await joinRoom(guest.page, code)
    await waitForSeats(host.page, 2)
    await waitForSeats(guest.page, 2)
    check('both clients enter the room', /^[A-Z0-9]{5}$/.test(code), code)

    await host.page.locator('.room-chat').waitFor()
    await guest.page.locator('.room-chat').waitFor()
    check('chat panel appears in the private room', true)

    await sendChat(host.page, 'HOST LINE ONE')
    await waitForMessage(guest.page, 'HOST LINE ONE')
    await waitForMessage(host.page, 'HOST LINE ONE')
    check('host text reaches both clients', true)

    await sendChat(guest.page, 'GUEST LINE ONE')
    await waitForMessage(host.page, 'GUEST LINE ONE')
    await waitForMessage(guest.page, 'GUEST LINE ONE')
    check('guest text reaches both clients', true)

    await guest.page.locator('.room-chat__toggle').filter({ hasText: 'TEXT ON' }).click()
    await guest.page.locator('.room-chat__off').waitFor()
    check('text chat can be disabled', true)
    await sendChat(host.page, 'WHILE GUEST MUTED')
    await waitForMessage(host.page, 'WHILE GUEST MUTED')
    check('host can still send while the guest text panel is off', true)
    await guest.page.locator('.room-chat__off button').click()
    await guest.page.locator('.room-chat__form').waitFor()
    await waitForMessage(guest.page, 'WHILE GUEST MUTED')
    check('text chat can be re-enabled and catches up', true)

    await voiceButton(host.page).click()
    await host.page.getByText('VOICE ON').first().waitFor()
    check('host microphone opens', true)
    await voiceButton(guest.page).click()
    await guest.page.getByText('VOICE ON').first().waitFor()
    await host.page.waitForFunction(
      () => document.querySelectorAll('audio').length >= 1,
      null,
      { timeout: 30_000 },
    )
    await guest.page.waitForFunction(
      () => document.querySelectorAll('audio').length >= 1,
      null,
      { timeout: 30_000 },
    )
    const hostAudio = await remoteAudioSummary(host.page)
    const guestAudio = await remoteAudioSummary(guest.page)
    check(
      'both clients receive a live remote voice track',
      hostAudio.some((entry) => entry.tracks > 0 && entry.live > 0) &&
        guestAudio.some((entry) => entry.tracks > 0 && entry.live > 0),
      JSON.stringify({ hostAudio, guestAudio }),
    )
    check(
      'voice roster reports the other seat',
      (await host.page.locator('.room-chat__hint').innerText()).includes('OTHER VOICE'),
    )

    await voiceButton(guest.page).click()
    await guest.page.getByText('VOICE OFF').first().waitFor()
    await host.page.waitForFunction(
      () => [...document.querySelectorAll('audio')].every((audio) => !audio.srcObject),
      null,
      { timeout: 20_000 },
    )
    check('turning voice off closes the remote call', true)

    for (const client of clients) {
      await client.page.getByRole('button', { name: /ACCEPT RULES/i }).click()
      await client.page.getByRole('button', { name: /CLEAR READY/i }).waitFor()
    }
    await host.page.waitForFunction(
      () => document.querySelectorAll('.house-ready span.is-ready').length === 2,
      null,
      { timeout: 30_000 },
    )
    await host.page.getByRole('button', { name: /START MATCH/i }).click()
    for (const client of clients) await client.page.locator('.battle').waitFor({ timeout: 30_000 })
    check('both clients enter the battle with chat state', true)

    await host.page.getByRole('button', { name: /^CHAT$/ }).click()
    await host.page.locator('.battle-chat-panel').waitFor()
    await sendChat(host.page, 'BATTLE LINE')
    await guest.page.getByRole('button', { name: /^CHAT$/ }).click()
    await guest.page.locator('.battle-chat-panel').waitFor()
    await waitForMessage(guest.page, 'BATTLE LINE')
    check('battle messages relay from the host', true)

    await sendChat(guest.page, 'GUEST BATTLE LINE')
    await waitForMessage(host.page, 'GUEST BATTLE LINE')
    check('battle chat works in both directions', true)

    await voiceButton(guest.page).click()
    await guest.page.getByText('VOICE ON').first().waitFor()
    await host.page.waitForFunction(
      () => document.querySelectorAll('audio').length >= 1,
      null,
      { timeout: 30_000 },
    )
    await guest.page.waitForFunction(
      () => document.querySelectorAll('audio').length >= 1,
      null,
      { timeout: 30_000 },
    )
    check('voice can be re-joined from the battle drawer', true)

    check('no page errors during chat/voice room', errors.length === 0, errors.join(' | '))
    console.log(`[chat] ${checks.length} checks passed in room ${code}`)
  } finally {
    if (errors.length) console.log('ERRORS', errors)
    await browser.close()
  }
}

main().catch((error) => {
  console.error('VERIFY_CHAT_FAILED', error)
  process.exitCode = 1
})
