import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
page.setDefaultTimeout(5000)

const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`CONSOLE: ${message.text()}`)
})
page.on('pageerror', (error) => errors.push(`PAGEERROR: ${error.message}`))

const summary = {
  initialOpeners: null,
  initialHand: null,
  initialFeatureReady: false,
  turns: 0,
  cardsPlayed: 0,
  featureTested: false,
  featureUsedMarker: false,
  encoreTested: false,
  encoreCardSeen: false,
  cutTested: false,
  swapTested: false,
  countersHandled: 0,
  counterAccepted: 0,
  counterDeclined: 0,
  erasSeen: [],
  resultSeen: false,
  resultText: '',
  rematchSeen: false,
}

const wait = (ms) => page.waitForTimeout(ms)

async function state() {
  return page.evaluate(() => {
    const text = (selector) => document.querySelector(selector)?.textContent?.trim() ?? ''
    const stageCards = [...document.querySelectorAll('.stage--player .card')]
    const handCards = [...document.querySelectorAll('.hand__slot .card')]
    return {
      round: text('.hud__round b'),
      era: text('.hud__era span'),
      eraName: text('.hud__era b'),
      turn: text('.turnbox__label'),
      playerCrowd: text('.crowd--player .crowd__value'),
      rivalCrowd: text('.crowd--rival .crowd__value'),
      hype: text('.crowd--player .hype-chip b'),
      encore: text('.crowd--player .crowd__tokens .token:nth-child(2) b'),
      counters: text('.crowd--player .crowd__tokens .token:nth-child(1) b'),
      stage: stageCards.length,
      rivalStage: document.querySelectorAll('.stage--rival .card').length,
      hand: handCards.length,
      stageCrews: stageCards.map((card) => card.dataset.crew),
      stageNames: stageCards.map((card) => card.querySelector('.card__name')?.textContent ?? ''),
      handCrews: handCards.map((card) => card.dataset.crew),
      handLabels: handCards.map((card) => card.getAttribute('aria-label')),
      featureReady: Boolean(document.querySelector('.feature-chip--ready')),
      featureUsed: Boolean(document.querySelector('.feature-chip--used')),
      encoreButtons: document.querySelectorAll('.stage--player .card-act--encore:not([disabled])').length,
      cutButtons: document.querySelectorAll('.stage--player .card-act--cut:not([disabled])').length,
      counter: Boolean(document.querySelector('.counter')),
      result: Boolean(document.querySelector('.result__panel')),
      banner: text('.clashline p'),
      log: [...document.querySelectorAll('.log-entry')].slice(0, 4).map((entry) => entry.textContent?.trim() ?? ''),
    }
  })
}

async function dismissCinematics() {
  for (let index = 0; index < 8; index += 1) {
    if (!(await page.locator('.cine').isVisible().catch(() => false))) return
    await page.locator('.cine__skip').click().catch(() => {})
    await wait(300)
  }
}

async function handleCounter(accept) {
  if (!(await page.locator('.counter').isVisible().catch(() => false))) return false
  const before = await state()
  const button = accept
    ? page.getByRole('button', { name: /CLAPBACK/i })
    : page.getByRole('button', { name: /TAKE THE HIT/i })
  await button.click()
  await wait(600)
  const after = await state()
  summary.countersHandled += 1
  if (accept) summary.counterAccepted += 1
  else summary.counterDeclined += 1
  console.log(
    `COUNTER ${accept ? 'accepted' : 'declined'} | hype ${before.hype} -> ${after.hype} | counters ${before.counters} -> ${after.counters}`,
  )
  await dismissCinematics()
  return true
}

async function waitForPlayerOrResult() {
  for (let index = 0; index < 110; index += 1) {
    const current = await state()
    if (current.result) return 'result'
    if (current.counter) {
      await handleCounter(summary.countersHandled % 2 === 0)
      continue
    }
    if (await page.locator('.cine').isVisible().catch(() => false)) {
      await dismissCinematics()
      continue
    }
    if (current.turn.includes('YOUR TURN')) return 'player'
    await wait(500)
  }
  return 'timeout'
}

async function playOneCard(preferredCrew) {
  const current = await state()
  if (current.stage >= 5) return false
  const candidates = await page.evaluate((crew) => {
    return [...document.querySelectorAll('.hand__slot')].map((slot, index) => {
      const card = slot.querySelector('.card')
      return {
        index,
        crew: card?.getAttribute('data-crew'),
        interactive: Boolean(card?.classList.contains('is-interactive')),
        label: card?.getAttribute('aria-label') ?? '',
      }
    })
  }, preferredCrew)
  const playable = candidates.filter((card) => card.interactive)
  if (playable.length === 0) return false
  const chosen = playable.find((card) => preferredCrew && card.crew === preferredCrew) ?? playable[0]
  await page.locator('.hand__slot').nth(chosen.index).locator('.card.is-interactive').click()
  await wait(600)
  summary.cardsPlayed += 1
  await dismissCinematics()
  return true
}

async function testFeatureIfReady() {
  if (!(await page.locator('.feature-chip--ready').isVisible().catch(() => false))) return false
  await dismissCinematics()
  await page.locator('.feature-chip--ready').click()
  await wait(700)
  summary.featureTested = true
  summary.featureUsedMarker = await page.locator('.feature-chip--used').isVisible().catch(() => false)
  console.log('FEATURE triggered', await state())
  await page.screenshot({ path: 'artifacts/qa-feature.png' })
  await dismissCinematics()
  return true
}

async function testEncoreIfReady() {
  const buttons = page.locator('.stage--player .card-act--encore:not([disabled])')
  if ((await buttons.count()) === 0) return false
  await dismissCinematics()
  await buttons.first().click()
  await wait(700)
  summary.encoreTested = true
  summary.encoreCardSeen = (await page.locator('.stage--player .card.is-encore').count()) > 0
  console.log('ENCORE triggered', await state())
  await page.screenshot({ path: 'artifacts/qa-encore.png' })
  await dismissCinematics()
  return true
}

async function testCutOnce() {
  if (summary.cutTested) return false
  const buttons = page.locator('.stage--player .card-act--cut:not([disabled])')
  if ((await buttons.count()) === 0) return false
  const before = await state()
  await buttons.first().click()
  await wait(500)
  const after = await state()
  summary.cutTested = before.stage > after.stage
  console.log('CUT', before.stage, '->', after.stage)
  return true
}

async function testSwapOnce() {
  if (summary.swapTested) return false
  const current = await state()
  if (current.stage < 5) return false
  const playable = page.locator('.hand__slot .card.is-interactive')
  if ((await playable.count()) === 0) return false
  await playable.first().click()
  await wait(300)
  const swap = page.locator('.stage--player .card-act--swap')
  if ((await swap.count()) === 0) return false
  await swap.first().click()
  await wait(650)
  summary.swapTested = true
  console.log('SWAP', await state())
  await dismissCinematics()
  return true
}

try {
  await page.goto('http://127.0.0.1:3000/')
  await page.evaluate(() => {
    localStorage.setItem(
      'ciki.settings.v1',
      JSON.stringify({ theme: 'a', selectedDirection: 'a', difficulty: 'OPENING' }),
    )
  })
  await page.reload()
  await wait(1400)
  await page.getByRole('button', { name: /TAKE THE STAGE/i }).click()
  await wait(300)
  await page.getByRole('button', { name: /START THE SHOW/i }).click()
  await wait(900)
  await dismissCinematics()

  const initial = await state()
  summary.initialOpeners = { player: initial.stage, rival: initial.rivalStage }
  summary.initialHand = initial.hand
  summary.initialFeatureReady = initial.featureReady
  summary.erasSeen = [initial.era]
  console.log('INITIAL', initial)
  await page.screenshot({ path: 'artifacts/qa-openers.png' })

  // Use the opening act pair immediately when the opening acts share a crew.
  await testFeatureIfReady()
  // Test an opening-act encore before the first card is played.
  await testEncoreIfReady()

  for (let turn = 0; turn < 13; turn += 1) {
    const beforeTurn = await state()
    if (beforeTurn.result) break
    if (!beforeTurn.turn.includes('YOUR TURN')) {
      const outcome = await waitForPlayerOrResult()
      if (outcome === 'result') break
      if (outcome === 'timeout') {
        console.log('TIMEOUT waiting for player turn')
        break
      }
    }
    await dismissCinematics()
    summary.turns += 1

    const start = await state()
    if (!summary.erasSeen.includes(start.era)) {
      summary.erasSeen.push(start.era)
      await page.screenshot({ path: `artifacts/qa-era-${start.era.replace(/\s+/g, '-')}.png` })
    }

    // Once the stage is full, exercise the swap flow with a real hand card.
    if (start.stage >= 5) {
      await testSwapOnce()
    }

    // Test feature readiness whenever a crew pair appears.
    await testFeatureIfReady()

    // Cut a stage card early to prove the open-slot mechanic.
    if (start.stage >= 3 && !summary.cutTested) {
      await testCutOnce()
    }

    let plays = 0
    while (plays < 2) {
      const current = await state()
      if (current.stage >= 5) break
      const matchCrew = current.stageCrews.find(
        (crew) => current.handCrews.filter((handCrew) => handCrew === crew).length > 0,
      )
      const played = await playOneCard(matchCrew)
      if (!played) break
      plays += 1
      await testFeatureIfReady()
      if (plays === 1 && turn === 0) {
        await testEncoreIfReady()
      }
      const now = await state()
      if (now.result) break
      if (now.era !== start.era) {
        if (!summary.erasSeen.includes(now.era)) {
          summary.erasSeen.push(now.era)
          await page.screenshot({ path: `artifacts/qa-era-${now.era.replace(/\s+/g, '-')}.png` })
        }
      }
    }

    await testFeatureIfReady()
    if (!summary.encoreTested) await testEncoreIfReady()

    const afterPlays = await state()
    if (afterPlays.result) break
    console.log(`TURN ${turn + 1}`, {
      round: afterPlays.round,
      era: afterPlays.era,
      hype: afterPlays.hype,
      crowd: afterPlays.playerCrowd,
      rival: afterPlays.rivalCrowd,
      stage: afterPlays.stage,
      hand: afterPlays.hand,
      feature: afterPlays.featureReady,
      encore: afterPlays.encoreButtons,
      cut: afterPlays.cutButtons,
      banner: afterPlays.banner,
    })

    const end = page.getByRole('button', { name: /END TURN/i })
    if (!(await end.isEnabled())) {
      const outcome = await waitForPlayerOrResult()
      if (outcome === 'result') break
      continue
    }
    await end.click()
    await wait(900)
    const outcome = await waitForPlayerOrResult()
    if (outcome === 'result') break
    if (outcome === 'timeout') {
      console.log('TIMEOUT waiting for the next round')
      break
    }
    const after = await state()
    if (!summary.erasSeen.includes(after.era)) {
      summary.erasSeen.push(after.era)
      await page.screenshot({ path: `artifacts/qa-era-${after.era.replace(/\s+/g, '-')}.png` })
    }
  }

  const final = await state()
  if (final.result) {
    summary.resultSeen = true
    summary.resultText = await page.locator('.result__panel').innerText()
    console.log('RESULT', summary.resultText.replace(/\n/g, ' | '))
    await page.screenshot({ path: 'artifacts/qa-result.png' })
    const rematch = page.getByRole('button', { name: /RUN IT BACK/i })
    if (await rematch.isVisible().catch(() => false)) {
      await rematch.click()
      await wait(600)
      summary.rematchSeen = await page.locator('.show-intro').isVisible().catch(() => false)
    }
  } else {
    console.log('NO RESULT REACHED', final)
    await page.screenshot({ path: 'artifacts/qa-no-result.png' })
  }

  console.log('SUMMARY', JSON.stringify(summary, null, 2))
  console.log('ERRORS', JSON.stringify(errors, null, 2))
  if (
    errors.length > 0 ||
    !summary.resultSeen ||
    summary.initialOpeners?.player !== 2 ||
    summary.initialOpeners?.rival !== 2
  ) {
    process.exitCode = 1
  }
} catch (error) {
  console.error('PLAYTEST FAILED', error)
  await page.screenshot({ path: 'artifacts/qa-failure.png' }).catch(() => {})
  process.exitCode = 1
} finally {
  await browser.close()
}
