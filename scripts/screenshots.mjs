import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

mkdirSync('artifacts', { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const page = await context.newPage()
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`CONSOLE: ${message.text()}`)
})
page.on('pageerror', (error) => errors.push(`PAGEERROR: ${error.message}`))

const base = 'http://127.0.0.1:3000/'

async function setTheme(theme) {
  await page.goto(base)
  await page.evaluate((value) => {
    localStorage.setItem('ciki.settings.v1', JSON.stringify({ theme: value, selectedDirection: value }))
  }, theme)
  await page.reload()
  await page.waitForTimeout(1800)
}

for (const theme of ['a', 'b', 'c']) {
  await setTheme(theme)
  await page.screenshot({ path: `artifacts/menu-${theme}.png` })
  console.log(`menu-${theme} captured`, await page.title())
}

// Design room for each direction
await setTheme('a')
await page.getByRole('button', { name: 'DESIGN ROOM' }).click()
await page.waitForTimeout(700)
for (const [index, theme] of ['a', 'b', 'c'].entries()) {
  await page.locator('.lab-tab').nth(index).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `artifacts/lab-${theme}.png`, fullPage: true })
}

// Battle at 1440x1000
for (const theme of ['a', 'b', 'c']) {
  await setTheme(theme)
  await page.getByRole('button', { name: /TAKE THE STAGE/i }).click()
  await page.waitForTimeout(600)
  await page.screenshot({ path: `artifacts/intro-${theme}.png` })
  await page.getByRole('button', { name: /START THE SHOW/i }).click()
  await page.waitForTimeout(700)
  await page.screenshot({ path: `artifacts/battle-${theme}.png` })
}

// One playable turn at 1440x900
await setTheme('a')
await page.setViewportSize({ width: 1440, height: 900 })
await page.getByRole('button', { name: /TAKE THE STAGE/i }).click()
await page.getByRole('button', { name: /START THE SHOW/i }).click()
await page.waitForTimeout(500)
await page.screenshot({ path: 'artifacts/battle-900.png' })
const handCards = page.locator('.hand__slot .card.is-interactive')
const count = await handCards.count()
console.log('interactive hand cards', count)
if (count > 0) {
  await handCards.first().click()
  await page.waitForTimeout(700)
  await handCards.nth(Math.min(1, count - 1)).click().catch(() => {})
  await page.waitForTimeout(900)
  await page.screenshot({ path: 'artifacts/battle-played.png' })
}
await page.getByRole('button', { name: /END TURN/i }).click().catch(() => {})
await page.waitForTimeout(2600)
await page.screenshot({ path: 'artifacts/battle-rival.png' })

// collection + builder
if (await page.locator('.result__panel').count()) {
  await page.screenshot({ path: 'artifacts/result-a.png' })
  await page.getByRole('button', { name: /MAIN MENU/i }).click()
} else {
  await page.locator('.battle__exit .link-btn').click()
  await page.waitForTimeout(250)
  await page.getByRole('button', { name: /LEAVE THE SHOW/i }).click()
}
await page.waitForTimeout(700)
await page.locator('.topnav button').filter({ hasText: 'THE 26' }).click()
await page.waitForTimeout(900)
await page.screenshot({ path: 'artifacts/collection-a.png', fullPage: true })
await page.locator('.collection__card .card.is-interactive').first().click()
await page.waitForTimeout(700)
await page.screenshot({ path: 'artifacts/showcase-a.png' })
await page.locator('.showcase__actions .btn--ghost').click()
await page.waitForTimeout(250)
await page.locator('.subpage__top .link-btn').first().click()
await page.waitForTimeout(500)
await page.locator('.topnav button').filter({ hasText: 'MIXTAPE' }).click()
await page.waitForTimeout(900)
await page.screenshot({ path: 'artifacts/deckbuilder-a.png', fullPage: true })
console.log('captured collection and builder')

console.log('ERRORS:', JSON.stringify(errors, null, 2))
await browser.close()
