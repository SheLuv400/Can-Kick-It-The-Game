import type { CareerAttributeId } from './career-data'
import { BADGE_IDS, type BadgeId } from './badges'

export type CareerPresetCategory = 'male' | 'female'
export type CareerPresetId =
  | 'male_01'
  | 'male_02'
  | 'male_03'
  | 'male_04'
  | 'male_05'
  | 'male_06'
  | 'female_01'
  | 'female_02'
  | 'female_03'
  | 'female_04'
  | 'female_05'
  | 'female_06'

export const CAREER_PRESET_IDS: CareerPresetId[] = [
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

export const CAREER_PRESET_BASE_ATTRIBUTES: Record<CareerAttributeId, number> = {
  bars: 50,
  hooks: 50,
  stagePresence: 50,
  endurance: 50,
  defense: 50,
  chemistry: 50,
}

const CAREER_PRESET_BADGES: BadgeId[] = [...BADGE_IDS]

export interface CareerPreset {
  id: CareerPresetId
  category: CareerPresetCategory
  number: number
  label: string
  expectedFile: string
  startingOvr: 50
  /** All presets use the same baseline; the player's genre supplies the spread. */
  startingAttributes: Record<CareerAttributeId, number>
  /** The existing career genre pool is the model's move pool. */
  movePool: 'CAREER_GENRE_MOVE_POOL'
  badgeEligibility: BadgeId[]
  /** The player chooses genre; the model never hard-codes an identity. */
  startingGenre: 'PLAYER_SELECTED'
}

function preset(
  category: CareerPresetCategory,
  number: number,
): CareerPreset {
  const id = `${category}_0${number}` as CareerPresetId
  return {
    id,
    category,
    number,
    label: `${category === 'male' ? 'MALE' : 'FEMALE'} ${String(number).padStart(2, '0')}`,
    expectedFile: `${id}.png`,
    startingOvr: 50,
    startingAttributes: { ...CAREER_PRESET_BASE_ATTRIBUTES },
    movePool: 'CAREER_GENRE_MOVE_POOL',
    badgeEligibility: [...CAREER_PRESET_BADGES],
    startingGenre: 'PLAYER_SELECTED',
  }
}

export const CAREER_PRESETS: CareerPreset[] = [
  ...Array.from({ length: 6 }, (_, index) => preset('male', index + 1)),
  ...Array.from({ length: 6 }, (_, index) => preset('female', index + 1)),
]

export function careerPreset(id: string | null | undefined): CareerPreset {
  return CAREER_PRESETS.find((item) => item.id === id) ?? CAREER_PRESETS[0]
}

export function isCareerPresetId(value: unknown): value is CareerPresetId {
  return typeof value === 'string' && CAREER_PRESET_IDS.includes(value as CareerPresetId)
}

export function careerPresetsFor(category: CareerPresetCategory): CareerPreset[] {
  return CAREER_PRESETS.filter((item) => item.category === category)
}

/** Older saves stored a face id such as `female-04`; keep that artist aligned to the closest new slot. */
export function inferCareerPresetId(appearance: unknown): CareerPresetId {
  if (!appearance || typeof appearance !== 'object') return 'male_01'
  const source = appearance as { presentation?: unknown; face?: unknown }
  const face = typeof source.face === 'string' ? source.face : ''
  const category: CareerPresetCategory =
    source.presentation === 'female' || face.startsWith('female-') ? 'female' : 'male'
  const match = face.match(/(?:male|female)-0?([1-6])/)
  const number = match ? Number(match[1]) : 1
  return `${category}_0${number}` as CareerPresetId
}
