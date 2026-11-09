/**
 * Four-client 2v2 room chat and voice mesh verification.
 *
 * Four independent browser contexts join one 2v2 private room. Each client
 * opens its own fake microphone, verifies three live remote audio streams from
 * the other seats, mutes one seat and confirms the mesh shrinks, then checks
 * that one chat line reaches all four clients.
 *
 * Run with:
 *   bun scripts/verify-voice-mesh.mjs
 * Requires the dev server on 127.0.0.1:3000 and the saved 2v2 profiles.
 */
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.CIKI_BASE_URL ?? 'http://127.0.0.1:3000/'
const STATE_DIR = 'artifacts/2v2-profiles'
const PLAYERS = ['a1', 'a2', 'b1', 'b2']
const checks = []
const errors = []

function check(label, condition, detail) {
  if (!condition) throw new Error(`CHECK FAILED: ${label}${detail ? ` — ${detail}` : ''}`)
  checks.push(label)
  console.log(`[mesh] PASS ${label}`)
}

async function restore(browser, key) {
  const statePath = join(STATE_DIR, `${key}.json`)
  if (!existsSync(statePath)) throw new Error(`missing profile ${statePath}; run verify-2v2.mjs first`)
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

async function remoteAudioCount(page) {
  return page.evaluate(
    () =>
      [...document.querySelectorAll('audio')].filter((audio) => {
        const stream = audio.srcObject
        return (
          stream instanceof MediaStream &&
          stream.getAudioTracks().some((track) => track.readyState === 'live')
        )
      }).length,
  )
}

async function waitForRemoteAudio(page, count) {
  await page.waitForFunction(
    (expected) =>
      [...document.querySelectorAll('audio')].filter((audio) => {
        const stream = audio.srcObject
        return (
          stream instanceof MediaStream &&
          stream.getAudioTracks().some((track) => track.readyState === 'live')
        )
      }).length === expected,
    count,
    { timeout: 45_000 },
  )
}

async function enableVoice(page) {
  await page.locator('.room-chat__toggle--voice').click()
  await page.getByText('VOICE ON').first().waitFor({ timeout: 20_000 })
}

async function waitForSeats(page, count) {
  await page.waitForFunction(
    (expected) => document.querySelectorAll('.online-player.is-ready').length === expected,
    count,
    { timeout: 45_000 },
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
    const guest1 = await restore(browser, 'a2')
    const guest2 = await restore(browser, 'b1')
    const guest3 = await restore(browser, 'b2')
    clients.push(host, guest1, guest2, guest3)

    await host.page.locator('.online-choice').filter({ hasText: 'CREATE ROOM' }).click()
    await host.page.locator('.online-code').waitFor()
    await host.page.getByText(/ROOM OPEN · SHARE THE CODE/).waitFor()
    const code = (await host.page.locator('.online-code').innerText()).replace(/\s+/g, '')
    await host.page.locator('.house-format').filter({ hasText: '2V2' }).click()
    await host.page.locator('.house-format.is-active').filter({ hasText: '2V2' }).waitFor()

    for (const guest of [guest1, guest2, guest3]) {
      await guest.page.locator('.online-choice').filter({ hasText: 'JOIN ROOM' }).click()
      await guest.page.locator('input[placeholder="ABCDE"]').fill(code)
      await guest.page.getByRole('button', { name: /JOIN THE ROOM/i }).click()
      await guest.page.locator('.online-code').waitFor()
    }
    for (const client of clients) await waitForSeats(client.page, 4)
    check('four seats fill the 2v2 room', true)

    for (const client of clients) await enableVoice(client.page)
    for (const client of clients) await waitForRemoteAudio(client.page, 3)
    const counts = await Promise.all(clients.map((client) => remoteAudioCount(client.page)))
    check(
      'every seat receives three live voice streams',
      counts.every((count) => count === 3),
      JSON.stringify(counts),
    )

    await clients[2].page.locator('.room-chat__toggle--voice').click()
    await clients[2].page.getByText('VOICE OFF').first().waitFor()
    for (const client of [clients[0], clients[1], clients[3]]) {
      await waitForRemoteAudio(client.page, 2)
    }
    check(
      'muting one seat shrinks the mesh for the other three',
      (await remoteAudioCount(clients[2].page)) === 0,
    )

    const input = host.page.getByRole('textbox', { name: 'Chat message' })
    await input.fill('ALL FOUR SEATS')
    await host.page.getByRole('button', { name: /^SEND$/ }).click()
    for (const client of clients) {
      await client.page
        .locator('.room-chat__message', { hasText: 'ALL FOUR SEATS' })
        .waitFor({ timeout: 20_000 })
    }
    check('one chat line fans out to all four clients', true)

    await clients[2].page.getByRole('textbox', { name: 'Chat message' }).fill('B1 TO THE ROOM')
    await clients[2].page.getByRole('button', { name: /^SEND$/ }).click()
    for (const client of clients) {
      await client.page
        .locator('.room-chat__message', { hasText: 'B1 TO THE ROOM' })
        .waitFor({ timeout: 20_000 })
    }
    check('a guest line fans out through the host to all four clients', true)

    check('no page errors during the four-seat mesh', errors.length === 0, errors.join(' | '))
    console.log(`[mesh] ${checks.length} checks passed in room ${code}`)
  } finally {
    if (errors.length) console.log('ERRORS', errors)
    await browser.close()
  }
}

main().catch((error) => {
  console.error('VERIFY_MESH_FAILED', error)
  process.exitCode = 1
})
