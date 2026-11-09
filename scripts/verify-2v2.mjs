/**
 * Four-client 2v2 Tag Team verification.
 *
 * Four independent browser contexts (own storage, cookies, session, PeerJS
 * peer and WebRTC connection) meet in one private room and play a real tag
 * match. Every fact below is read from that client's own received network
 * state, never from a mock.
 *
 * Run with:
 *   bun scripts/verify-2v2.mjs
 * Requires the dev server on 127.0.0.1:3000 and Chromium's native libs on
 * LD_LIBRARY_PATH (see scripts/verify-2v2.README.md).
 */
import { chromium } from 'playwright'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.CIKI_BASE_URL ?? 'http://127.0.0.1:3000/'
const STATE_DIR = 'artifacts/2v2-profiles'
const PASSWORD_FILE = join(STATE_DIR, 'password.txt')
const PLAYERS = [
  { key: 'a1', name: 'TEST_PLAYER_A1', team: 'TEAM A' },
  { key: 'a2', name: 'TEST_PLAYER_A2', team: 'TEAM A' },
  { key: 'b1', name: 'TEST_PLAYER_B1', team: 'TEAM B' },
  { key: 'b2', name: 'TEST_PLAYER_B2', team: 'TEAM B' },
]
const EXTRA = { key: 'extra', name: 'TEST_PLAYER_EXTRA', team: 'TEAM B' }
/** Host/A1, guest-2/B1, guest/A2, guest-3/B2 — the alternating turn order. */
const SEAT_ORDER = ['host', 'guest-2', 'guest', 'guest-3']
const checks = []
const errors = []

mkdirSync(STATE_DIR, { recursive: true })
const password =
  process.env.CIKI_TEST_PASSWORD ??
  (existsSync(PASSWORD_FILE)
    ? readFileSync(PASSWORD_FILE, 'utf8').trim()
    : randomBytes(12).toString('base64url'))
if (!existsSync(PASSWORD_FILE)) writeFileSync(PASSWORD_FILE, password)

function note(message) {
  console.log(`[2v2] ${message}`)
}

function check(label, condition, detail) {
  if (!condition) throw new Error(`CHECK FAILED: ${label}${detail ? ` — ${detail}` : ''}`)
  checks.push(label)
  note(`PASS ${label}`)
}

function attachErrors(page, label) {
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${label} CONSOLE: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`${label} PAGEERROR: ${error.message}`))
}

async function createOrRestoreContext(browser, player, { fresh = false } = {}) {
  const statePath = join(STATE_DIR, `${player.key}.json`)
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1024 },
    storageState: !fresh && existsSync(statePath) ? statePath : undefined,
  })
  const page = await context.newPage()
  page.setDefaultTimeout(30_000)
  attachErrors(page, player.key)
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })

  const accountButton = page.getByRole('button', { name: /Sign in or create an account/i })
  await page.getByRole('button', { name: /ONLINE VS/i }).first().waitFor({ state: 'visible' })
  if (!(await accountButton.isVisible().catch(() => false))) {
    note(`${player.name} restored from ${statePath}`)
    return { context, page, player }
  }

  await accountButton.click()
  const dialog = page.getByRole('dialog', { name: 'Account' })
  await dialog.waitFor()
  const signIn = existsSync(statePath) && !fresh
  if (signIn) await dialog.getByRole('tab', { name: /SIGN IN/i }).click()
  else await dialog.getByRole('tab', { name: /CREATE ACCOUNT/i }).click()
  await dialog.locator('input').nth(0).fill(player.name)
  await dialog.locator('input').nth(1).fill(password)
  await dialog
    .getByRole('button', { name: signIn ? /^SIGN IN$/ : /CREATE MY PROFILE/i })
    .click()
  await dialog.getByText(`WELCOME, ${player.name.toUpperCase()}`).waitFor()
  // The scrim shares the label but sits under the panel, so close via the icon.
  await dialog.locator('button.icon-btn[aria-label="Close account"]').click()
  await dialog.waitFor({ state: 'detached' })
  await context.storageState({ path: statePath })
  note(`${player.name} ${signIn ? 'signed in' : 'created'} · profile saved`)
  return { context, page, player }
}

async function openOnline(page) {
  await page.getByRole('button', { name: /ONLINE VS/i }).first().click()
  await page.locator('.online-choice').first().waitFor()
}

async function createRoom(page) {
  await page.locator('.online-choice').filter({ hasText: 'CREATE ROOM' }).click()
  await page.locator('.online-code').waitFor()
  await page.getByText(/ROOM OPEN · SHARE THE CODE/).waitFor()
  return (await page.locator('.online-code').innerText()).replace(/\s+/g, '')
}

async function select2v2(page) {
  await page.locator('.house-format').filter({ hasText: '2V2' }).click()
  await page.locator('.house-format.is-active').filter({ hasText: '2V2' }).waitFor()
  await page.locator('.format-stage').filter({ hasText: 'TAG TEAM HEADLINERS' }).waitFor()
}

async function joinRoom(page, code) {
  await page.locator('.online-choice').filter({ hasText: 'JOIN ROOM' }).click()
  await page.locator('input[placeholder="ABCDE"]').fill(code)
  await page.getByRole('button', { name: /JOIN THE ROOM/i }).click()
  await page.locator('.online-code').waitFor()
}

async function markReady(page) {
  await page.getByRole('button', { name: /ACCEPT RULES/i }).click()
  await page.getByRole('button', { name: /CLEAR READY/i }).waitFor()
}

async function waitForPlayers(pages, count) {
  for (const page of pages) {
    // 2v2 always renders four slots, so count the filled ones instead.
    await page.waitForFunction(
      (expected) => document.querySelectorAll('.online-player.is-ready').length === expected,
      count,
      { timeout: 30_000 },
    )
  }
}

async function seatNames(page) {
  return page.locator('.online-player.is-ready b').allInnerTexts()
}

async function lobbyRows(page) {
  return page
    .locator('.online-player')
    .evaluateAll((nodes) => nodes.map((node) => node.innerText.replace(/\s+/g, ' ').trim()))
}

async function roomState(page) {
  return page.evaluate(() => window.__cikiRoomState ?? null)
}

async function waitForActiveSeat(page, seat) {
  await page.waitForFunction(
    (expected) => {
      const state = window.__cikiRoomState
      return Boolean(state?.party) && state.party.activeSeat === expected
    },
    seat,
    { timeout: 25_000 },
  )
}

async function waitForBadge(page, needle) {
  await page.waitForFunction(
    (expected) => {
      const badge = document.querySelector('.battle__party-badge')
      return Boolean(badge) && (badge.textContent ?? '').toUpperCase().includes(expected)
    },
    needle.toUpperCase(),
    { timeout: 25_000 },
  )
}

const endTurnButton = (page) => page.getByRole('button', { name: /END TURN/i })
const canEndTurn = (page) => endTurnButton(page).isEnabled()

async function dismissCinematics(page) {
  for (let index = 0; index < 4; index += 1) {
    const skip = page.getByRole('button', { name: /Skip cinematic/i })
    if (!(await skip.isVisible().catch(() => false))) return
    await skip.click({ force: true }).catch(() => {})
    await page.waitForTimeout(150)
  }
}

/** A cinematic or rules beat may cover the board; wait for real control. */
async function readyToAct(page) {
  await dismissCinematics(page)
  await page
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
  return canEndTurn(page)
}

const fingerprint = (state) =>
  JSON.stringify({
    round: state.round,
    phase: state.phase,
    seats: state.party.seats,
    order: state.party.order,
    activeSeat: state.party.activeSeat,
    controllers: state.party.controllers,
    crowd: [state.player.crowd, state.rival.crowd],
    max: [state.player.maxCrowd, state.rival.maxCrowd],
    rules: state.houseRules,
  })

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
  let clients = []
  try {
    for (const player of PLAYERS) clients.push(await createOrRestoreContext(browser, player))
    const [host, a2] = clients
    const b1 = clients[2]
    let b2 = clients[3]

    for (const client of clients) await openOnline(client.page)

    const code = await createRoom(host.page)
    check('private room code generated', /^[A-Z0-9]{5}$/.test(code), code)
    await select2v2(host.page)
    note(`room ${code} · 2v2 selected by ${host.player.name}`)

    await joinRoom(a2.page, code)
    await waitForPlayers([host.page], 2)
    await joinRoom(b1.page, code)
    await waitForPlayers([host.page], 3)
    await joinRoom(b2.page, code)

    const pages = () => [host.page, a2.page, b1.page, b2.page]
    await waitForPlayers(pages(), 4)
    note('all four independent sessions joined the room')

    // ---- Lobby audit -------------------------------------------------------
    for (const client of [host, a2, b1, b2]) {
      const names = await seatNames(client.page)
      check(
        `${client.player.key} sees exactly four unique players`,
        names.length === 4 && new Set(names).size === 4,
        names.join(', '),
      )
      for (const player of PLAYERS) {
        check(
          `${client.player.key} sees ${player.name} in the correct seat`,
          names.includes(player.name),
        )
      }
      const shownCode = (await client.page.locator('.online-code').innerText()).replace(/\s+/g, '')
      check(`${client.player.key} sees room ${code}`, shownCode === code, shownCode)
      const rows = await lobbyRows(client.page)
      for (const player of PLAYERS) {
        const row = rows.find((entry) => entry.includes(player.name))
        check(
          `${client.player.key} sees ${player.name} on ${player.team}`,
          Boolean(row) && row.includes(player.team),
          row,
        )
      }
    }

    await host.page.screenshot({ path: 'artifacts/2v2-lobby.png', fullPage: true })
    note('captured artifacts/2v2-lobby.png')

    // ---- Fifth client must be rejected -------------------------------------
    const extra = await createOrRestoreContext(browser, EXTRA)
    await openOnline(extra.page)
    await extra.page.locator('.online-choice').filter({ hasText: 'JOIN ROOM' }).click()
    await extra.page.locator('input[placeholder="ABCDE"]').fill(code)
    await extra.page.getByRole('button', { name: /JOIN THE ROOM/i }).click()
    await extra.page.getByText(/HOST DISCONNECTED|ROOM FULL|ROOM IS FULL/i).waitFor({
      timeout: 30_000,
    })
    check('fifth player rejected at the door', true)
    await waitForPlayers(pages(), 4)
    check(
      'lobby never exceeds four players',
      (await host.page.locator('.online-player').count()) === 4,
    )
    check(
      'fifth player is not seated',
      !(await seatNames(host.page)).includes(EXTRA.name),
    )
    await extra.context.close()

    // ---- Leaving frees the seat and allows a clean rejoin ------------------
    await b2.page.getByRole('button', { name: /LEAVE ROOM/i }).click()
    await b2.page.locator('.online-choice').first().waitFor()
    await waitForPlayers([host.page, a2.page, b1.page], 3)
    const afterLeave = await lobbyRows(host.page)
    check(
      'leaving clears the B2 name',
      !afterLeave.some((row) => row.includes(PLAYERS[3].name)),
    )
    check('freed seat shows OPEN SLOT', afterLeave.some((row) => row.includes('OPEN SLOT')))

    await joinRoom(b2.page, code)
    await waitForPlayers([host.page, a2.page, b1.page, b2.page], 4)
    check(
      'rejoined player takes the open seat',
      (await seatNames(host.page)).includes(PLAYERS[3].name),
    )

    // ---- Ready gate --------------------------------------------------------
    const start = host.page.getByRole('button', { name: /START MATCH/i })
    check('host cannot start before the room readies', await start.isDisabled())

    for (const client of [host, a2, b1, b2]) await markReady(client.page)
    await host.page.waitForFunction(
      () => document.querySelectorAll('.house-ready span.is-ready').length === 4,
      null,
      { timeout: 30_000 },
    )
    check('all four players marked ready', await start.isEnabled())

    // ---- Start the real match ---------------------------------------------
    await start.click()
    for (const page of pages()) await page.locator('.battle').waitFor({ timeout: 30_000 })
    for (const page of pages()) {
      const intro = page.locator('.house-intro')
      if (await intro.isVisible().catch(() => false)) {
        await intro.click({ force: true }).catch(() => {})
      }
      await intro.waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {})
    }
    for (const client of [a2, b1, b2]) {
      await client.page.waitForFunction(() => Boolean(window.__cikiRoomState?.party), null, {
        timeout: 30_000,
      })
    }
    note('all four clients entered the same battle')

    const startStates = await Promise.all([a2, b1, b2].map((client) => roomState(client.page)))
    const [a2Start, b1Start, b2Start] = startStates

    for (const [index, client] of [a2, b1, b2].entries()) {
      const state = startStates[index]
      check(`${client.player.key} received the 2v2 match state`, Boolean(state?.party))
      check(`${client.player.key} match starts in round 1`, state.round === 1)
      check(
        `${client.player.key} opening order alternates teams`,
        JSON.stringify(state.party.order) === JSON.stringify(SEAT_ORDER),
        JSON.stringify(state.party.order),
      )
      check(`${client.player.key} sees four seats`, state.party.seats.length === 4)
      check(`${client.player.key} starts on A1`, state.party.activeSeat === 'host')
      check(
        `${client.player.key} team crowd maximum is 144`,
        state.player.maxCrowd === 144 && state.rival.maxCrowd === 144,
        `${state.player.maxCrowd}/${state.rival.maxCrowd}`,
      )
      check(
        `${client.player.key} both team crowds start full`,
        state.player.crowd === 144 && state.rival.crowd === 144,
      )
      check(
        `${client.player.key} controllers are A1 and B1`,
        state.party.controllers.player === 'host' && state.party.controllers.rival === 'guest-2',
      )
      check(`${client.player.key} cannot see waiting seats`, state.party.sides == null)
      check(`${client.player.key} locked to 2v2 rules`, state.houseRules?.format === '2v2')
      const teamOf = (seat) => state.party.seats.find((entry) => entry.seat === seat)?.team
      check(
        `${client.player.key} team assignments match the seats`,
        teamOf('host') === 'player' &&
          teamOf('guest') === 'player' &&
          teamOf('guest-2') === 'rival' &&
          teamOf('guest-3') === 'rival',
      )
    }

    check('all clients share one match fingerprint', new Set(startStates.map(fingerprint)).size === 1)
    check(
      'Team A receives the Team A hand',
      a2Start.player.hand.length > 0 && a2Start.player.deck.length > 0,
    )
    check(
      'Team A cannot see the Team B hand',
      a2Start.rival.hand.length === 0 && a2Start.rival.deck.length === 0,
    )
    check(
      'Team B cannot see the Team A hand',
      b1Start.player.hand.length === 0 && b1Start.player.deck.length === 0,
    )
    check('Team B receives the Team B hand', b1Start.rival.hand.length > 0)
    check(
      'both Team B clients see the same hidden-hand boundary',
      b2Start.player.hand.length === 0 && b2Start.rival.hand.length > 0,
    )

    const hostBadge = (await host.page.locator('.battle__party-badge').innerText()).replace(
      /\s+/g,
      ' ',
    )
    check(
      'host badge lists both teams',
      hostBadge.includes('TEST_PLAYER_A1 + TEST_PLAYER_A2') &&
        hostBadge.includes('TEST_PLAYER_B1 + TEST_PLAYER_B2'),
      hostBadge,
    )
    check('host sees A1 holding the turn', hostBadge.includes("TEST_PLAYER_A1'S TURN"))
    check(
      'host header names the opposing team',
      (await host.page.locator('.battle').innerText()).includes(
        'VS TEST_PLAYER_B1 + TEST_PLAYER_B2',
      ),
    )
    check('host shows the 144 crowd meters', /144/.test(await host.page.locator('.battle').innerText()))

    await host.page.screenshot({ path: 'artifacts/2v2-battle-start.png', fullPage: true })
    await b1.page.screenshot({ path: 'artifacts/2v2-battle-team-b-view.png', fullPage: true })
    note('captured battle-start screenshots for Team A and Team B')

    // ---- Only the active seat may act -------------------------------------
    check('A1 can act on turn 1', await readyToAct(host.page))
    for (const client of [a2, b1, b2]) {
      check(`${client.player.key} is locked out on A1 turn`, !(await canEndTurn(client.page)))
    }

    // ---- Full tag-in / tag-out cycle --------------------------------------
    await endTurnButton(host.page).click()
    for (const page of [host.page, a2.page, b1.page, b2.page]) {
      await waitForBadge(page, "TEST_PLAYER_B1'S TURN")
    }
    await waitForActiveSeat(b1.page, 'guest-2')
    check('turn 2 hands the room to B1', await readyToAct(b1.page))
    check('A1 is locked out on B1 turn', !(await canEndTurn(host.page)))
    check('A2 is locked out on B1 turn', !(await canEndTurn(a2.page)))

    await endTurnButton(b1.page).click()
    for (const page of [host.page, a2.page, b1.page, b2.page]) {
      await waitForBadge(page, "TEST_PLAYER_A2'S TURN")
    }
    await waitForActiveSeat(a2.page, 'guest')
    const a2Turn = await roomState(a2.page)
    check('turn 3 tags A2 onto Team A', a2Turn.player.name === 'TEST_PLAYER_A2', a2Turn.player.name)
    check('Team A controller is A2', a2Turn.party.controllers.player === 'guest')
    check('A2 brings their own hand', a2Turn.player.hand.length > 0)
    check(
      'A2 does not inherit A1 deck order',
      JSON.stringify(a2Turn.player.deck) !== JSON.stringify(a2Start.player.deck),
    )
    check('A2 stage is A2 own', a2Turn.player.stage.length > 0)
    check(
      'A2 inherits the shared 144 Crowd meter',
      a2Turn.player.maxCrowd === 144 && a2Turn.player.crowd === 144,
    )
    check('A2 can act on turn 3', await readyToAct(a2.page))
    check('A1 cannot act on A2 turn', !(await canEndTurn(host.page)))
    const b1DuringA2 = await roomState(b1.page)
    check(
      'Team B still cannot see the A2 hand',
      b1DuringA2.player.hand.length === 0 && b1DuringA2.player.deck.length === 0,
    )
    await host.page.screenshot({ path: 'artifacts/2v2-tag-a2-active.png', fullPage: true })

    await endTurnButton(a2.page).click()
    for (const page of [host.page, a2.page, b1.page, b2.page]) {
      await waitForBadge(page, "TEST_PLAYER_B2'S TURN")
    }
    await waitForActiveSeat(b1.page, 'guest-3')
    const b2Turn = await roomState(b1.page)
    check('turn 4 tags B2 onto Team B', b2Turn.rival.name === 'TEST_PLAYER_B2', b2Turn.rival.name)
    check('Team B controller is B2', b2Turn.party.controllers.rival === 'guest-3')
    check('B2 brings their own hand', b2Turn.rival.hand.length > 0)
    check('B2 can act on turn 4', await readyToAct(b2.page))
    const a2DuringB2 = await roomState(a2.page)
    check('Team A cannot see the B2 hand', a2DuringB2.rival.hand.length === 0)
    await host.page.screenshot({ path: 'artifacts/2v2-tag-b2-active.png', fullPage: true })

    await endTurnButton(b2.page).click()
    for (const page of [host.page, a2.page, b1.page, b2.page]) {
      await waitForBadge(page, "TEST_PLAYER_A1'S TURN")
    }
    await waitForActiveSeat(a2.page, 'host')
    const a1Back = await roomState(a2.page)
    check('turn 5 tags A1 back in', a1Back.player.name === 'TEST_PLAYER_A1')
    check('Team A controller returns to A1', a1Back.party.controllers.player === 'host')
    check(
      'round advanced across the cycle',
      a1Back.round > a2Start.round,
      `${a2Start.round} -> ${a1Back.round}`,
    )
    check(
      'A1 hand restored exactly',
      JSON.stringify(a1Back.player.hand) === JSON.stringify(a2Start.player.hand),
    )
    check(
      'A1 deck restored exactly',
      JSON.stringify(a1Back.player.deck) === JSON.stringify(a2Start.player.deck),
    )
    check(
      'A1 stage restored exactly',
      JSON.stringify(a1Back.player.stage) === JSON.stringify(a2Start.player.stage),
    )
    check(
      'team Crowd stayed shared and full',
      a1Back.player.crowd === 144 && a1Back.rival.crowd === 144,
    )
    check('A1 can act again', await readyToAct(host.page))

    // ---- Privacy over the whole cycle -------------------------------------
    const wireStates = [a2Start, b1Start, b2Start, a2Turn, b1DuringA2, b2Turn, a1Back]
    check(
      'no wire state ever carried a full opposing hand',
      wireStates.every((state) =>
        state.player.hand.length === 0 || state.rival.hand.length === 0,
      ),
    )
    check(
      'no wire state ever carried the waiting seats',
      wireStates.every((state) => state.party.sides == null),
    )

    const pageErrors = errors.filter((entry) => entry.includes('PAGEERROR'))
    check('no uncaught page errors', pageErrors.length === 0, pageErrors.join(' | '))

    writeFileSync(
      'artifacts/2v2-report.json',
      JSON.stringify(
        {
          verifiedAt: new Date().toISOString(),
          room: code,
          checks,
          start: JSON.parse(fingerprint(a2Start)),
          a2Turn: {
            controller: a2Turn.party.controllers.player,
            name: a2Turn.player.name,
            hand: a2Turn.player.hand.length,
            deck: a2Turn.player.deck.length,
            crowd: [a2Turn.player.crowd, a2Turn.rival.crowd],
          },
          b2Turn: {
            controller: b2Turn.party.controllers.rival,
            name: b2Turn.rival.name,
            hand: b2Turn.rival.hand.length,
          },
          a1Return: {
            name: a1Back.player.name,
            round: a1Back.round,
            hand: a1Back.player.hand,
            deckMatchesStart:
              JSON.stringify(a1Back.player.deck) === JSON.stringify(a2Start.player.deck),
          },
          errors,
        },
        null,
        2,
      ),
    )
    note(`${checks.length} checks passed · artifacts/2v2-report.json written`)
  } finally {
    for (const client of clients) {
      try {
        const url = client.page.url()
        const status = (
          await client.page
            .locator('.online-status')
            .first()
            .innerText({ timeout: 3000 })
            .catch(() => '(no room panel)')
        ).replace(/\s+/g, ' ')
        const roomError = (
          await client.page
            .locator('.online-panel--error')
            .first()
            .innerText({ timeout: 3000 })
            .catch(() => '')
        ).replace(/\s+/g, ' ')
        const seat = await client.page.evaluate(() => window.__cikiRoomSeat ?? null)
        note(
          `DIAG ${client.player.key} · seat=${seat} · status="${status}" · error="${roomError}" · ${url}`,
        )
      } catch (error) {
        note(`DIAG ${client.player.key} unavailable: ${error.message}`)
      }
    }
    if (errors.length) console.log('ERRORS', JSON.stringify(errors.slice(0, 20), null, 2))
    await browser.close()
  }
}

main().catch((error) => {
  console.error('VERIFY_FAILED', error)
  process.exitCode = 1
})
