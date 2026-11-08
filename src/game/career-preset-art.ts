import type { CareerPresetId } from './career-presets'

import male01Full from '../assets/career-models/optimized/male_01-full.webp'
import male01Card from '../assets/career-models/optimized/male_01-card.webp'
import male02Full from '../assets/career-models/optimized/male_02-full.webp'
import male02Card from '../assets/career-models/optimized/male_02-card.webp'
import male03Full from '../assets/career-models/optimized/male_03-full.webp'
import male03Card from '../assets/career-models/optimized/male_03-card.webp'
import male04Full from '../assets/career-models/optimized/male_04-full.webp'
import male04Card from '../assets/career-models/optimized/male_04-card.webp'
import male05Full from '../assets/career-models/optimized/male_05-full.webp'
import male05Card from '../assets/career-models/optimized/male_05-card.webp'
import male06Full from '../assets/career-models/optimized/male_06-full.webp'
import male06Card from '../assets/career-models/optimized/male_06-card.webp'
import female01Full from '../assets/career-models/optimized/female_01-full.webp'
import female01Card from '../assets/career-models/optimized/female_01-card.webp'
import female02Full from '../assets/career-models/optimized/female_02-full.webp'
import female02Card from '../assets/career-models/optimized/female_02-card.webp'
import female03Full from '../assets/career-models/optimized/female_03-full.webp'
import female03Card from '../assets/career-models/optimized/female_03-card.webp'
import female04Full from '../assets/career-models/optimized/female_04-full.webp'
import female04Card from '../assets/career-models/optimized/female_04-card.webp'
import female05Full from '../assets/career-models/optimized/female_05-full.webp'
import female05Card from '../assets/career-models/optimized/female_05-card.webp'
import female06Full from '../assets/career-models/optimized/female_06-full.webp'
import female06Card from '../assets/career-models/optimized/female_06-card.webp'

export interface CareerPresetArtSources {
  full: string
  card: string
  thumb: string
}

const art = (full: string, card: string): CareerPresetArtSources => ({ full, card, thumb: full })

/** The fixed 12-character base roster. These assets ship with every build. */
export const CAREER_PRESET_ART: Record<CareerPresetId, CareerPresetArtSources> = {
  male_01: art(male01Full, male01Card),
  male_02: art(male02Full, male02Card),
  male_03: art(male03Full, male03Card),
  male_04: art(male04Full, male04Card),
  male_05: art(male05Full, male05Card),
  male_06: art(male06Full, male06Card),
  female_01: art(female01Full, female01Card),
  female_02: art(female02Full, female02Card),
  female_03: art(female03Full, female03Card),
  female_04: art(female04Full, female04Card),
  female_05: art(female05Full, female05Card),
  female_06: art(female06Full, female06Card),
}
