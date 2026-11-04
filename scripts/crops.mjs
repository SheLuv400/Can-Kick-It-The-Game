import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await page.goto('http://127.0.0.1:3000/')
await page.evaluate(() => localStorage.setItem('ciki.settings.v1', JSON.stringify({ theme: 'a', selectedDirection: 'a' })))
await page.reload()
await page.waitForTimeout(1500)
await page.getByRole('button', { name: /TAKE THE STAGE/i }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: /START THE SHOW/i }).click()
await page.waitForTimeout(700)
await page.screenshot({ path: 'artifacts/crop-battle-controls.png', clip: { x: 1180, y: 810, width: 260, height: 190 } })
await page.locator('.hand__side').screenshot({ path: 'artifacts/crop-hand-side.png' })
const info = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, display: getComputedStyle(el).display, zIndex: getComputedStyle(el).zIndex }
  }
  return { turnbox: pick('.turnbox'), end: pick('.btn--end'), side: pick('.hand__side'), viewport: innerHeight, scroll: document.documentElement.scrollTop }
})
console.log(info)
await browser.close()
