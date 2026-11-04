import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
page.setDefaultTimeout(5000)
await page.goto('http://127.0.0.1:3000/')
await page.evaluate(() => localStorage.setItem('ciki.settings.v1', JSON.stringify({ theme: 'a', selectedDirection: 'a' })))
await page.reload()
await page.waitForTimeout(1800)
const measure = async (label) => {
  const metrics = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }))
  console.log(label, metrics)
}
await measure('menu')
await page.screenshot({ path: 'artifacts/menu-mobile.png', fullPage: true })
await page.getByRole('button', { name: /TAKE THE STAGE/i }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: /START THE SHOW/i }).click()
await page.waitForTimeout(800)
await measure('battle')
await page.screenshot({ path: 'artifacts/battle-mobile.png' })
await page.locator('.battle__exit .link-btn').click()
await page.waitForTimeout(250)
await page.getByRole('button', { name: /LEAVE THE SHOW/i }).click()
await page.waitForTimeout(500)
await page.locator('.topnav button').filter({ hasText: 'THE 26' }).click()
await page.waitForTimeout(800)
await measure('collection')
await page.screenshot({ path: 'artifacts/collection-mobile.png', fullPage: true })
await page.locator('.subpage__top .link-btn').first().click()
await page.waitForTimeout(500)
await page.locator('.topnav button').filter({ hasText: 'MIXTAPE' }).click()
await page.waitForTimeout(800)
await measure('builder')
await page.screenshot({ path: 'artifacts/deckbuilder-mobile.png', fullPage: true })
console.log('MOBILE DONE')
await browser.close()
