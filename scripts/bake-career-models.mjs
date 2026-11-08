#!/usr/bin/env node
/**
 * Bakes the fixed 12 career models from the verified source PNGs into the two
 * small WebP sizes the game needs: full-body stage art and a 2:3 card crop.
 *
 * The source PNGs stay untouched in src/assets/career-models. Only the
 * generated WebPs are imported by the app.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(ROOT, 'src', 'assets', 'career-models')
const OUT = join(SOURCE, 'optimized')
const IDS = [
  'male_01',
  'male_02',
  'male_03',
  'male_04',
  'male_05',
  'male_06',
  'female_01',
  'female_02',
  'female_03',
  'female_04',
  'female_05',
  'female_06',
]
const FULL_WIDTH = 384
const CARD_WIDTH = 320
const CARD_HEIGHT = 480
const CARD_CROP_RATIO = 0.52
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

if (!existsSync(SOURCE)) throw new Error('Missing src/assets/career-models.')
mkdirSync(OUT, { recursive: true })

for (const id of IDS) {
  const source = join(SOURCE, `${id}.png`)
  if (!existsSync(source)) throw new Error(`Missing source PNG: ${source}`)

  const trimmed = await sharp(source)
    .trim({ background: TRANSPARENT, threshold: 1 })
    .toBuffer({ resolveWithObject: true })

  const full = await sharp(trimmed.data)
    .resize({ width: FULL_WIDTH, withoutEnlargement: true })
    .webp({ quality: 78, effort: 6, alphaQuality: 80, smartSubsample: true })
    .toBuffer()
  writeFileSync(join(OUT, `${id}-full.webp`), full)

  const { width, height } = trimmed.info
  const cropHeight = Math.max(1, Math.round(height * CARD_CROP_RATIO))
  const cropWidth = Math.min(width, Math.round(cropHeight * (CARD_WIDTH / CARD_HEIGHT)))
  const left = Math.round((width - cropWidth) / 2)

  const card = await sharp(trimmed.data)
    .extract({ left, top: 0, width: cropWidth, height: cropHeight })
    .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'fill' })
    .webp({ quality: 78, effort: 6, alphaQuality: 80, smartSubsample: true })
    .toBuffer()
  writeFileSync(join(OUT, `${id}-card.webp`), card)

  console.log(
    `${id}: full ${(full.length / 1024).toFixed(0)} KB · card ${(card.length / 1024).toFixed(0)} KB`,
  )
}

const bytes = readFileSync(join(OUT, 'male_01-full.webp')).length
console.log(`Wrote ${IDS.length * 2} WebP assets into ${OUT} (${bytes} B sample).`)
