import { chromium } from 'playwright'

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
await page.goto('http://127.0.0.1:3000/')
await page.evaluate(() => localStorage.setItem('ciki.settings.v1', JSON.stringify({ theme: 'a', selectedDirection: 'a' })))
await page.reload()
await page.waitForTimeout(2000)

const menu = await page.evaluate(() => {
  const pick = (selector) => {
    const element = document.querySelector(selector)
    if (!element) return null
    const box = element.getBoundingClientRect()
    return { top: box.top, bottom: box.bottom, left: box.left, right: box.right, width: box.width, height: box.height }
  }
  return {
    scrollHeight: document.documentElement.scrollHeight,
    viewport: { width: innerWidth, height: innerHeight },
    menu: pick('.menu'),
    hero: pick('.menu__hero'),
    title: pick('.hero-title'),
    visual: pick('.menu__visual'),
    deck: pick('.menu__deck'),
    cards: [...document.querySelectorAll('.menu__deck-card')].map((element) => {
      const box = element.getBoundingClientRect()
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width }
    }),
    visualColumn: getComputedStyle(document.querySelector('.menu__hero')).gridTemplateColumns,
  }
})
console.log('MENU', JSON.stringify(menu, null, 2))

await page.getByRole('button', { name: /TAKE THE STAGE/i }).click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: /START THE SHOW/i }).click()
await page.waitForTimeout(500)

const battle = await page.evaluate(() => {
  const pick = (selector) => {
    const element = document.querySelector(selector)
    if (!element) return null
    const box = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    return {
      top: Math.round(box.top),
      bottom: Math.round(box.bottom),
      left: Math.round(box.left),
      right: Math.round(box.right),
      width: Math.round(box.width),
      height: Math.round(box.height),
      marginTop: style.marginTop,
      paddingTop: style.paddingTop,
      paddingBottom: style.paddingBottom,
      aspectRatio: style.aspectRatio,
      overflow: style.overflow,
      flex: style.flex,
    }
  }
  return {
    scrollHeight: document.documentElement.scrollHeight,
    battle: pick('.battle'),
    hud: pick('.battle__hud'),
    board: pick('.battle__board'),
    rivalSide: pick('.side--rival'),
    rivalStage: pick('.stage--rival'),
    clash: pick('.clashline'),
    playerSide: pick('.side--player'),
    playerStage: pick('.stage--player'),
    under: pick('.stage__under'),
    handrow: pick('.handrow'),
    hand: pick('.hand'),
    handFan: pick('.hand__fan'),
    handSlot: pick('.hand__slot'),
    handCard: pick('.hand__slot .card'),
    handSide: pick('.hand__side'),
    turnbox: pick('.turnbox'),
    endTurn: pick('.btn--end'),
    stageSlot: pick('.stage--player .stage__empty'),
    handLabel: pick('.hand__label'),
    battleBg: getComputedStyle(document.querySelector('.battle')).backgroundImage.slice(0, 120),
  }
})
console.log('BATTLE', JSON.stringify(battle, null, 2))
await browser.close()
