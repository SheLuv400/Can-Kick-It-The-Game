#!/usr/bin/env node
/**
 * Turn a fresh Vite build into the exact payload Sites publishes.
 *
 * The public site has a 10 MiB asset cap, so the deploy copies of the music
 * and DJ KICKIT clips are encoded down from the full-quality sources in
 * public/audio. This script is part of `npm run build`: audio can never be
 * silently omitted from a deploy again, and an over-budget payload fails the
 * build instead of publishing a broken game.
 */
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpegPath from 'ffmpeg-static'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const OUT = join(ROOT, 'site-optimized')
const STAGING = join(ROOT, '.site-build')
const LIMIT_BYTES = 10 * 1024 * 1024
const MAX_FILES = 1000
const IMAGE_QUALITY = 74

const MUSIC_BITRATES = {
  'ciki-main-theme.webm': '48k',
  'southern-steel.webm': '56k',
}
const DEFAULT_MUSIC_BITRATE = '48k'
const ANNOUNCER_BITRATE = '32k'

const fail = (message) => {
  throw new Error(`[site] ${message}`)
}

function walk(directory) {
  if (!existsSync(directory)) return []
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walk(fullPath))
    else if (entry.isFile()) files.push(fullPath)
  }
  return files
}

function encodeAudio(input, output, args) {
  mkdirSync(dirname(output), { recursive: true })
  const result = spawnSync(
    ffmpegPath,
    ['-y', '-v', 'error', '-i', input, '-vn', ...args, '-map_metadata', '-1', output],
    { encoding: 'utf8' },
  )
  if (result.error) fail(`Could not run ffmpeg: ${result.error.message}`)
  if (result.status !== 0) {
    fail(`Audio encode failed for ${input}\n${result.stderr || 'ffmpeg exited without details.'}`)
  }
}

async function main() {
  if (!ffmpegPath) fail('ffmpeg-static did not provide a binary.')
  if (!existsSync(join(DIST, 'index.html'))) {
    fail('dist/index.html is missing. Run the Vite build first.')
  }

  const audioSource = join(DIST, 'audio')
  if (!existsSync(audioSource)) {
    fail('dist/audio is missing. The soundtrack and DJ KICKIT clips would be absent.')
  }

  rmSync(STAGING, { recursive: true, force: true })
  cpSync(DIST, STAGING, { recursive: true })

  // Modern browsers use the woff2 files; the duplicate woff fallbacks only
  // consume the asset budget.
  for (const file of walk(join(STAGING, 'assets'))) {
    if (file.endsWith('.woff')) rmSync(file, { force: true })
  }

  const images = walk(join(STAGING, 'assets')).filter((file) => file.endsWith('.webp'))
  if (images.length === 0) fail('No card art was found in the build.')
  for (let index = 0; index < images.length; index += 8) {
    await Promise.all(
      images.slice(index, index + 8).map(async (file) => {
        const optimized = await sharp(file)
          .resize({ width: 560, withoutEnlargement: true })
          .webp({ quality: IMAGE_QUALITY, effort: 4, smartSubsample: true })
          .toBuffer()
        writeFileSync(file, optimized)
      }),
    )
  }

  const audioOut = join(STAGING, 'audio')
  rmSync(audioOut, { recursive: true, force: true })
  mkdirSync(audioOut, { recursive: true })

  const musicFiles = readdirSync(audioSource, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.webm'))
    .map((entry) => entry.name)
  for (const required of Object.keys(MUSIC_BITRATES)) {
    if (!musicFiles.includes(required)) fail(`Missing music source: ${required}`)
  }
  for (const file of musicFiles) {
    encodeAudio(
      join(audioSource, file),
      join(audioOut, file),
      ['-c:a', 'libopus', '-b:a', MUSIC_BITRATES[file] ?? DEFAULT_MUSIC_BITRATE, '-ac', '2'],
    )
  }

  const announcerSource = join(audioSource, 'announcer')
  const announcerFiles = walk(announcerSource).filter((file) => file.endsWith('.ogg'))
  if (announcerFiles.length === 0) fail('No DJ KICKIT clips were found in the build.')
  for (const file of announcerFiles) {
    const relative = file.slice(announcerSource.length + 1)
    encodeAudio(
      file,
      join(audioOut, 'announcer', relative),
      ['-c:a', 'libopus', '-b:a', ANNOUNCER_BITRATE, '-ac', '1', '-application', 'voip'],
    )
  }

  const manifest = JSON.parse(
    readFileSync(join(ROOT, 'audio', 'announcer', 'commentary_manifest.json'), 'utf8'),
  )
  for (const clip of manifest.clips) {
    const file = join(audioOut, 'announcer', clip.file)
    if (!existsSync(file) || statSync(file).size === 0) {
      fail(`Missing DJ KICKIT clip in deploy output: ${clip.file}`)
    }
  }

  const files = walk(STAGING)
  const bytes = files.reduce((total, file) => total + statSync(file).size, 0)
  if (files.length > MAX_FILES) fail(`Too many assets: ${files.length}/${MAX_FILES}.`)
  if (bytes > LIMIT_BYTES) {
    fail(
      `Deploy payload is ${(bytes / 1024 / 1024).toFixed(2)} MiB; ` +
        `the hosting limit is ${LIMIT_BYTES / 1024 / 1024} MiB. ` +
        'Keep the audio and reduce media quality or size before deploying.',
    )
  }

  rmSync(OUT, { recursive: true, force: true })
  renameSync(STAGING, OUT)

  console.log(
    `[site] ${files.length} files, ${(bytes / 1024 / 1024).toFixed(2)} MiB / ` +
      `${LIMIT_BYTES / 1024 / 1024} MiB`,
  )
  console.log(
    `[site] ${Object.keys(MUSIC_BITRATES).length} music tracks and ` +
      `${manifest.clips.length} DJ KICKIT clips included`,
  )
}

main().catch((error) => {
  rmSync(STAGING, { recursive: true, force: true })
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
