import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
await context.addInitScript(() => {
  const key = 'ciki.settings.v1'
  let settings = {}
  try {
    settings = JSON.parse(localStorage.getItem(key) || '{}')
  } catch {
    settings = {}
  }
  settings.artistProgress = {
    ...(settings.artistProgress || {}),
    'krown-vandal': { xp: 460, level: 5 },
  }
  localStorage.setItem(key, JSON.stringify(settings))
})

const page = await context.newPage()
const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`)
})
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))

const wait = (ms) => page.waitForTimeout(ms)

await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' })
await wait(600)

// Collection + level-5 loadout editor
await page.locator('.topnav button').filter({ hasText: 'THE 26' }).click()
await page.waitForSelector('.collection__grid')
await page.locator('.collection__card [role="button"]').first().click()
await page.waitForSelector('.showcase')
await page.screenshot({ path: 'artifacts/ciki-collection-showcase.png' })
console.log('COLLECTION_MOVES', await page.locator('.showcase__move').count())
console.log('COLLECTION_MOVE_NAMES', JSON.stringify(await page.locator('.showcase__move b').allTextContents()))

await page.getByRole('button', { name: /EDIT 3-MOVE LOADOUT/ }).click()
await page.waitForSelector('.loadout-modal')
await wait(450)
await page.screenshot({ path: 'artifacts/ciki-loadout.png' })
console.log('LOADOUT_SLOTS', await page.locator('.loadout-slot').count())
console.log('LOADOUT_MOVES', await page.locator('.loadout-move').count())
console.log('LOADOUT_UNLOCKED', await page.locator('.loadout-move:not(:disabled)').count())
const replaceable = page.locator('.loadout-move:not(.is-on):not(:disabled)').first()
if (await replaceable.count()) {
  const replacement = await replaceable.locator('b').innerText()
  await replaceable.click()
  await wait(200)
  await page.getByRole('button', { name: /SAVE LOADOUT/ }).click()
  await wait(300)
  console.log('LOADOUT_REPLACED_WITH', replacement)
  console.log('LOADOUT_SAVED', await page.locator('.loadout-modal').count() === 0)
  console.log('COLLECTION_MOVES_AFTER', JSON.stringify(await page.locator('.showcase__move b').allTextContents()))
} else {
  console.log('LOADOUT_REPLACED_WITH', 'NONE')
}

await page.locator('.showcase__actions .btn').filter({ hasText: 'CLOSE' }).click()
await wait(200)
await page.locator('.subpage__top .link-btn').first().click()
await page.waitForSelector('.menu-shortcut--play')

// Battle
await page.locator('.menu-shortcut--play').click()
await page.waitForSelector('.show-intro')
await page.getByRole('button', { name: /START THE SHOW/ }).click()
await wait(1100)
await page.screenshot({ path: 'artifacts/ciki-battle-start-2.png', fullPage: true })

await page.locator('.stage--player .stage-unit .card-act--moves').first().click()
await page.waitForSelector('.move-dock')
await page.screenshot({ path: 'artifacts/ciki-move-dock-2.png', fullPage: true })
console.log('MOVE_COUNT', await page.locator('.move-card').count())
console.log('MOVE_DESCRIPTIONS', JSON.stringify(await page.locator('.move-card p').allTextContents()))
const moveBox = await page.locator('.move-card p').first().boundingBox()
console.log('MOVE_DESCRIPTION_BOX', moveBox)

const enabledMove = page.locator('.move-card:not(:disabled)').first()
console.log('MOVE_ENABLED', await enabledMove.count())
if (await enabledMove.count()) {
  await enabledMove.click()
  await wait(500)
  console.log('MOVE_FX_VISIBLE', await page.locator('.move-fx').count())
  console.log('MOVE_FX_NAME', await page.locator('.move-fx__name').innerText().catch(() => ''))
  await page.screenshot({ path: 'artifacts/ciki-after-move-2.png', fullPage: true })
}

const crate = page.locator('.crate-stack')
console.log('CRATE_ENABLED', await crate.isEnabled())
await crate.click()
await wait(750)
await page.screenshot({ path: 'artifacts/ciki-crate-reveal-2.png', fullPage: true })
console.log('CRATE_REVEAL_VISIBLE', await page.locator('.crate-reveal').count())
if (await page.locator('.crate-reveal').count()) {
  console.log(
    'CRATE_REVEAL_LAYER',
    await page.evaluate(() => {
      const reveal = document.querySelector('.crate-reveal')
      const card = document.querySelector('.crate-reveal__card')
      if (!reveal || !card) return null
      const rect = card.getBoundingClientRect()
      const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + 12)
      return {
        zIndex: getComputedStyle(reveal).zIndex,
        background: getComputedStyle(reveal).backgroundColor,
        topElementInsideReveal: Boolean(top?.closest('.crate-reveal')),
      }
    }),
  )
  const closeReveal = page.getByRole('button', { name: /ADDED TO SPECIAL HAND/ })
  if (await closeReveal.count()) await closeReveal.click()
}
console.log('SPECIAL_DRAWN', await page.locator('.crate-mini').count())
console.log('SPECIAL_NAMES', JSON.stringify(await page.locator('.crate-mini b').allTextContents()))
console.log('TURN_AFTER_DRAW', await page.locator('.turnbox__label').innerText())

// Resolve rival actions / defensive prompts until the next player turn.
for (let step = 0; step < 30; step += 1) {
  if (await page.locator('.counter').count()) {
    await page.getByRole('button', { name: /TAKE THE HIT/ }).click()
    await wait(400)
    continue
  }
  if (await page.locator('.cine').count()) {
    await page.locator('.cine__skip').click()
    await wait(300)
    continue
  }
  const turn = await page.locator('.turnbox__label').innerText().catch(() => '')
  if (turn === 'YOUR TURN' && (await page.locator('.thinking').count()) === 0) break
  await wait(500)
}
await page.screenshot({ path: 'artifacts/ciki-next-turn-2.png', fullPage: true })
console.log('TURN_NEXT', await page.locator('.turnbox__label').innerText())

const special = page.locator('.crate-mini').first()
if (await special.count()) {
  await special.click()
  await wait(300)
  await page.screenshot({ path: 'artifacts/ciki-special-modal-2.png' })
  console.log('SPECIAL_MODAL', await page.locator('.special-panel').innerText())
  const playButton = page.locator('.special-panel .btn--primary').first()
  const targetButton = page.locator('.special-panel .special-targets .target-chip:not(:disabled)').first()
  if (await playButton.count()) {
    await playButton.click()
    await wait(350)
    console.log('SPECIAL_USED_BY_BUTTON', true)
  } else if (await targetButton.count()) {
    await targetButton.click()
    await wait(350)
    console.log('SPECIAL_USED_BY_TARGET', true)
  } else {
    console.log('SPECIAL_USED', false)
    const keep = page.getByRole('button', { name: /KEEP IT IN HAND/ })
    if (await keep.count()) await keep.click()
  }
  await page.screenshot({ path: 'artifacts/ciki-special-after-2.png', fullPage: true })
  console.log('SPECIAL_HAND_AFTER', await page.locator('.crate-mini').count())
}

const backstage = page.locator('.backstage-pile')
if (await backstage.count()) {
  await backstage.click()
  await wait(250)
  await page.screenshot({ path: 'artifacts/ciki-backstage-2.png' })
  console.log('BACKSTAGE_MODAL', await page.locator('.backstage-panel').count())
  const closeBackstage = page.locator('.backstage-panel .icon-btn')
  if (await closeBackstage.count()) await closeBackstage.click()
}

// Mobile width check
await page.setViewportSize({ width: 390, height: 844 })
await wait(500)
await page.screenshot({ path: 'artifacts/ciki-battle-mobile-2.png', fullPage: true })
console.log('MOBILE_OVERFLOW', await page.evaluate(() => ({
  innerWidth: window.innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  bodyWidth: document.body.scrollWidth,
})))

console.log('ERRORS', JSON.stringify(errors))
await browser.close()
