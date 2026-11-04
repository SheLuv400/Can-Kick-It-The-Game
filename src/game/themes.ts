import type { Difficulty } from './types'

export interface ThemeMeta {
  id: 'a' | 'b' | 'c'
  index: string
  name: string
  short: string
  tagline: string
  mood: string
  palette: string[]
  type: string
  keywords: string[]
}

export const THEME_META: Record<'a' | 'b' | 'c', ThemeMeta> = {
  a: {
    id: 'a',
    index: '01',
    name: 'PLATINUM RECORDS',
    short: 'PLATINUM',
    tagline: 'An after-hours award show, staged like an opera house.',
    mood: 'Opulent · cinematic · velvet',
    palette: ['#08070a', '#d8b45c', '#f3e2b4', '#6d1226'],
    type: 'Playfair Display / Inter',
    keywords: ['Gold foil', 'Ornate frames', 'Spotlight haze'],
  },
  b: {
    id: 'b',
    index: '02',
    name: 'HIP-HOP LEGENDS',
    short: 'HIP-HOP',
    tagline: 'Wheat-paste flyers, halftone ink, and one enormous speaker.',
    mood: 'Raw · loud · wheat-paste',
    palette: ['#101010', '#ff5a1f', '#29e7cd', '#ffd400'],
    type: 'Anton / Space Grotesk',
    keywords: ['Sticker stock', 'Risograph', 'Chain-link'],
  },
  c: {
    id: 'c',
    index: '03',
    name: 'NEON SOUNDSTAGE',
    short: 'NEON',
    tagline: 'A sold-out soundstage at the edge of the internet.',
    mood: 'Neon · holo · stadium',
    palette: ['#05060a', '#c6ff2e', '#8a5cff', '#b9ecff'],
    type: 'Syncopate / Space Grotesk',
    keywords: ['LED panels', 'Hologlass', 'Orbital HUD'],
  },
}

export const DIFFICULTIES: { id: Difficulty; label: string; note: string }[] = [
  { id: 'OPENING', label: 'OPENING ACT', note: 'Warm room · forgiving crowd' },
  { id: 'HEADLINER', label: 'HEADLINER', note: 'The intended show' },
  { id: 'LEGEND', label: 'LEGEND', note: 'Sold out · zero mercy' },
]

export const THEME_ORDER: ThemeMeta['id'][] = ['a', 'b', 'c']
