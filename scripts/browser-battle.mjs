import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`)
})
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))

await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' })
await page.waitForTimeout(2600)
await page.screenshot({ path: 'artifacts/ciki-menu-ready.png', fullPage: true })

const heading = page.locator('h1').first()
console.log('MENU_H1', JSON.stringify(await heading.innerText().catch(() => '')))
console.log(
  'MENU_H1_STYLE',
  await heading.evaluate((el) => {
    const style = getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    return {
      color: style.color,
      opacity: style.opacity,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      visibility: style.visibility,
      display: style.display,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    }
  }),
)
console.log('FONTS', await page.evaluate(() => document.fonts.status))
console.log('BODY_TEXT', (await page.locator('body').innerText()).slice(0, 400))

const playButton = page.getByRole('button').filter({ hasText: 'PLAY' }).first()
console.log('PLAY_COUNT', await page.getByRole('button').filter({ hasText: 'PLAY' }).count())
await playButton.click()
await page.waitForTimeout(800)
await page.screenshot({ path: 'artifacts/ciki-battle-intro.png', fullPage: true })
console.log('INTRO_BUTTONS', JSON.stringify(await page.locator('button').allTextContents()))

const startButton = page.getByRole('button', { name: /START THE SHOW/ }).first()
await startButton.click()
await page.waitForTimeout(1200)
await page.screenshot({ path: 'artifacts/ciki-battle-start.png', fullPage: true })
console.log('BATTLE_TEXT', (await page.locator('body').innerText()).slice(0, 1200))
console.log('STAGE_UNITS', await page.locator('.stage-unit').count())
console.log('MOVE_BUTTONS', await page.getByRole('button', { name: 'MOVES' }).count())
console.log('CRATE_DRAW', await page.getByRole('button', { name: /DRAW FROM THE CRATE/ }).count())
console.log('TARGET_UNITS', await page.locator('.stage--rival .stage-unit.is-targetable').count())

await page.getByRole('button', { name: 'MOVES' }).first().click()
await page.waitForTimeout(350)
await page.screenshot({ path: 'artifacts/ciki-move-dock.png', fullPage: true })
console.log('MOVE_DOCK', await page.locator('.move-dock').count())
console.log('MOVE_CARDS', await page.locator('.move-card').count())
console.log('MOVE_NAMES', JSON.stringify(await page.locator('.move-card b').allTextContents()))

await page.locator('.stage--rival .stage-unit').first().click()
await page.waitForTimeout(200)
const enabledMove = page.locator('.move-card:not(:disabled)').first()
console.log('ENABLED_MOVES', await page.locator('.move-card:not(:disabled)').count())
if (await enabledMove.count()) {
  await enabledMove.click()
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'artifacts/ciki-after-move.png', fullPage: true })
}

const draw = page.getByRole('button', { name: /DRAW FROM THE CRATE/ }).first()
if (await draw.count()) {
  await draw.click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'artifacts/ciki-crate-draw.png', fullPage: true })
  console.log('CRATE_REVEAL', await page.locator('.crate-reveal').count())
  console.log('SPECIAL_HAND', await page.locator('.crate-mini').count())
}

console.log('ERRORS', JSON.stringify(errors))
await browser.close()
