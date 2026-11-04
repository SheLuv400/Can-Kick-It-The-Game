import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' })
await page.waitForTimeout(2200)

const data = await page.evaluate(() => {
  const sample = (el) => {
    if (!el) return null
    const cs = getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    const chain = []
    let parent = el
    for (let i = 0; i < 4 && parent; i += 1) {
      const pcs = getComputedStyle(parent)
      chain.push({
        tag: parent.tagName,
        className: typeof parent.className === 'string' ? parent.className.slice(0, 80) : '',
        opacity: pcs.opacity,
        visibility: pcs.visibility,
        display: pcs.display,
        color: pcs.color,
        textFill: pcs.webkitTextFillColor,
        filter: pcs.filter,
        transform: pcs.transform,
      })
      parent = parent.parentElement
    }
    return {
      tag: el.tagName,
      className: typeof el.className === 'string' ? el.className.slice(0, 100) : '',
      textContent: el.textContent?.slice(0, 160),
      innerText: el.innerText?.slice(0, 160),
      html: el.outerHTML.slice(0, 300),
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
      color: cs.color,
      textFill: cs.webkitTextFillColor,
      opacity: cs.opacity,
      visibility: cs.visibility,
      display: cs.display,
      fontSize: cs.fontSize,
      fontFamily: cs.fontFamily,
      fontWeight: cs.fontWeight,
      textShadow: cs.textShadow,
      textIndent: cs.textIndent,
      letterSpacing: cs.letterSpacing,
      overflow: cs.overflow,
      clipPath: cs.clipPath,
      filter: cs.filter,
      mixBlendMode: cs.mixBlendMode,
      chain,
    }
  }
  const h1 = document.querySelector('h1')
  const firstButton = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('PLAY'))
  const firstSpan = document.querySelector('.menu-topbar span')
  return {
    body: {
      textContentLength: document.body.textContent?.length,
      innerTextLength: document.body.innerText?.length,
      bodyColor: getComputedStyle(document.body).color,
      bodyFont: getComputedStyle(document.body).fontFamily,
    },
    h1: sample(h1),
    firstButton: sample(firstButton),
    firstSpan: sample(firstSpan),
    fontChecks: {
      anton: document.fonts.check('16px Anton'),
      inter: document.fonts.check('16px Inter'),
      display: document.fonts.check('16px "Space Grotesk"'),
    },
    rootClass: document.querySelector('#root')?.firstElementChild?.className,
    textNodeSample: (() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      const items = []
      for (let i = 0; i < 10; i += 1) {
        const node = walker.nextNode()
        if (!node) break
        const parent = node.parentElement
        const cs = parent ? getComputedStyle(parent) : null
        items.push({
          text: node.textContent?.trim().slice(0, 80),
          parent: parent?.tagName,
          className: typeof parent?.className === 'string' ? parent.className.slice(0, 80) : '',
          color: cs?.color,
          textFill: cs?.webkitTextFillColor,
          opacity: cs?.opacity,
          fontSize: cs?.fontSize,
        })
      }
      return items
    })(),
  }
})

console.log(JSON.stringify(data, null, 2))
await browser.close()
