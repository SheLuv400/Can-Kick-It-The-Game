import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`CONSOLE: ${message.text()}`)
})
page.on('pageerror', (error) => errors.push(`PAGEERROR: ${error.message}`))
page.on('requestfailed', (request) => errors.push(`FAILED: ${request.url()} ${request.failure()?.errorText}`))

await page.goto('http://127.0.0.1:3000/')
await page.waitForTimeout(1800)

const info = await page.evaluate(() => {
  const title = document.querySelector('.hero-title')
  const name = document.querySelector('.card__name')
  const button = document.querySelector('.btn--primary')
  const style = title ? getComputedStyle(title) : null
  const nameStyle = name ? getComputedStyle(name) : null
  return {
    fonts: [...document.fonts].map((font) => ({ family: font.family, weight: font.weight, status: font.status })),
    fontCheck: document.fonts.check('16px "Playfair Display"'),
    titleBox: title?.getBoundingClientRect().toJSON() ?? null,
    titleStyle: style
      ? {
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          color: style.color,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
        }
      : null,
    titleText: title?.textContent ?? null,
    nameBox: name?.getBoundingClientRect().toJSON() ?? null,
    nameStyle: nameStyle
      ? {
          fontFamily: nameStyle.fontFamily,
          fontSize: nameStyle.fontSize,
          color: nameStyle.color,
          visibility: nameStyle.visibility,
        }
      : null,
    nameText: name?.textContent ?? null,
    buttonBox: button?.getBoundingClientRect().toJSON() ?? null,
    bodyTextLength: document.body.innerText.length,
    bodyHtmlSnippet: document.body.innerText.slice(0, 200),
  }
})
console.log(JSON.stringify(info, null, 2))
console.log('ERRORS:', JSON.stringify(errors, null, 2))
await page.screenshot({ path: 'artifacts/fontcheck.png' })
await browser.close()
