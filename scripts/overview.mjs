import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1480, height: 520 }, deviceScaleFactor: 1 })
await page.goto('file://' + process.cwd() + '/artifacts/overview.html')
await page.waitForTimeout(500)
await page.screenshot({ path: 'artifacts/directions-overview.png', fullPage: true })
console.log(await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight })))
await browser.close()
