import { chromium } from 'playwright'
const browser = await chromium.launch()
const base = 'http://127.0.0.1:3000/'
for (const height of [900, 1000, 1080]) {
  const context = await browser.newContext({ viewport: { width: 1440, height } })
  const page = await context.newPage()
  await page.goto(base)
  await page.evaluate(() => localStorage.setItem('ciki.settings.v1', JSON.stringify({ theme: 'a', selectedDirection: 'a' })))
  await page.reload()
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: /TAKE THE STAGE/i }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /START THE SHOW/i }).click()
  await page.waitForTimeout(500)
  const boxes = await page.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height), display: style.display, opacity: style.opacity, overflow: style.overflow }
    }
    return {
      innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
      scrollY,
      battle: box('.battle'),
      hud: box('.battle__hud'),
      board: box('.battle__board'),
      playerStage: box('.stage--player'),
      handrow: box('.handrow'),
      hand: box('.hand'),
      handSlot: box('.hand__slot'),
      handSide: box('.hand__side'),
      turnbox: box('.turnbox'),
      endTurn: box('.btn--end'),
      feature: box('.feature-rail'),
      openersPlayer: document.querySelectorAll('.stage--player .card-shell').length,
      openersRival: document.querySelectorAll('.stage--rival .card-shell').length,
    }
  })
  console.log('SIZE', height, JSON.stringify(boxes, null, 2))
  await context.close()
}
await browser.close()
