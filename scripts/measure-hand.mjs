import { chromium } from 'playwright'
const browser = await chromium.launch()
for (const height of [900, 1000]) {
  const page = await browser.newPage({ viewport: { width: 1440, height } })
  await page.goto('http://127.0.0.1:3000/')
  await page.evaluate(() => localStorage.setItem('ciki.settings.v1', JSON.stringify({ theme: 'a', selectedDirection: 'a', difficulty: 'OPENING' })))
  await page.reload()
  await page.waitForTimeout(1400)
  await page.getByRole('button', { name: /TAKE THE STAGE/i }).click()
  await page.waitForTimeout(250)
  await page.getByRole('button', { name: /START THE SHOW/i }).click()
  await page.waitForTimeout(700)
  const out = await page.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), height: +r.height.toFixed(1) }
    }
    return {
      viewport: innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
      battle: box('.battle'),
      board: box('.battle__board'),
      handrow: box('.handrow'),
      hand: box('.hand'),
      fan: box('.hand__fan'),
      slot: box('.hand__slot'),
      card: box('.hand__slot .card'),
      side: box('.hand__side'),
      turn: box('.turnbox'),
      end: box('.btn--end'),
      boardPadBottom: getComputedStyle(document.querySelector('.battle__board')).paddingBottom,
    }
  })
  console.log('HEIGHT', height, JSON.stringify(out, null, 2))
  await page.close()
}
await browser.close()
