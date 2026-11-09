export type BattleFormatId = '1v1' | '2v2' | 'triple-threat' | 'fatal-4'

export type HouseRulePreset = 'standard' | 'custom' | 'shuffle'

export type ShuffleChaos = 'low' | 'mayhem' | 'full'

export type HouseModifierId =
  | 'hype-surge'
  | 'crate-frenzy'
  | 'double-time-delivery'
  | 'big-stage'
  | 'golden-hooks'
  | 'sharp-pen-showcase'
  | 'backstage-bounce'
  | 'encore-spotlight'
  | 'last-verse-standing'
  | 'crate-lockdown'

export type HouseRuleTrigger =
  | 'turn-start'
  | 'first-crate'
  | 'turn-clock'
  | 'crowd-start'
  | 'healing'
  | 'direct-attack'
  | 'revival'
  | 'encore'
  | 'curfew'
  | 'crate-draw'

export type HouseRuleFrequency = 'per-turn' | 'per-match' | 'ongoing'

export interface BattleFormatDefinition {
  id: BattleFormatId
  name: string
  shortName: string
  subtitle: string
  players: number
  teams: number
  enabled: boolean
  unavailableReason?: string
}

export interface HouseModifierDefinition {
  id: HouseModifierId
  name: string
  shortName: string
  description: string
  formats: BattleFormatId[]
  trigger: HouseRuleTrigger
  frequency: HouseRuleFrequency
  effect: Record<string, number>
  conflicts: HouseModifierId[]
  enabled: boolean
  unavailableReason?: string
}

export interface HouseRulesConfig {
  version: 1
  preset: HouseRulePreset
  format: BattleFormatId
  modifiers: HouseModifierId[]
  chaos: ShuffleChaos
  seed: string
}

export const HOUSE_RULE_VERSION = 1 as const

export const BATTLE_FORMATS: BattleFormatDefinition[] = [
  {
    id: '1v1',
    name: 'THE MAIN EVENT',
    shortName: '1V1',
    subtitle: 'One stage. One crown.',
    players: 2,
    teams: 2,
    enabled: true,
  },
  {
    id: '2v2',
    name: 'TAG TEAM HEADLINERS',
    shortName: '2V2',
    subtitle: 'Two mics. One crowd. Team pressure ×1.5.',
    players: 4,
    teams: 2,
    enabled: true,
  },
  {
    id: 'triple-threat',
    name: 'THREE MICS, ONE CROWN',
    shortName: 'TRIPLE THREAT',
    subtitle: 'Three artists. No allies.',
    players: 3,
    teams: 3,
    enabled: true,
  },
  {
    id: 'fatal-4',
    name: 'FOUR-WAY MAIN EVENT',
    shortName: 'FATAL 4',
    subtitle: 'Four corners. One room.',
    players: 4,
    teams: 4,
    enabled: true,
  },
]

export const HOUSE_MODIFIERS: HouseModifierDefinition[] = [
  {
    id: 'hype-surge',
    name: 'HYPE SURGE',
    shortName: 'HYPE SURGE',
    description: 'Gain 1 extra Hype when your turn begins. The normal 24 Hype cap still applies.',
    formats: ['1v1', '2v2', 'triple-threat', 'fatal-4'],
    trigger: 'turn-start',
    frequency: 'per-turn',
    effect: { hype: 1 },
    conflicts: [],
    enabled: true,
  },
  {
    id: 'crate-frenzy',
    name: 'CRATE FRENZY',
    shortName: 'CRATE FRENZY',
    description: 'Your first turn includes one free legal Crate draw, subject to the Crate hand limit.',
    formats: ['1v1', '2v2', 'triple-threat', 'fatal-4'],
    trigger: 'first-crate',
    frequency: 'per-match',
    effect: { draws: 1 },
    conflicts: ['crate-lockdown'],
    enabled: true,
  },
  {
    id: 'double-time-delivery',
    name: 'DOUBLE-TIME DELIVERY',
    shortName: 'DOUBLE-TIME',
    description: 'Shortens each player turn to 20 seconds, or 15 seconds when configured.',
    formats: ['1v1', '2v2', 'triple-threat', 'fatal-4'],
    trigger: 'turn-clock',
    frequency: 'per-turn',
    effect: { seconds: 20, fastSeconds: 15 },
    conflicts: [],
    enabled: false,
    unavailableReason: 'No authoritative turn clock exists in this build yet.',
  },
  {
    id: 'big-stage',
    name: 'BIG STAGE',
    shortName: 'BIG STAGE',
    description: 'Both sides start with 25% more Crowd HP. Team Crowd is increased only once.',
    formats: ['1v1', '2v2', 'triple-threat', 'fatal-4'],
    trigger: 'crowd-start',
    frequency: 'per-match',
    effect: { crowdMultiplier: 1.25 },
    conflicts: [],
    enabled: true,
  },
  {
    id: 'golden-hooks',
    name: 'GOLDEN HOOKS',
    shortName: 'GOLDEN HOOKS',
    description: 'The first successful HP heal each turn restores 15% more, without exceeding max HP.',
    formats: ['1v1', '2v2', 'triple-threat', 'fatal-4'],
    trigger: 'healing',
    frequency: 'per-turn',
    effect: { healMultiplier: 1.15 },
    conflicts: [],
    enabled: true,
  },
  {
    id: 'sharp-pen-showcase',
    name: 'SHARP PEN SHOWCASE',
    shortName: 'SHARP PEN',
    description: 'The first successful direct Artist attack each turn deals 10% more damage.',
    formats: ['1v1', '2v2', 'triple-threat', 'fatal-4'],
    trigger: 'direct-attack',
    frequency: 'per-turn',
    effect: { damageMultiplier: 1.1 },
    conflicts: [],
    enabled: true,
  },
  {
    id: 'backstage-bounce',
    name: 'BACKSTAGE BOUNCE',
    shortName: 'BACKSTAGE BOUNCE',
    description: 'Your first successful revival of the match grants 2 extra Hype, capped normally.',
    formats: ['1v1', '2v2', 'triple-threat', 'fatal-4'],
    trigger: 'revival',
    frequency: 'per-match',
    effect: { hype: 2 },
    conflicts: [],
    enabled: true,
  },
  {
    id: 'encore-spotlight',
    name: 'ENCORE SPOTLIGHT',
    shortName: 'ENCORE SPOTLIGHT',
    description: 'Your first Encore attack of the match deals 10% more damage.',
    formats: ['1v1', '2v2', 'triple-threat', 'fatal-4'],
    trigger: 'encore',
    frequency: 'per-match',
    effect: { damageMultiplier: 1.1 },
    conflicts: [],
    enabled: true,
  },
  {
    id: 'last-verse-standing',
    name: 'LAST VERSE STANDING',
    shortName: 'LAST VERSE',
    description: 'During the final two Curfew rounds, direct Crowd damage increases by 10%.',
    formats: ['1v1', '2v2', 'triple-threat', 'fatal-4'],
    trigger: 'curfew',
    frequency: 'ongoing',
    effect: { damageMultiplier: 1.1, rounds: 2 },
    conflicts: [],
    enabled: true,
  },
  {
    id: 'crate-lockdown',
    name: 'CRATE LOCKDOWN',
    shortName: 'CRATE LOCKDOWN',
    description: 'Bonus Crate draws are disabled. Standard card draws and existing Crate cards still work.',
    formats: ['1v1', '2v2', 'triple-threat', 'fatal-4'],
    trigger: 'crate-draw',
    frequency: 'ongoing',
    effect: { draws: 0 },
    conflicts: ['crate-frenzy'],
    enabled: true,
  },
]

export const HOUSE_RULE_PRESETS: Array<{
  id: HouseRulePreset
  name: string
  tag: string
  description: string
}> = [
  {
    id: 'standard',
    name: 'STANDARD BATTLE',
    tag: 'OFFICIAL RULES',
    description: 'The current official battle rules. No optional modifiers.',
  },
  {
    id: 'custom',
    name: 'CUSTOM MIXTAPE',
    tag: 'HOST PICKS UP TO 3',
    description: 'The host builds a compatible three-modifier mixtape. Every player must accept it.',
  },
  {
    id: 'shuffle',
    name: 'SHUFFLE MADNESS',
    tag: 'DJ PICKS THE RULES',
    description: 'The DJ shuffles a compatible set from the modifier database before the match.',
  },
]

export const SHUFFLE_CHAOS: Array<{
  id: ShuffleChaos
  name: string
  tag: string
  count: number
}> = [
  { id: 'low', name: 'LOW CHAOS', tag: '1 MODIFIER', count: 1 },
  { id: 'mayhem', name: 'MIXTAPE MAYHEM', tag: '2 MODIFIERS', count: 2 },
  { id: 'full', name: 'FULL HOUSE', tag: 'UP TO 3 MODIFIERS', count: 3 },
]

export const DEFAULT_HOUSE_RULES: HouseRulesConfig = {
  version: HOUSE_RULE_VERSION,
  preset: 'standard',
  format: '1v1',
  modifiers: [],
  chaos: 'mayhem',
  seed: '',
}

const MODIFIER_BY_ID = Object.fromEntries(
  HOUSE_MODIFIERS.map((modifier) => [modifier.id, modifier]),
) as Record<HouseModifierId, HouseModifierDefinition>

const FORMAT_BY_ID = Object.fromEntries(
  BATTLE_FORMATS.map((format) => [format.id, format]),
) as Record<BattleFormatId, BattleFormatDefinition>

export function houseModifierById(id: HouseModifierId): HouseModifierDefinition {
  return MODIFIER_BY_ID[id]
}

export function battleFormatById(id: BattleFormatId): BattleFormatDefinition {
  return FORMAT_BY_ID[id]
}

export function housePresetById(id: HouseRulePreset) {
  return HOUSE_RULE_PRESETS.find((preset) => preset.id === id) ?? HOUSE_RULE_PRESETS[0]
}

export function shuffleChaosById(id: ShuffleChaos) {
  return SHUFFLE_CHAOS.find((chaos) => chaos.id === id) ?? SHUFFLE_CHAOS[1]
}

export function cloneHouseRules(config: HouseRulesConfig): HouseRulesConfig {
  return { ...config, modifiers: [...config.modifiers] }
}

export function houseRulesTitle(config: Pick<HouseRulesConfig, 'preset'>): string {
  if (config.preset === 'standard') return 'THE MAIN EVENT — OFFICIAL RULES'
  if (config.preset === 'custom') return "DJ'S HOUSE RULES — CUSTOM MIXTAPE"
  return "DJ'S HOUSE RULES — SHUFFLE MADNESS"
}

export function houseRulesSummary(config: HouseRulesConfig): string {
  if (config.preset === 'standard') return 'OFFICIAL RULES'
  if (config.modifiers.length === 0) return 'NO MODIFIERS SELECTED'
  return config.modifiers.map((id) => houseModifierById(id).name).join(' · ')
}

export function houseModifierConflict(
  id: HouseModifierId,
  selected: HouseModifierId[],
  format: BattleFormatId = '1v1',
): string | null {
  const modifier = houseModifierById(id)
  if (!modifier.enabled) return modifier.unavailableReason ?? 'UNAVAILABLE IN THIS BUILD'
  if (!modifier.formats.includes(format)) return 'NOT VALID FOR THIS BATTLE FORMAT'
  if (selected.includes(id)) return null
  if (selected.length >= 3) return 'MAXIMUM 3 MODIFIERS'
  const conflict = modifier.conflicts.find((other) => selected.includes(other))
  if (conflict) return `CONFLICTS WITH ${houseModifierById(conflict).name}`
  const reverse = selected.find((other) => houseModifierById(other).conflicts.includes(id))
  if (reverse) return `CONFLICTS WITH ${houseModifierById(reverse).name}`
  return null
}

export function canAddHouseModifier(
  id: HouseModifierId,
  selected: HouseModifierId[],
  format: BattleFormatId = '1v1',
): boolean {
  return selected.includes(id) || houseModifierConflict(id, selected, format) === null
}

export function toggleHouseModifier(
  selected: HouseModifierId[],
  id: HouseModifierId,
  format: BattleFormatId = '1v1',
): HouseModifierId[] {
  if (selected.includes(id)) return selected.filter((entry) => entry !== id)
  if (!canAddHouseModifier(id, selected, format)) return selected
  return [...selected, id]
}

export function randomSeed(): string {
  const bytes = new Uint8Array(8)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
}

function seededRandom(seed: string): () => number {
  let state = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index)
    state = Math.imul(state, 16777619)
  }
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items]
  for (let index = out.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[out[index], out[target]] = [out[target], out[index]]
  }
  return out
}

/**
 * Host-authoritative randomizer. The seed is generated once by the host and
 * carried in the locked match configuration so every client can verify the set.
 */
export function generateShuffleRules(
  chaos: ShuffleChaos,
  format: BattleFormatId = '1v1',
  seed = randomSeed(),
): HouseRulesConfig {
  const count = shuffleChaosById(chaos).count
  const eligible = HOUSE_MODIFIERS.filter(
    (modifier) => modifier.enabled && modifier.formats.includes(format),
  )
  const random = seededRandom(seed)
  const picked: HouseModifierId[] = []
  for (const modifier of seededShuffle(eligible, random)) {
    if (picked.length >= count) break
    if (houseModifierConflict(modifier.id, picked, format) === null) {
      picked.push(modifier.id)
    }
  }
  return {
    version: HOUSE_RULE_VERSION,
    preset: 'shuffle',
    format,
    modifiers: picked,
    chaos,
    seed,
  }
}

export function standardHouseRules(format: BattleFormatId = '1v1'): HouseRulesConfig {
  return { ...DEFAULT_HOUSE_RULES, format, modifiers: [] }
}

export function customHouseRules(
  format: BattleFormatId = '1v1',
  modifiers: HouseModifierId[] = ['hype-surge'],
): HouseRulesConfig {
  return {
    version: HOUSE_RULE_VERSION,
    preset: 'custom',
    format,
    modifiers: modifiers.filter((id) => Boolean(MODIFIER_BY_ID[id])).slice(0, 3),
    chaos: 'mayhem',
    seed: '',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function parseHouseRules(value: unknown): HouseRulesConfig | null {
  if (!isRecord(value)) return null
  const preset = value.preset
  const format = value.format
  const chaos = value.chaos
  if (preset !== 'standard' && preset !== 'custom' && preset !== 'shuffle') return null
  if (format !== '1v1' && format !== '2v2' && format !== 'triple-threat' && format !== 'fatal-4') {
    return null
  }
  const normalizedChaos: ShuffleChaos =
    chaos === 'low' || chaos === 'mayhem' || chaos === 'full' ? chaos : 'mayhem'
  const modifiers = Array.isArray(value.modifiers)
    ? [...new Set(value.modifiers.filter((id): id is HouseModifierId => (
        typeof id === 'string' && id in MODIFIER_BY_ID
      )))]
    : []
  const seed = typeof value.seed === 'string' ? value.seed.slice(0, 64) : ''
  return {
    version: HOUSE_RULE_VERSION,
    preset,
    format,
    modifiers: preset === 'standard' ? [] : modifiers.slice(0, 3),
    chaos: normalizedChaos,
    seed,
  }
}

export function houseRulesValidationError(config: HouseRulesConfig): string | null {
  const format = battleFormatById(config.format)
  if (!format) return 'UNKNOWN BATTLE FORMAT'
  if (!format.enabled) return format.unavailableReason ?? 'BATTLE FORMAT UNAVAILABLE'
  if (config.preset === 'standard') {
    if (config.modifiers.length > 0) return 'STANDARD BATTLE CANNOT CONTAIN MODIFIERS'
    return null
  }
  if (config.preset === 'custom') {
    if (config.modifiers.length === 0) return 'CUSTOM MIXTAPE NEEDS AT LEAST ONE MODIFIER'
    if (config.modifiers.length > 3) return 'MAXIMUM 3 MODIFIERS'
    for (const id of config.modifiers) {
      const modifier = MODIFIER_BY_ID[id]
      if (!modifier) return 'UNKNOWN MODIFIER'
      if (!modifier.enabled) return `${modifier.name} IS UNAVAILABLE`
      if (!modifier.formats.includes(config.format)) return `${modifier.name} IS NOT VALID FOR THIS FORMAT`
    }
    for (let index = 0; index < config.modifiers.length; index += 1) {
      const id = config.modifiers[index]
      const conflict = config.modifiers.slice(index + 1).find((other) => (
        MODIFIER_BY_ID[id].conflicts.includes(other) ||
        MODIFIER_BY_ID[other].conflicts.includes(id)
      ))
      if (conflict) return `${MODIFIER_BY_ID[id].name} CONFLICTS WITH ${MODIFIER_BY_ID[conflict].name}`
    }
    return null
  }
  if (!config.seed) return 'SHUFFLE MADNESS NEEDS A SEED'
  if (config.modifiers.length === 0) return 'SHUFFLE MADNESS NEEDS AT LEAST ONE MODIFIER'
  if (config.modifiers.length > shuffleChaosById(config.chaos).count) {
    return 'SHUFFLE PICKED TOO MANY MODIFIERS'
  }
  for (const id of config.modifiers) {
    const modifier = MODIFIER_BY_ID[id]
    if (!modifier) return 'UNKNOWN MODIFIER'
    if (!modifier.enabled) return `${modifier.name} IS UNAVAILABLE`
    if (!modifier.formats.includes(config.format)) return `${modifier.name} IS NOT VALID FOR THIS FORMAT`
  }
  const expected = generateShuffleRules(config.chaos, config.format, config.seed)
  if (expected.modifiers.slice().sort().join('|') !== config.modifiers.slice().sort().join('|')) {
    return 'SHUFFLE CONFIGURATION DOES NOT MATCH ITS SEED'
  }
  return null
}

export function parseAndValidateHouseRules(value: unknown): HouseRulesConfig | null {
  const parsed = parseHouseRules(value)
  if (!parsed) return null
  return houseRulesValidationError(parsed) ? null : parsed
}

export function sameHouseRules(left: HouseRulesConfig | null | undefined, right: HouseRulesConfig | null | undefined): boolean {
  if (!left || !right) return left === right
  return (
    left.preset === right.preset &&
    left.format === right.format &&
    left.chaos === right.chaos &&
    left.seed === right.seed &&
    left.modifiers.length === right.modifiers.length &&
    left.modifiers.every((id, index) => id === right.modifiers[index])
  )
}
