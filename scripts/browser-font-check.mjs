import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
const fontResponses = []
page.on('response', (response) => {
  const url = response.url()
  if (/\.(woff2?|ttf|otf)(\?|$)/.test(url)) {
    fontResponses.push({ status: response.status(), url: url.split('/').slice(-2).join('/') })
  }
})
const fontFailures = []
page.on('requestfailed', (request) => {
  if (/\.(woff2?|ttf|otf)(\?|$)/.test(request.url())) {
    fontFailures.push({ url: request.url().split('/').slice(-2).join('/'), error: request.failure()?.errorText })
  }
})

await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.evaluate(() => document.fonts.ready)
console.log('FONT_RESPONSES', JSON.stringify(fontResponses.slice(0, 30), null, 2))
console.log('FONT_FAILURES', JSON.stringify(fontFailures, null, 2))
console.log(
  'FACES',
  await page.evaluate(() =>
    [...document.fonts].slice(0, 20).map((face) => ({
      family: face.family,
      weight: face.weight,
      status: face.status,
      display: face.display,
    })),
  ),
)
console.log(
  'CHECKS',
  await page.evaluate(() => ({
    anton: document.fonts.check('16px "Anton"'),
    inter: document.fonts.check('16px "Inter"'),
    interLoaded: document.fonts.check('700 16px "Inter"'),
  })),
)

const fontPath = 'node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2'
const fontData = readFileSync(fontPath).toString('base64')
await page.addStyleTag({
  content: `@font-face{font-family:'LocalCheck';src:url(data:font/woff2;base64,${fontData}) format('woff2');font-weight:400;font-display:block;} *{font-family:'LocalCheck',sans-serif!important;}`,
})
await page.waitForTimeout(500)
await page.screenshot({ path: 'artifacts/ciki-menu-injected-font.png', fullPage: true })
console.log('BODY_TEXT_AFTER_FONT', (await page.locator('body').innerText()).slice(0, 500))

await page.setContent('<body style="background:#111;color:#fff"><h1>CONTROL TEXT 123</h1><p>If this is invisible, the headless browser has no paint path for fonts.</p></body>')
await page.screenshot({ path: 'artifacts/ciki-control-text.png' })
await browser.close()
