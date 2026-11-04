import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`)
})
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))

await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' })
await page.screenshot({ path: 'artifacts/ciki-menu.png', fullPage: true })
console.log('TITLE', await page.title())
console.log('BUTTONS', JSON.stringify(await page.locator('button').allTextContents()))
console.log('BODY', (await page.locator('body').innerText()).slice(0, 1800))
console.log('ERRORS', JSON.stringify(errors))
await browser.close()
