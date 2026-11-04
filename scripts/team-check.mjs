import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
const errors = []

page.on('pageerror', (error) => errors.push(error.message))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text())
})

await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' })
await page.screenshot({ path: 'artifacts/menu-team-final.png' })
await page.getByRole('button', { name: 'ULTIMATE TEAM' }).click()
await page.waitForSelector('main.team')
await page.waitForTimeout(400)

const initialCredits = await page.locator('.team__stat').first().innerText()
await page.screenshot({ path: 'artifacts/team-final.png', fullPage: true })

const claim = page.getByRole('button', { name: 'CLAIM' }).first()
await claim.click()
await page.waitForTimeout(300)

const claimedCredits = await page.locator('.team__stat').first().innerText()
const claimedCount = await page.getByRole('button', { name: 'CLAIMED' }).count()
const label = page.getByLabel('Record label name')
await label.fill('NIGHT SHIFT')
await page.waitForTimeout(300)
await page.screenshot({ path: 'artifacts/team-claimed-final.png', fullPage: true })

await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'ULTIMATE TEAM' }).click()
await page.waitForSelector('main.team')
const persistedLabel = await page.getByLabel('Record label name').inputValue()
const persistedCredits = await page.locator('.team__stat').first().innerText()

await page.getByRole('button', { name: /START CIRCUIT|CONTINUE CIRCUIT|REPLAY CIRCUIT/i }).first().click()
await page.waitForSelector('.battle')
await page.waitForTimeout(300)
await page.screenshot({ path: 'artifacts/team-circuit-final.png' })
const battleStarted = await page.locator('.battle').count()

console.log(
  JSON.stringify(
    {
      errors,
      initialCredits,
      claimedCredits,
      claimedCount,
      persistedLabel,
      persistedCredits,
      battleStarted,
    },
    null,
    2,
  ),
)

if (errors.length || !claimedCount || persistedLabel !== 'NIGHT SHIFT' || !battleStarted)
  process.exitCode = 1
await browser.close()
