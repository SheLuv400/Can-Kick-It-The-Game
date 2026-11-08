import type { ArtistAppearance, Genre } from '../game/types'
import { careerOption } from '../game/career-data'

export interface GenreLook {
  deep: string
  glow: string
  rim: string
}

export const GENRE_LOOK: Record<Genre, GenreLook> = {
  'HIP-HOP': { deep: '#140a08', glow: '#e9a04a', rim: '#ffd9a0' },
  'R&B': { deep: '#120a1c', glow: '#a06bd8', rim: '#e7c9ff' },
  POP: { deep: '#071317', glow: '#2fc4d4', rim: '#bdf6ff' },
}

function parse(hex: string): [number, number, number] {
  let value = hex.replace('#', '')
  if (value.length === 3) value = value.split('').map((c) => c + c).join('')
  const n = Number.parseInt(value, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parse(a)
  const [br, bg, bb] = parse(b)
  const channel = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0')
  return `#${channel(ar, br)}${channel(ag, bg)}${channel(ab, bb)}`
}

export interface SkinPalette {
  base: string
  light: string
  lighter: string
  mid: string
  shade: string
  deep: string
  lip: string
  lipLight: string
  lipDark: string
}

export function buildSkin(base: string): SkinPalette {
  return {
    base,
    light: mix(base, '#ffe6cf', 0.28),
    lighter: mix(base, '#fff4e8', 0.5),
    mid: mix(base, '#2a0f0a', 0.2),
    shade: mix(base, '#2a0f0a', 0.44),
    deep: mix(base, '#160705', 0.64),
    lip: mix(base, '#7d3a3a', 0.42),
    lipLight: mix(base, '#ffd0c2', 0.26),
    lipDark: mix(base, '#4a1818', 0.5),
  }
}

export interface FaceSpec {
  width: number
  jaw: number
  chin: number
  cheekY: number
  jawY: number
  faceLen: number
  topY: number
  eyeY: number
  eyeDX: number
  eyeW: number
  eyeH: number
  browThick: number
  browArch: number
  noseW: number
  noseLen: number
  lipW: number
  lipFull: number
  mouthY: number
  earH: number
  neckW: number
}

const MALE_BASE: FaceSpec = {
  width: 66,
  jaw: 58,
  chin: 28,
  cheekY: 172,
  jawY: 226,
  faceLen: 260,
  topY: 88,
  eyeY: 174,
  eyeDX: 26,
  eyeW: 12.6,
  eyeH: 6.8,
  browThick: 4,
  browArch: 3.5,
  noseW: 13,
  noseLen: 38,
  lipW: 30,
  lipFull: 11,
  mouthY: 232,
  earH: 30,
  neckW: 32,
}

const FEMALE_BASE: FaceSpec = {
  width: 60,
  jaw: 49,
  chin: 23,
  cheekY: 174,
  jawY: 226,
  faceLen: 258,
  topY: 90,
  eyeY: 174,
  eyeDX: 25,
  eyeW: 13.2,
  eyeH: 7.4,
  browThick: 2.8,
  browArch: 5,
  noseW: 10,
  noseLen: 34,
  lipW: 28,
  lipFull: 13,
  mouthY: 228,
  earH: 26,
  neckW: 24,
}

const MALE_TWEAKS: Array<Partial<FaceSpec>> = [
  { width: 66, jaw: 58, chin: 28, eyeDX: 26, eyeW: 12.6, eyeH: 6.8, noseW: 13, lipW: 30, browThick: 4 },
  { width: 67, jaw: 61, chin: 30, eyeDX: 26.5, eyeW: 12.2, eyeH: 6.6, noseW: 14, lipW: 31, browThick: 4.4, jawY: 228 },
  { width: 65, jaw: 57, chin: 27, eyeDX: 25.5, eyeW: 12.8, eyeH: 7, noseW: 12.5, lipW: 29, browThick: 3.8 },
  { width: 65, jaw: 58, chin: 29, eyeDX: 25.8, eyeW: 12.4, eyeH: 6.6, noseW: 13, lipW: 30, browThick: 4.1, mouthY: 234 },
  { width: 66, jaw: 59, chin: 28, eyeDX: 26.2, eyeW: 12.5, eyeH: 6.7, noseW: 13.5, lipW: 30, browThick: 4.2 },
  { width: 64, jaw: 56, chin: 26, eyeDX: 25.2, eyeW: 12.7, eyeH: 6.9, noseW: 12, lipW: 29, browThick: 3.7, jawY: 224 },
]

const FEMALE_TWEAKS: Array<Partial<FaceSpec>> = [
  { width: 60, jaw: 49, chin: 23, eyeDX: 25, eyeW: 13.2, eyeH: 7.4, noseW: 10, lipW: 28, lipFull: 13 },
  { width: 59, jaw: 48, chin: 22, eyeDX: 24.5, eyeW: 13.4, eyeH: 7.6, noseW: 9.5, lipW: 29, lipFull: 14 },
  { width: 61, jaw: 49.5, chin: 23, eyeDX: 25.5, eyeW: 13, eyeH: 7.2, noseW: 9.8, lipW: 27, lipFull: 12.5 },
  { width: 61.5, jaw: 50, chin: 24, eyeDX: 25, eyeW: 13.1, eyeH: 7.3, noseW: 10.4, lipW: 28, lipFull: 13.5 },
  { width: 58.5, jaw: 47.5, chin: 21, eyeDX: 24.3, eyeW: 13.6, eyeH: 7.6, noseW: 9.2, lipW: 27, lipFull: 12.2 },
  { width: 60, jaw: 48.5, chin: 23, eyeDX: 25.1, eyeW: 13.3, eyeH: 7.5, noseW: 9.8, lipW: 28, lipFull: 13.8, mouthY: 230 },
]

export function buildFace(appearance: ArtistAppearance): FaceSpec {
  const female = appearance.presentation === 'female'
  const index = Math.min(5, Math.max(0, (Number(appearance.face.slice(-2)) || 1) - 1))
  const tweak = (female ? FEMALE_TWEAKS[index] : MALE_TWEAKS[index]) ?? {}
  return { ...(female ? FEMALE_BASE : MALE_BASE), ...tweak }
}

export function headPath(s: FaceSpec): string {
  const c = 150
  return [
    `M${c} ${s.topY}`,
    `C${c - s.width * 0.55} ${s.topY - 4} ${c - s.width * 0.9} ${s.topY + 8} ${c - s.width} ${s.topY + 40}`,
    `C${c - s.width * 1.06} ${s.topY + 74} ${c - s.width * 1.05} ${s.cheekY + 10} ${c - s.width * 0.98} ${s.cheekY + 30}`,
    `C${c - s.width * 0.94} ${s.jawY - 6} ${c - s.jaw * 0.98} ${s.jawY + 8} ${c - s.jaw * 0.82} ${s.jawY + 18}`,
    `C${c - s.chin * 2.3} ${s.faceLen - 8} ${c - s.chin * 1.1} ${s.faceLen} ${c} ${s.faceLen}`,
    `C${c + s.chin * 1.1} ${s.faceLen} ${c + s.chin * 2.3} ${s.faceLen - 8} ${c + s.jaw * 0.82} ${s.jawY + 18}`,
    `C${c + s.jaw * 0.98} ${s.jawY + 8} ${c + s.width * 0.94} ${s.jawY - 6} ${c + s.width * 0.98} ${s.cheekY + 30}`,
    `C${c + s.width * 1.05} ${s.cheekY + 10} ${c + s.width * 1.06} ${s.topY + 74} ${c + s.width} ${s.topY + 40}`,
    `C${c + s.width * 0.9} ${s.topY + 8} ${c + s.width * 0.55} ${s.topY - 4} ${c} ${s.topY}Z`,
  ].join(' ')
}

export function colorOf(appearance: ArtistAppearance, category: 'skin' | 'hairColor' | 'facialHairColor', fallback: string): string {
  return careerOption(category, appearance[category])?.color ?? fallback
}

export function topColor(top: string): [string, string] {
  switch (top) {
    case 'male-01':
      return ['#232024', '#a52a23']
    case 'male-02':
      return ['#f1ece2', '#bfb2a0']
    case 'male-03':
      return ['#211f1b', '#b58b35']
    case 'male-04':
      return ['#666a73', '#363943']
    case 'male-05':
      return ['#c63a2f', '#7d1d19']
    case 'male-06':
      return ['#41678e', '#213b55']
    case 'female-01':
      return ['#1a181c', '#08070a']
    case 'female-02':
      return ['#f4f0e6', '#c6bca9']
    case 'female-03':
      return ['#c9567e', '#8c2f50']
    case 'female-04':
      return ['#d3a93c', '#765510']
    case 'female-05':
      return ['#1d1d20', '#b58b35']
    case 'female-06':
      return ['#7297b8', '#3b5873']
    default:
      return ['#315574', '#1d3348']
  }
}

export function bottomColor(bottoms: string): string {
  switch (bottoms) {
    case 'cargo':
      return '#4b4a3a'
    case 'leather-pants':
      return '#1a171b'
    case 'skirt':
      return '#54283b'
    case 'track-pants':
      return '#2b3550'
    case 'shorts':
      return '#6a5540'
    default:
      return '#263a52'
  }
}

export interface ShoeStyle {
  upper: string
  sole: string
  accent: string
}

export const SHOE_STYLES: Record<string, ShoeStyle> = {
  'white-high': { upper: '#ecece8', sole: '#d7d7d2', accent: '#b9b9b3' },
  'red-black-high': { upper: '#1a191d', sole: '#a52a28', accent: '#c83832' },
  'wheat-boot': { upper: '#b17a32', sole: '#9a6a2d', accent: '#e0bd83' },
  'black-silver-chunky': { upper: '#1b1b1e', sole: '#1a1a1c', accent: '#a9a9ad' },
  'white-purple-low': { upper: '#f0edf1', sole: '#5c307f', accent: '#6f3a96' },
  'black-chunky': { upper: '#101012', sole: '#171719', accent: '#7c7c81' },
  'red-white-high': { upper: '#a92e2b', sole: '#e6dccb', accent: '#171619' },
  'navy-cream-low': { upper: '#1a2b4c', sole: '#e5dcc8', accent: '#d4c8b1' },
  'black-silver-low': { upper: '#171719', sole: '#d9d4ca', accent: '#a7a6a3' },
  'purple-silver-chunky': { upper: '#2a1b31', sole: '#1a171e', accent: '#9a70bf' },
  'black-canvas-low': { upper: '#191919', sole: '#d8cebb', accent: '#eee5d3' },
  'silver-gold-high': { upper: '#a9aaad', sole: '#1c1b1c', accent: '#d1a84c' },
}
