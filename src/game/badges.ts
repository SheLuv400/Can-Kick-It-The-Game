import type { ArtistProgress, BadgeProgress, BadgeTier } from './types'

export type BadgeId =
  | 'headliner'
  | 'executioner'
  | 'guardian'
  | 'medic'
  | 'elementalist'
  | 'momentum'
  | 'closer'
  | 'encore'
  | 'assist'
  | 'veteran'

export type BadgeTierState = BadgeTier | 'locked'

export const BADGE_MAX_EQUIPPED = 5
export const BADGE_TIER_ORDER: BadgeTier[] = [
  'plastic',
  'bronze',
  'gold',
  'platinum',
  'diamond',
]

/**
 * Each threshold is the XP required to leave the current tier. Tier progress is
 * intentionally separate: reaching Plastic does not make Bronze cheaper.
 */
export const BADGE_TIER_THRESHOLDS: Record<BadgeTierState, number> = {
  locked: 5_000,
  plastic: 12_000,
  bronze: 24_000,
  gold: 48_000,
  platinum: 96_000,
  diamond: 0,
}

export const BADGE_TIER_META: Record<
  BadgeTierState,
  { label: string; short: string; color: string; glow: string; copy: string }
> = {
  locked: {
    label: 'LOCKED',
    short: '—',
    color: '#877f72',
    glow: 'rgba(135, 127, 114, 0.18)',
    copy: 'Earn matching reps to unlock.',
  },
  plastic: {
    label: 'PLASTIC',
    short: 'P',
    color: '#bac3cb',
    glow: 'rgba(186, 195, 203, 0.32)',
    copy: 'The first shine. The grind starts here.',
  },
  bronze: {
    label: 'BRONZE',
    short: 'B',
    color: '#cf8750',
    glow: 'rgba(207, 135, 80, 0.4)',
    copy: 'A real room respects the work.',
  },
  gold: {
    label: 'GOLD',
    short: 'G',
    color: '#f4ce59',
    glow: 'rgba(244, 206, 89, 0.46)',
    copy: 'Elite company. The set changes shape.',
  },
  platinum: {
    label: 'PLATINUM',
    short: 'PL',
    color: '#c8efff',
    glow: 'rgba(200, 239, 255, 0.5)',
    copy: 'Cold-blooded execution. Rare air.',
  },
  diamond: {
    label: 'DIAMOND',
    short: 'D',
    color: '#c8b6ff',
    glow: 'rgba(200, 182, 255, 0.6)',
    copy: 'Maxed. The badge becomes a signature.',
  },
}

const NEXT_TIER: Record<BadgeTierState, BadgeTierState> = {
  locked: 'plastic',
  plastic: 'bronze',
  bronze: 'gold',
  gold: 'platinum',
  platinum: 'diamond',
  diamond: 'diamond',
}

export interface BadgeDefinition {
  id: BadgeId
  name: string
  icon: string
  tag: string
  accent: string
  requirement: string
  action: string
  activation: string
  limit: string
  unlock: string
  effect: (power: number) => string
}

/**
 * Ten programs per artist. Eight are the requested performance identities;
 * HEADLINER and STAGE ALCHEMIST remain as the two career-recognition extras
 * so existing saves and the five-slot standard-game loadout keep working.
 */
export const BADGE_CATALOG: BadgeDefinition[] = [
  {
    id: 'headliner',
    name: 'HEADLINER',
    icon: '★',
    tag: 'WIN',
    accent: '#f4ce59',
    requirement: 'Win shows with this artist',
    action: 'CLOSE THE SHOW',
    activation: 'When this artist enters the stage',
    limit: 'Once per entrance',
    unlock: 'Win career shows; story clears grant the first copy',
    effect: (power) => `+${power} MAX HP`,
  },
  {
    id: 'executioner',
    name: 'PEN GAME',
    icon: '✕',
    tag: 'BARS',
    accent: '#ff6757',
    requirement: 'Land direct lyrical attacks on low-HP rivals',
    action: 'FINISH THE BAR',
    activation: 'A direct lyrical attack hits a rival below 35% HP',
    limit: 'Once per qualifying hit',
    unlock: 'Clear the first career chapter; earn KO XP thereafter',
    effect: (power) => `+${power} DMG VS LOW HP`,
  },
  {
    id: 'guardian',
    name: 'STUDIO VETERAN',
    icon: '◈',
    tag: 'RECOVERY',
    accent: '#7cd8ff',
    requirement: 'Prevent incoming damage and protect the set',
    action: 'HOLD THE BOOTH',
    activation: 'This artist enters the stage',
    limit: 'Once per entrance',
    unlock: 'Clear a defensive career objective; earn prevent XP thereafter',
    effect: (power) => `+${power} DEFENSE`,
  },
  {
    id: 'medic',
    name: 'HOOK MASTER',
    icon: '✚',
    tag: 'HOOKS',
    accent: '#69e5a0',
    requirement: 'Restore HP with hooks and recovery cuts',
    action: 'KEEP THE SET ALIVE',
    activation: 'An eligible healing effect resolves',
    limit: 'Every healing action; no extra uses',
    unlock: 'Clear a support mission; earn healing XP thereafter',
    effect: (power) => `+${power} HP RESTORED`,
  },
  {
    id: 'elementalist',
    name: 'STAGE ALCHEMIST',
    icon: 'ϟ',
    tag: 'ELEMENT',
    accent: '#b59cff',
    requirement: 'Turn genre elements into stage moments',
    action: 'BEND THE ROOM',
    activation: 'A qualifying elemental action lands',
    limit: 'Once per qualifying action',
    unlock: 'Land elemental cuts; the first copy is a career milestone reward',
    effect: (power) => `+${power} ELEMENTAL DMG`,
  },
  {
    id: 'momentum',
    name: 'MIC PRESENCE',
    icon: '»',
    tag: 'STAGE',
    accent: '#ffad54',
    requirement: 'Own the stage and keep the room moving',
    action: 'NEVER LOSE THE ROOM',
    activation: 'This artist enters the stage',
    limit: 'Once per entrance; capped by Hype',
    unlock: 'Clear Chapter 2; earn attack XP thereafter',
    effect: (power) => `+${power} ENTRY HYPE`,
  },
  {
    id: 'closer',
    name: 'CROWD CONTROLLER',
    icon: '▼',
    tag: 'CROWD',
    accent: '#ff5fa4',
    requirement: 'Deal damage and control the Crowd Meter',
    action: 'PRESS THE ROOM',
    activation: 'This artist deals damage',
    limit: 'Every qualifying hit; small fixed pressure',
    unlock: 'Clear Chapter 3; earn damage XP thereafter',
    effect: (power) => `+${power} CROWD DMG`,
  },
  {
    id: 'encore',
    name: 'ENCORE READY',
    icon: '↻',
    tag: 'ENCORE',
    accent: '#5ce9e0',
    requirement: 'Build special charge and close with an Encore',
    action: 'SAVE THE BEST FOR LAST',
    activation: 'This artist enters the stage',
    limit: 'Starting charge only; once per battle',
    unlock: 'Clear Chapter 4; earn Encore and Feature XP thereafter',
    effect: (power) => `+${power} STARTING SPECIAL CHARGE`,
  },
  {
    id: 'assist',
    name: 'FEATURE SPECIALIST',
    icon: '⇄',
    tag: 'FEATURE',
    accent: '#d3f56d',
    requirement: 'Use collaboration and ally-target actions',
    action: 'MAKE THE CREW BETTER',
    activation: 'An ally-target move resolves',
    limit: 'Once per qualifying action; shield only',
    unlock: 'Clear a collaboration objective; earn assist XP thereafter',
    effect: (power) => `+${power} FEATURE SHIELD`,
  },
  {
    id: 'veteran',
    name: 'COMEBACK ARTIST',
    icon: 'V',
    tag: 'BACKSTAGE',
    accent: '#ddc9a6',
    requirement: 'Return from Backstage and strike again',
    action: 'THE ROOM REMEMBERS',
    activation: 'First damaging attack after an actual Backstage recall',
    limit: 'Once per recall',
    unlock: 'Finish a mission that uses Backstage recall',
    effect: (power) => `+${power} FIRST-HIT DMG AFTER RECALL`,
  },
]

export const BADGE_BY_ID = new Map(BADGE_CATALOG.map((badge) => [badge.id, badge]))
export const BADGE_IDS = BADGE_CATALOG.map((badge) => badge.id)

const BADGE_ID_SET = new Set<string>(BADGE_IDS)

function cleanInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0
}

export function emptyBadgeProgress(): BadgeProgress {
  return { tier: 'locked', xp: 0, totalXp: 0 }
}

export function normalizeBadgeProgress(raw: unknown): BadgeProgress {
  if (!raw || typeof raw !== 'object') return emptyBadgeProgress()
  const candidate = raw as Partial<BadgeProgress>
  const tier: BadgeTierState =
    candidate.tier === 'plastic' ||
    candidate.tier === 'bronze' ||
    candidate.tier === 'gold' ||
    candidate.tier === 'platinum' ||
    candidate.tier === 'diamond'
      ? candidate.tier
      : 'locked'
  return {
    tier,
    xp: tier === 'diamond' ? 0 : cleanInt(candidate.xp),
    totalXp: cleanInt(candidate.totalXp ?? candidate.xp),
  }
}

export function normalizeBadgeRecords(raw: unknown): Record<string, BadgeProgress> {
  if (!raw || typeof raw !== 'object') return {}
  const records: Record<string, BadgeProgress> = {}
  for (const [id, value] of Object.entries(raw)) {
    if (!BADGE_ID_SET.has(id)) continue
    records[id] = normalizeBadgeProgress(value)
  }
  return records
}

export function sanitizeBadgeLoadout(
  loadout: unknown,
  records: Record<string, BadgeProgress> | undefined,
): string[] {
  if (!Array.isArray(loadout)) return []
  const picked: string[] = []
  for (const id of loadout) {
    if (typeof id !== 'string' || !BADGE_ID_SET.has(id) || picked.includes(id)) continue
    const record = records?.[id]
    if (!record || record.tier === 'locked') continue
    picked.push(id)
    if (picked.length >= BADGE_MAX_EQUIPPED) break
  }
  return picked
}

export function badgeTierPower(tier: BadgeTierState): number {
  if (tier === 'locked') return 0
  return BADGE_TIER_ORDER.indexOf(tier) + 1
}

export function badgeTierLabel(tier: BadgeTierState): string {
  return BADGE_TIER_META[tier].label
}

export function badgeThresholdFor(tier: BadgeTierState): number {
  return BADGE_TIER_THRESHOLDS[tier]
}

export function badgeNextTier(tier: BadgeTierState): BadgeTierState {
  return NEXT_TIER[tier]
}

export function badgeXpToNext(record: BadgeProgress): number {
  if (record.tier === 'diamond') return 0
  return Math.max(0, badgeThresholdFor(record.tier) - record.xp)
}

export function badgeProgressRatio(record: BadgeProgress): number {
  if (record.tier === 'diamond') return 1
  const need = badgeThresholdFor(record.tier)
  return need > 0 ? Math.min(1, record.xp / need) : 1
}

export function badgeEffectText(id: string, tier: BadgeTierState): string {
  const badge = BADGE_BY_ID.get(id as BadgeId)
  if (!badge) return ''
  if (tier === 'locked') return 'UNLOCK TO ACTIVATE'
  return badge.effect(badgeTierPower(tier))
}

export function equippedBadgeRecords(
  progress: Record<string, ArtistProgress> | undefined,
  artistId: string,
): Array<{ id: BadgeId; record: BadgeProgress; tier: BadgeTierState }> {
  const entry = progress?.[artistId]
  const records = normalizeBadgeRecords(entry?.badges)
  const loadout = sanitizeBadgeLoadout(entry?.badgeLoadout, records)
  return loadout.map((id) => ({
    id: id as BadgeId,
    record: records[id] ?? emptyBadgeProgress(),
    tier: records[id]?.tier ?? 'locked',
  }))
}

/** Fast lookup used by the battle engine. Tier power is 0 for locked and 1–5 otherwise. */
export function equippedBadgeTiers(
  progress: Record<string, ArtistProgress> | undefined,
  artistId: string,
): Partial<Record<BadgeId, number>> {
  const tiers: Partial<Record<BadgeId, number>> = {}
  for (const { id, tier } of equippedBadgeRecords(progress, artistId)) {
    tiers[id] = badgeTierPower(tier)
  }
  return tiers
}

export interface BadgeMatchCard {
  uses?: number
  damage?: number
  healing?: number
  prevented?: number
  kos?: number
  assists?: number
  elementalUses?: number
  attacks?: number
  encores?: number
  features?: number
}

export interface BadgeUnlockNotice {
  id: string
  artistId: string
  badgeId: BadgeId
  tier: BadgeTier
}

export interface BadgeAwardUpdate {
  artistId: string
  badges: Record<string, BadgeProgress>
  badgeLoadout: string[]
}

export interface BadgeAwardResult {
  progress: Record<string, ArtistProgress>
  updates: Record<string, BadgeAwardUpdate>
  notices: BadgeUnlockNotice[]
}

function addBadgeXp(
  record: BadgeProgress,
  gain: number,
): { record: BadgeProgress; crossed: BadgeTier[] } {
  let tier = record.tier
  let xp = record.xp
  let totalXp = record.totalXp
  const crossed: BadgeTier[] = []

  if (tier === 'diamond') {
    return { record: { tier, xp: 0, totalXp: totalXp + gain }, crossed }
  }

  xp += gain
  totalXp += gain
  while (tier !== 'diamond') {
    const need = badgeThresholdFor(tier)
    if (need <= 0 || xp < need) break
    xp -= need
    tier = NEXT_TIER[tier] as BadgeTier
    crossed.push(tier)
  }
  if (tier === 'diamond') xp = 0
  return { record: { tier, xp, totalXp }, crossed }
}

/**
 * Awards XP only for the actions that match each badge. A card receives one
 * separate pool per badge, so a Diamond Guardian cannot be bought with KOs.
 */
export function awardBadgeXp(
  progress: Record<string, ArtistProgress>,
  plays: Record<string, number>,
  won: boolean,
  cards: Record<string, BadgeMatchCard> = {},
): BadgeAwardResult {
  const updates: Record<string, BadgeAwardUpdate> = {}
  const notices: BadgeUnlockNotice[] = []
  const ids = new Set([...Object.keys(plays), ...Object.keys(cards)])

  for (const artistId of ids) {
    const card = cards[artistId] ?? {}
    const uses = Math.max(0, Math.round(card.uses ?? plays[artistId] ?? 0))
    const matches = uses > 0 || Boolean(plays[artistId])
    const performance = {
      uses,
      damage: Math.max(0, Math.round(card.damage ?? 0)),
      healing: Math.max(0, Math.round(card.healing ?? 0)),
      prevented: Math.max(0, Math.round(card.prevented ?? 0)),
      kos: Math.max(0, Math.round(card.kos ?? 0)),
      assists: Math.max(0, Math.round(card.assists ?? 0)),
      elementalUses: Math.max(0, Math.round(card.elementalUses ?? 0)),
      attacks: Math.max(0, Math.round(card.attacks ?? 0)),
      encores: Math.max(0, Math.round(card.encores ?? 0)),
      features: Math.max(0, Math.round(card.features ?? 0)),
    }

    const gains: Partial<Record<BadgeId, number>> = {
      headliner: won ? 1_200 + uses * 40 : matches ? 350 + uses * 30 : 0,
      executioner: performance.kos * 900,
      guardian: performance.prevented * 70,
      medic: performance.healing * 110,
      elementalist: performance.elementalUses * 500,
      momentum: performance.attacks * 280,
      closer: performance.damage * 22,
      encore: performance.encores * 1_000 + performance.features * 600,
      assist: performance.assists * 800,
      veteran: matches ? 500 + performance.uses * 80 : 0,
    }

    if (!Object.values(gains).some((gain) => gain > 0)) continue

    const current = progress[artistId] ?? { xp: 0, level: 1 }
    const badges = normalizeBadgeRecords(current.badges)
    for (const badge of BADGE_CATALOG) {
      const gain = gains[badge.id] ?? 0
      if (gain <= 0) continue
      const previous = badges[badge.id] ?? emptyBadgeProgress()
      const result = addBadgeXp(previous, gain)
      badges[badge.id] = result.record
      for (const tier of result.crossed) {
        notices.push({
          id: `${artistId}-${badge.id}-${tier}-${Date.now()}-${notices.length}`,
          artistId,
          badgeId: badge.id,
          tier,
        })
      }
    }

    updates[artistId] = {
      artistId,
      badges,
      badgeLoadout: sanitizeBadgeLoadout(current.badgeLoadout, badges),
    }
  }

  const next = { ...progress }
  for (const [artistId, update] of Object.entries(updates)) {
    next[artistId] = {
      ...(next[artistId] ?? { xp: 0, level: 1 }),
      badges: update.badges,
      badgeLoadout: update.badgeLoadout,
    }
  }
  return { progress: next, updates, notices }
}

export function applyBadgeUpdates(
  progress: Record<string, ArtistProgress>,
  updates: Record<string, BadgeAwardUpdate>,
): Record<string, ArtistProgress> {
  const next = { ...progress }
  for (const [artistId, update] of Object.entries(updates)) {
    next[artistId] = {
      ...(next[artistId] ?? { xp: 0, level: 1 }),
      badges: update.badges,
      badgeLoadout: update.badgeLoadout,
    }
  }
  return next
}

export function badgeProgramSummary(progress: Record<string, ArtistProgress> | undefined): {
  totalXp: number
  tiers: number
  unlocked: number
  maxed: number
} {
  let totalXp = 0
  let tiers = 0
  let unlocked = 0
  let maxed = 0
  for (const entry of Object.values(progress ?? {})) {
    for (const record of Object.values(normalizeBadgeRecords(entry.badges))) {
      totalXp += record.totalXp
      if (record.tier !== 'locked') {
        unlocked += 1
        tiers += badgeTierPower(record.tier)
      }
      if (record.tier === 'diamond') maxed += 1
    }
  }
  return { totalXp, tiers, unlocked, maxed }
}

export function badgeScore(progress: Record<string, ArtistProgress> | undefined): number {
  const summary = badgeProgramSummary(progress)
  return summary.tiers * 120 + Math.floor(summary.totalXp / 100)
}
