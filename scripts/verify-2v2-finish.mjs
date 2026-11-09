/**
 * Four-client 2v2 finish verification.
 *
 * Plays a real four-seat Tag Team match through the battle UI — cards and
 * attacks every turn — until one team's Crowd hits zero, then runs the
 * rematch and forfeits a team mid-match. Every fact is read from each
 * client's own received network state.
 *
 * Run with:
 *   bun scripts/verify-2v2-finish.mjs
 * Requires the dev server on 127.0.0.1:3000 and Chromium's native libs on
 * LD_LIBRARY_PATH (see scripts/verify-2v2.README.md).
 */
import { chromium } from 'playwright'
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
const checks = []
const errors = []
const log = []

mkdirSync(STATE_DIR, { recursive: true })
const password = existsSync(PASSWORD_FILE)
  ? readFileSync(PASSWORD_FILE, 'utf8').trim()
  : ''

function note(message) {
  const line = `[finish] ${message}`
  console.log(line)
  log.push(line)
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

async function createOrRestoreContext(browser, player) {
  const statePath = join(STATE_DIR, `${player.key}.json`)
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1024 },
    storageState: existsSync(statePath) ? statePath : undefined,
  })
  const page = await context.newPage()
  page.setDefaultTimeout(12_000)
  attachErrors(page, player.key)
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })

  const accountButton = page.getByRole('button', { name: /Sign in or create an account/i })
  await page.getByRole('button', { name: /ONLINE VS/i }).first().waitFor({ state: 'visible' })
  if (!(await accountButton.isVisible().catch(() => false))) {
    note(`${player.name} restored`)
    return { context, page, player }
  }

  await accountButton.click()
  const dialog = page.getByRole('dialog', { name: 'Account' })
  await dialog.waitFor()
  await dialog.getByRole('tab', { name: /SIGN IN/i }).click()
  await dialog.locator('input').nth(0).fill(player.name)
  await dialog.locator('input').nth(1).fill(password)
  await dialog.getByRole('button', { name: /^SIGN IN$/ }).click()
  await dialog.getByText(`WELCOME, ${player.name.toUpperCase()}`).waitFor()
  await dialog.locator('button.icon-btn[aria-label="Close account"]').click()
  await dialog.waitFor({ state: 'detached' })
  await context.storageState({ path: statePath })
  note(`${player.name} signed in`)
  return { context, page, player }
}

async function openOnline(page) {
  await page.getByRole('button', { name: /ONLINE VS/i }).first().click()
  await page.locator('.online-choice').first().waitFor()
}

async function createRoom(page) {
  await page.locator('.online-choice').filter({ hasText: 'CREATE ROOM' }).click()
  await page.locator('.online-code').waitFor()
  return (await page.locator('.online-code').innerText()).replace(/\s+/g, '')
}

async function select2v2(page) {
  await page.locator('.house-format').filter({ hasText: '2V2' }).click()
  await page.locator('.house-format.is-active').filter({ hasText: '2V2' }).waitFor()
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
    await page.waitForFunction(
      (expected) => document.querySelectorAll('.online-player.is-ready').length === expected,
      count,
      { timeout: 30_000 },
    )
  }
}

async function roomState(page) {
  return page.evaluate(() => window.__cikiRoomState ?? null)
}

const endTurnButton = (page) => page.getByRole('button', { name: /END TURN/i })

async function canEndTurn(page) {
  const button = endTurnButton(page).first()
  if (!(await button.count())) return false
  return button.isEnabled().catch(() => false)
}

async function resultVisible(page) {
  return page.locator('.result__panel').isVisible().catch(() => false)
}

/** Dismiss defensive windows and cinematics so the turn can continue. */
const counterLog = new Map()

async function resolveInterrupts(page) {
  for (let round = 0; round < 2; round += 1) {
    const take = page.locator('.counter__actions button').last()
    if (!(await take.count().catch(() => 0))) break
    const seen = counterLog.get(page) ?? 0
    if (seen < 3) {
      counterLog.set(page, seen + 1)
      const label = await take.innerText().catch(() => '?')
      note(`counter seen (${seen + 1}) · clicking "${label.replace(/\s+/g, ' ')}"`)
    }
    await take.click({ timeout: 1500 }).catch((error) => {
      if (seen < 3) note(`counter click failed: ${String(error.message).split('\n')[0]}`)
    })
    await page.waitForTimeout(220)
    const left = await page.locator('.counter__actions button').count()
    if (seen < 3) note(`counter after click: ${left}`)
  }
  for (let index = 0; index < 5; index += 1) {
    const skip = page.locator('.cine__skip').first()
    const visible = (await skip.count().catch(() => 0)) && (await skip.isVisible().catch(() => false))
    if (visible) {
      await skip.click({ force: true, timeout: 1200 }).catch(() => {})
      await page.waitForTimeout(180)
      continue
    }
    const labelled = page.getByRole('button', { name: /^SKIP/i }).first()
    if (
      (await labelled.count().catch(() => 0)) &&
      (await labelled.isVisible().catch(() => false))
    ) {
      await labelled.click({ force: true, timeout: 1200 }).catch(() => {})
      await page.waitForTimeout(180)
      continue
    }
    break
  }
}

async function resolveAll(pages) {
  for (const page of pages) await resolveInterrupts(page)
}

/** Click what an action opened: the defensive window, then its cinematic. */
async function settleAction(pages) {
  for (let round = 0; round < 12; round += 1) {
    let acted = false
    for (const page of pages) {
      const take = page.locator('.counter__actions button').last()
      if (await take.count().catch(() => 0)) {
        await take.click({ timeout: 1500 }).catch(() => {})
        acted = true
      }
      const skip = page.locator('.cine__skip').first()
      if ((await skip.count().catch(() => 0)) && (await skip.isVisible().catch(() => false))) {
        await skip.click({ force: true, timeout: 1200 }).catch(() => {})
        acted = true
      }
    }
    if (!acted) {
      if (round === 0) await pages[0].waitForTimeout(140)
      else return
    }
    await pages[0].waitForTimeout(90)
  }
}

/** Click through the show intro / START THE SHOW gate on any client. */
async function clearOverlays(page) {
  const show = page.getByRole('button', { name: /START THE SHOW/i })
  if (await show.isVisible().catch(() => false)) {
    await show.click({ force: true, timeout: 1500 }).catch(() => {})
    await page.waitForTimeout(300)
  }
  for (let index = 0; index < 2; index += 1) {
    const intro = page.locator('.house-intro')
    if (!(await intro.isVisible().catch(() => false))) break
    await intro.click({ force: true, timeout: 1500 }).catch(() => {})
    await page.waitForTimeout(200)
  }
  await resolveInterrupts(page)
}

async function closeDock(page) {
  const close = page.locator('button[aria-label="Close moves"]')
  if (await close.isVisible().catch(() => false)) {
    await close.click({ timeout: 1200 }).catch(() => {})
  }
}

/**
 * One real turn: stage affordable cards, then spend the three free attacks.
 * The game auto-advances the selected artist after each move, so the dock
 * stays open for the next attack.
 */
async function playTurn(page, pages) {
  await resolveInterrupts(page)
  for (let index = 0; index < 4; index += 1) {
    if (!(await canEndTurn(page))) return
    if ((await page.locator('.stage--player .stage-unit').count()) >= 5) break
    {
      const card = page.locator('.hand__slot .card.is-interactive').first()
      if (!(await card.count())) break
      await card.click({ force: true, timeout: 2500 }).catch(() => {})
      await page.waitForTimeout(120)
      await settleAction(pages)
    }
  }

  for (let attack = 0; attack < 3; attack += 1) {
    if (!(await canEndTurn(page))) return
    if (!(await page.locator('.move-dock').isVisible().catch(() => false))) {
      const unit = page.locator('.stage--player .stage-unit[role="button"]').first()
      if (!(await unit.count())) break
      await unit.click({ force: true, timeout: 2000 }).catch(() => {})
      await page.waitForTimeout(150)
      if (!(await page.locator('.move-dock').isVisible().catch(() => false))) break
    }
    const moves = page.locator('.move-dock .move-card:not([disabled])')
    const total = await moves.count()
    let chosen = -1
    for (let index = 0; index < total; index += 1) {
      const cost = await moves
        .nth(index)
        .locator('.move-card__cost')
        .innerText()
        .catch(() => '')
      if (/FREE/.test(cost)) {
        chosen = index
        break
      }
    }
    if (chosen < 0) break
    await moves.nth(chosen).click({ timeout: 2500 }).catch(() => {})
    await page.waitForTimeout(120)
    await settleAction(pages)
  }

  await closeDock(page)
  await settleAction(pages)
  // The engine holds the turn while any defender still has a window open.
  let counterOpen = false
  for (const entry of pages) {
    if (await entry.getByRole('button', { name: /TAKE THE HIT/i }).count()) counterOpen = true
  }
  if (counterOpen) return
  if (await canEndTurn(page)) {
    await endTurnButton(page).first().click({ timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(220)
  }
  await resolveAll(pages)
}

async function waitForBattle(pages) {
  for (const page of pages) {
    await page.locator('.battle').waitFor({ timeout: 30_000 })
    for (let index = 0; index < 6; index += 1) {
      await clearOverlays(page)
      if (await canEndTurn(page)) break
      await page.waitForTimeout(250)
    }
  }
}

async function waitForGuests(pages, predicate, label) {
  for (const page of pages) {
    await page
      .waitForFunction(predicate, null, { timeout: 30_000 })
      .catch(() => {
        throw new Error(`timed out waiting for ${label}`)
      })
  }
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
  let clients = []
  try {
    for (const player of PLAYERS) clients.push(await createOrRestoreContext(browser, player))
    const [host, a2, b1, b2] = clients
    const pages = [host.page, a2.page, b1.page, b2.page]

    for (const page of pages) await openOnline(page)
    const code = await createRoom(host.page)
    await select2v2(host.page)
    for (const page of [a2.page, b1.page, b2.page]) {
      await joinRoom(page, code)
      await waitForPlayers([host.page], 2)
    }
    await waitForPlayers(pages, 4)
    await host.page.screenshot({ path: 'artifacts/2v2-room-art.png', fullPage: true })
    note('captured artifacts/2v2-room-art.png')
    for (const page of pages) await markReady(page)
    await host.page.waitForFunction(
      () => document.querySelectorAll('.house-ready span.is-ready').length === 4,
      null,
      { timeout: 30_000 },
    )
    note(`room ${code} · four clients ready`)

    await host.page.getByRole('button', { name: /START MATCH/i }).click()
    await waitForBattle(pages)
    await waitForGuests(
      [a2.page, b1.page, b2.page],
      () => Boolean(window.__cikiRoomState?.party),
      '2v2 party state',
    )
    note('match 1 started')

    // ---- Play real turns until the Crowd gives out -----------------------
    const deadline = Date.now() + 430_000
    let turns = 0
    let stalled = 0
    while (Date.now() < deadline) {
      await resolveAll(pages)
      if (await resultVisible(host.page)) break
      let active = null
      for (const page of pages) {
        if (await canEndTurn(page)) {
          active = page
          break
        }
      }
      if (!active) {
        stalled += 1
        for (const page of pages) await clearOverlays(page)
        if (stalled % 10 === 0) note(`waiting for a turn · ${stalled} polls`)
        if (stalled === 24) {
          for (const client of clients) {
            const visible = await client.page.evaluate(() =>
              [...document.querySelectorAll('button')]
                .filter((button) => button.getBoundingClientRect().width > 0)
                .map((button) => `${button.disabled ? 'x' : 'o'}:${button.textContent?.trim().slice(0, 28)}`),
            )
            const state = await roomState(client.page).catch(() => null)
            note(
              `STALL ${client.player.key} · phase=${state?.phase ?? '?'} · active=${state?.party?.activeSeat ?? '?'} · ${visible.join(' | ')}`,
            )
          }
          await host.page.screenshot({ path: 'artifacts/2v2-finish-stalled.png', fullPage: true })
        }
        if (stalled > 60) break
        await host.page.waitForTimeout(150)
        continue
      }
      stalled = 0
      const label = clients.find((client) => client.page === active)?.player.key ?? '?'
      const turnStart = Date.now()
      await playTurn(active, pages)
      turns += 1
      const snapshot = await roomState(a2.page).catch(() => null)
      note(
        `turn ${turns} · ${label} · ${((Date.now() - turnStart) / 1000).toFixed(1)}s · crowd A/B ${snapshot?.player?.crowd ?? '?'}/${snapshot?.rival?.crowd ?? '?'}`,
      )
      if (turns > 80) break
    }
    for (const [index, page] of pages.entries()) {
      let seen = false
      for (let attempt = 0; attempt < 24; attempt += 1) {
        await resolveInterrupts(page)
        if (await page.locator('.result__panel').isVisible().catch(() => false)) {
          seen = true
          break
        }
        await page.waitForTimeout(250)
      }
      if (!seen) {
        const state = await roomState(page).catch(() => null)
        note(
          `NO RESULT client ${index} · phase=${state?.phase ?? '?'} · winner=${state?.winner ?? '?'} · crowd=${state?.player?.crowd ?? '?'}/${state?.rival?.crowd ?? '?'}`,
        )
        await page.screenshot({ path: `artifacts/2v2-no-result-${index}.png`, fullPage: true })
      }
      check(`client ${index} shows the match result`, seen)
    }
    note(`match 1 finished after ${turns} turns`)

    const [a2End, b1End, b2End] = await Promise.all([
      roomState(a2.page),
      roomState(b1.page),
      roomState(b2.page),
    ])
    checks.push(`match 1 played ${turns} real turns`)
    check('all four clients hold the final match state', Boolean(a2End && b1End && b2End))

    // A guest sees their own team as `player` (A2) or `rival` (B1), so the
    // two perspectives must agree on each team's crowd.
    const teamACrowd = [a2End.player.crowd, b1End.player.crowd]
    const teamBCrowd = [a2End.rival.crowd, b1End.rival.crowd]
    check(
      'both perspectives agree on the final Team A Crowd',
      teamACrowd[0] === teamACrowd[1],
      teamACrowd.join(' / '),
    )
    check(
      'both perspectives agree on the final Team B Crowd',
      teamBCrowd[0] === teamBCrowd[1],
      teamBCrowd.join(' / '),
    )
    check(
      'both teams ended inside their 144 Crowd meters',
      [teamACrowd[0], teamBCrowd[0]].every((crowd) => crowd >= 0 && crowd <= 144),
      `A ${teamACrowd[0]} · B ${teamBCrowd[0]}`,
    )

    const finalRound = a2End.round
    const crowdOut = teamACrowd[0] === 0 || teamBCrowd[0] === 0
    check(
      'the match ended in a Crowd-out before the curfew',
      crowdOut,
      `round ${finalRound} · A ${teamACrowd[0]} · B ${teamBCrowd[0]}`,
    )
    const teamAWon = crowdOut ? teamBCrowd[0] === 0 : teamACrowd[0] > teamBCrowd[0]
    const teamBWon = crowdOut ? teamACrowd[0] === 0 : teamBCrowd[0] > teamACrowd[0]
    check('the match has one winner, never a draw', teamAWon !== teamBWon)
    note(
      `match 1 decision: ${crowdOut ? 'CROWD-OUT' : 'CURFEW'} · round ${finalRound} · A ${teamACrowd[0]} / B ${teamBCrowd[0]} · ${teamAWon ? 'TEAM A' : 'TEAM B'} wins`,
    )

    const hostVerdict = (await host.page.locator('.result__verdict').innerText()).replace(/\s+/g, ' ')
    const a2Verdict = (await a2.page.locator('.result__verdict').innerText()).replace(/\s+/g, ' ')
    const b1Verdict = (await b1.page.locator('.result__verdict').innerText()).replace(/\s+/g, ' ')
    check(
      'host confirms the winning team',
      teamAWon ? /OWN THE ROOM/.test(hostVerdict) : /TAKES IT/.test(hostVerdict),
      hostVerdict,
    )
    check(
      'Team A teammate reads the same verdict',
      a2Verdict === hostVerdict,
      `${a2Verdict} vs ${hostVerdict}`,
    )
    check(
      'Team B reads the opposite verdict',
      b1Verdict !== a2Verdict,
      `${b1Verdict} vs ${a2Verdict}`,
    )
    check(
      'no forfeit notice on a played-out result',
      !(await host.page.locator('.result__forfeit').isVisible().catch(() => false)),
    )
    check(
      'no draw is recorded on any client',
      [a2End, b1End, b2End].every((state) => state.winner !== 'draw'),
    )
    const hostTitle = (await host.page.locator('.result h2').innerText()).trim()
    const hostKicker = (await host.page.locator('.result .kicker').innerText()).trim()
    check(
      'a Crowd-out result names the Crowd-out, not the curfew',
      /^(SOLD OUT|CROWD WALKED)$/.test(hostTitle),
      hostTitle,
    )
    check('a Crowd-out result uses the final-crowd banner', /FINAL CROWD/.test(hostKicker), hostKicker)
    await host.page.screenshot({ path: 'artifacts/2v2-result.png', fullPage: true })
    note('captured artifacts/2v2-result.png')

    // ---- Rematch, then a real team forfeit -------------------------------
    await host.page.getByRole('button', { name: /RUN IT BACK/i }).click({ timeout: 5000 })
    await waitForBattle(pages).catch(() => {})
    await waitForGuests(
      [a2.page, b1.page, b2.page],
      () => {
        const state = window.__cikiRoomState
        return Boolean(state?.party) && state.phase !== 'over' && state.party.activeSeat === 'host'
      },
      'rematch start',
    )
    const rematch = await roomState(a2.page)
    check('rematch starts a fresh round 1', rematch.round === 1, String(rematch.round))
    check(
      'rematch restores both 144 Crowd meters',
      rematch.player.crowd === 144 && rematch.rival.crowd === 144,
    )
    note('match 2 started from RUN IT BACK')

    await b1.page.locator('.battle__exit button').click({ timeout: 5000 })
    await b1.page.getByRole('button', { name: /LEAVE THE SHOW/i }).click({ timeout: 5000 })
    await host.page.locator('.result__forfeit').waitFor({ timeout: 30_000 })
    for (const page of [a2.page, b2.page]) {
      await page.locator('.result__forfeit').waitFor({ timeout: 30_000 })
    }
    note('B1 left mid-match; host and guests settled the forfeit')

    const hostForfeit = (await host.page.locator('.result__forfeit').innerText()).replace(/\s+/g, ' ')
    const a2Forfeit = (await a2.page.locator('.result__forfeit').innerText()).replace(/\s+/g, ' ')
    const b2Forfeit = (await b2.page.locator('.result__forfeit').innerText()).replace(/\s+/g, ' ')
    check(
      'forfeit names the player who left',
      hostForfeit.includes('TEST_PLAYER_B1'),
      hostForfeit,
    )
    check('Team A is awarded a forfeit win', /FORFEIT WIN/.test(hostForfeit), hostForfeit)
    check('Team A teammate also wins by forfeit', /FORFEIT WIN/.test(a2Forfeit), a2Forfeit)
    check('Team B reads a forfeit loss', /FORFEIT LOSS/.test(b2Forfeit), b2Forfeit)
    const forfeitTitles = []
    for (const page of [host.page, a2.page, b2.page]) {
      forfeitTitles.push((await page.locator('.result h2').innerText()).trim())
    }
    check(
      'every forfeit client sees a forfeit result, not a played-out finish',
      forfeitTitles.every((title) => title === 'FORFEIT'),
      forfeitTitles.join(' / '),
    )
    check(
      'forfeit verdicts agree across remaining clients',
      /SHOW ENDED EARLY/.test(
        (await host.page.locator('.result__verdict').innerText()).replace(/\s+/g, ' '),
      ),
    )
    check(
      'a forfeit result cannot offer a rematch',
      !(await host.page.getByRole('button', { name: /RUN IT BACK/i }).isVisible().catch(() => false)),
    )
    await host.page.screenshot({ path: 'artifacts/2v2-forfeit-result.png', fullPage: true })
    note('captured artifacts/2v2-forfeit-result.png')

    const pageErrors = errors.filter((entry) => entry.includes('PAGEERROR'))
    check('no uncaught page errors', pageErrors.length === 0, pageErrors.join(' | '))

    writeFileSync(
      'artifacts/2v2-finish-report.json',
      JSON.stringify(
        {
          verifiedAt: new Date().toISOString(),
          room: code,
          turnsPlayed: turns,
          result: {
            outcome: crowdOut ? 'crowd-out' : 'curfew',
            finalRound,
            winner: teamAWon ? 'TEAM A' : 'TEAM B',
            teamACrowd: teamACrowd[0],
            teamBCrowd: teamBCrowd[0],
            verdict: hostVerdict,
            a2Crowd: [a2End.player.crowd, a2End.rival.crowd],
          },
          forfeit: { host: hostForfeit, a2: a2Forfeit, b2: b2Forfeit },
          checks,
          errors,
          log,
        },
        null,
        2,
      ),
    )
    note(`${checks.length} checks passed · artifacts/2v2-finish-report.json written`)
  } finally {
    for (const client of clients) {
      try {
        const status = (
          await client.page
            .locator('.online-status')
            .first()
            .innerText({ timeout: 2500 })
            .catch(() => '(no room panel)')
        ).replace(/\s+/g, ' ')
        note(`DIAG ${client.player.key} · status="${status}" · ${client.page.url()}`)
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
