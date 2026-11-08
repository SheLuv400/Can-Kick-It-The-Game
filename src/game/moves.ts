import type {
  Artist,
  ArtistProgress,
  Element,
  Move,
  MoveEffect,
  MoveTarget,
  MoveType,
} from './types'
import { ARTISTS, getArtist } from './roster'

export const ELEMENT_ORDER: Element[] = [
  'FIRE',
  'POISON',
  'ICE',
  'ELECTRICITY',
  'WIND',
  'EARTH',
  'WATER',
  'LIGHT',
]

export const ELEMENT_META: Record<
  Element,
  { label: string; icon: string; color: string; theme: string; moveName: string }
> = {
  FIRE: { label: 'FIRE', icon: '🔥', color: '#ff6a2a', theme: 'Lyrical heat and aggressive bars', moveName: 'SHARP BARS' },
  POISON: { label: 'POISON', icon: '☣', color: '#a6e22e', theme: 'A hook that gets under the skin', moveName: 'POISON HOOK' },
  ICE: { label: 'ICE', icon: '❄', color: '#7fdcff', theme: 'Cold-blooded vocals and frozen timing', moveName: 'COLD NOTE' },
  ELECTRICITY: { label: 'ELECTRICITY', icon: 'ϟ', color: '#ffe14d', theme: 'High-voltage rap and electric hooks', moveName: 'VOLTAGE VERSE' },
  WIND: { label: 'WIND', icon: '≋', color: '#8fffc4', theme: 'Rapid flow and fluid breath control', moveName: 'WHIRLWIND FLOW' },
  EARTH: { label: 'EARTH', icon: '▲', color: '#d3a76a', theme: 'Weight, bass and a foundation that holds', moveName: 'GROUND SHAKE' },
  WATER: { label: 'WATER', icon: '◉', color: '#67b7ff', theme: 'Tidal melodies that wear the room down', moveName: 'TIDAL FLOW' },
  LIGHT: { label: 'LIGHT', icon: '✶', color: '#fff0b0', theme: 'A halo of stage light and pure presence', moveName: 'HALO VERSE' },
}

export const MAX_EQUIPPED_MOVES = 3
/** Every player card can be ground all the way to 400. */
export const MAX_CARD_LEVEL = 400
/** Mastery moves stop unlocking at level 10, but card levels continue to 400. */
export const MAX_MOVE_LEVEL = 10

const ATTACK_MOVE_TYPES = new Set<MoveType>(['attack', 'elemental', 'special'])

/** Attacks are free. Hype is reserved for summoning, the Crate and Backstage. */
export function isAttackMove(move: Move): boolean {
  return ATTACK_MOVE_TYPES.has(move.type)
}

export function moveHypeCost(move: Move): number {
  return isAttackMove(move) ? 0 : Math.max(0, move.cost)
}

/** Big attacks close the turn; the battle engine also checks resolved damage. */
export function moveEndsTurn(move: Move): boolean {
  return Boolean(move.endsTurn || (isAttackMove(move) && move.power >= 7))
}
export const XP_PER_LEVEL = 100
export const SPECIAL_CHARGE_MAX = 3
export const SPECIAL_UNLOCK_LEVEL = 5

const DEFAULT_ELEMENT: Record<string, Element> = {
  'krown-vandal': 'FIRE',
  'bishop-brake': 'ICE',
  'macko-deville': 'FIRE',
  'cipher-jones': 'ELECTRICITY',
  'nikki-noize': 'FIRE',
  'taj-omen': 'WATER',
  'rook-havoc': 'EARTH',
  'casso-royale': 'LIGHT',
  'vexa-volt': 'ELECTRICITY',
  'stray-saint': 'WIND',
  'amara-afterglow': 'LIGHT',
  'kyro-silk': 'WATER',
  'sable-monroe': 'ICE',
  'liv-orchid': 'POISON',
  'saint-velvet': 'LIGHT',
  'renee-blue': 'ICE',
  'juno-maison': 'EARTH',
  'darielle-dawn': 'FIRE',
  'pixel-cherry': 'POISON',
  'ziggy-stereo': 'WIND',
  'lola-laser': 'ELECTRICITY',
  'rio-sparks': 'FIRE',
  'nova-candy': 'LIGHT',
  'orbit-lane': 'WIND',
  'echo-glass': 'WATER',
  'tangerine-lux': 'EARTH',
  'rico-varela': 'FIRE',
  'kenji-vale': 'ELECTRICITY',
  'omar-kairo': 'WATER',
  'sefa-kamanzi': 'LIGHT',
  'luka-dragan': 'ICE',
  'thiago-flux': 'FIRE',
  'sione-tua': 'EARTH',
  'arjun-slate': 'WIND',
  'miyah-rouge': 'POISON',
  'zuri-mare': 'WATER',
  'selene-lux': 'ELECTRICITY',
  'yuna-sol': 'LIGHT',
  'nia-kembe': 'EARTH',
  'celine-amour': 'WIND',
  'marisol-vane': 'FIRE',
  'soraya-nazeem': 'ICE',
  'marcus-neon': 'LIGHT',
  'daichi-tempo': 'ELECTRICITY',
  'kofi-starling': 'EARTH',
  'tiago-voss': 'FIRE',
  'liora-prism': 'LIGHT',
  'solana-vega': 'FIRE',
  'eloise-static': 'ICE',
  'anika-voltage': 'ELECTRICITY',
}

const NAME_POOLS: Record<
  Artist['genre'],
  { basic: string[]; heavy: string[]; guard: string[]; utility: string[] }
> = {
  'HIP-HOP': {
    basic: ['HEAVY TALK', 'PRESSURE BARS', 'CONCRETE FLOW', 'POCKET RAP', 'COLD OPEN', 'BLOCK VERSE', 'LAST WORD', 'CROWD CONTROL'],
    heavy: ['BODY THE BEAT', 'BASEMENT SERMON', 'CROWN HOLD', 'IRON LUNG', 'NO HOOK', 'BREAK THE STAGE', 'CHECK THE MIC', 'HEAVY CROWN'],
    guard: ['BIG BODY GUARD', 'HOLD THE LINE', 'BLOCK PARTY', 'BODYGUARD BARS', 'STAGE WALL', 'NO ENTRY', 'SHIELD THE SET', 'BRACE THE ROOM'],
    utility: ['PINE GREEN HYPE', 'BANDWIDTH', 'MIXTAPE BOOST', 'LOUDER', 'STREET TEAM', 'HYPE MAN', 'CROWD SURGE', 'RERACK'],
  },
  'R&B': {
    basic: ['VELVET NOTE', 'SLOW BURN', 'SILK PRESSURE', 'AFTERGLOW', 'SOFT TOUCH', 'NIGHT CALL', 'HONEY VERSE', 'LOW LIGHT'],
    heavy: ['MIDNIGHT RUN', 'VELOUR CRESCENDO', 'SLOW KILL', 'SILK HAMMER', 'BLUE HOUR', 'LAST DANCE', 'DEEP CUT', 'BODY AND SOUL'],
    guard: ['VELVET GUARD', 'SILK SHIELD', 'HOLD ME CLOSE', 'CANDLELIGHT', 'SOFT ARMOR', 'WARM ROOM', 'COMFORT ZONE', 'BLANKET FORT'],
    utility: ['AFTER HOURS', 'BODYGUARD BALLAD', 'WARMTH', 'SLOW BURN BOOST', 'HEARTSTRINGS', 'ROOM SERVICE', 'ENCORE GLOW', 'GENTLE PRESSURE'],
  },
  POP: {
    basic: ['MAIN POP DROP', 'GLITTER BOMB', 'CHROME CHORUS', 'CANDY RUSH', 'STARBURST', 'SUGAR RUSH', 'NEON HOOK', 'POP PRESSURE'],
    heavy: ['HEADLINE HIT', 'STADIUM SIZE', 'SUPERNOVA', 'MAX VOLUME', 'CHORUS CANNON', 'LIGHTS OUT', 'TOTAL ECLIPSE', 'CROWD POP'],
    guard: ['BUBBLE SHIELD', 'STAGE ARMOR', 'GLASS GUARD', 'SPARKLE WALL', 'CHROME UMBRELLA', 'FAN WALL', 'HOLO GUARD', 'PRISM SHIELD'],
    utility: ['STAGE LIGHT', 'HYPE CHORUS', 'FAN CAMPAIGN', 'CROWD WAVE', 'GLOW UP', 'SPOTLIGHT', 'TICKER TAPE', 'CONFETTI'],
  },
}

const ELEMENT_EFFECTS: Record<
  Element,
  { effects: MoveEffect[]; description: string; target: MoveTarget }
> = {
  FIRE: {
    effects: [{ status: 'burn', statusValue: 2, statusTurns: 2 }],
    description: 'Deal damage and apply Burn for 2 turns.',
    target: 'enemy',
  },
  POISON: {
    effects: [{ status: 'poison', statusValue: 2, statusTurns: 3 }],
    description: 'Deal damage and apply Poison for 3 turns.',
    target: 'enemy',
  },
  ICE: {
    effects: [{ status: 'chill', statusValue: 2, statusTurns: 2 }],
    description: 'Deal damage and reduce the target’s next attack by 2.',
    target: 'enemy',
  },
  ELECTRICITY: {
    effects: [{ drainHype: 2, status: 'weaken', statusValue: 1, statusTurns: 2 }],
    description: 'Deal damage, drain 2 Hype and weaken the target’s next attack.',
    target: 'enemy',
  },
  WIND: {
    effects: [{ hits: 1, crowd: 1 }],
    description: 'Deal damage to the target and 1 more enemy, plus 1 crowd pressure.',
    target: 'enemy',
  },
  EARTH: {
    effects: [{ shield: 3, buffDefense: 1, status: 'fortify', statusValue: 1, statusTurns: 2 }],
    description: 'Deal damage and grant the performer 3 Shield HP and +1 Defense.',
    target: 'enemy',
  },
  WATER: {
    effects: [{ heal: 3, cleanse: true }],
    description: 'Deal damage and restore 3 HP to the performer, cleansing status effects.',
    target: 'enemy',
  },
  LIGHT: {
    effects: [{ shield: 2, status: 'light', statusValue: 1, statusTurns: 2 }],
    description: 'Deal damage and wrap the performer in 2 Shield HP and stage light.',
    target: 'enemy',
  },
}

const ELEMENT_MOVE_NAMES: Record<Element, string> = {
  FIRE: 'SHARP BARS',
  POISON: 'POISON HOOK',
  ICE: 'COLD NOTE',
  ELECTRICITY: 'VOLTAGE VERSE',
  WIND: 'WHIRLWIND FLOW',
  EARTH: 'GROUND SHAKE',
  WATER: 'TIDAL FLOW',
  LIGHT: 'HALO VERSE',
}

export interface ElementMoveProfile {
  name: string
  effects: MoveEffect[]
  description: string
  target: MoveTarget
}

/** Shared elemental cut data for generated cards and the personal career artist. */
export function elementMoveProfile(element: Element): ElementMoveProfile {
  const signature = ELEMENT_EFFECTS[element]
  return {
    name: ELEMENT_MOVE_NAMES[element],
    effects: signature.effects,
    description: signature.description,
    target: signature.target,
  }
}

/** The mastery attack is named after the artist's elemental lane. */
const ELEMENT_ATTACK_NAMES: Record<Element, string> = {
  FIRE: 'FLAMING MIC',
  POISON: 'VENOM HOOK',
  ICE: 'SNOWFALL FLOW',
  ELECTRICITY: 'LIVE-WIRE MIC',
  WIND: 'CYCLONE VERSE',
  EARTH: 'BASS QUAKE',
  WATER: 'TIDAL MIC',
  LIGHT: 'HALO OVERDRIVE',
}

const SPECIAL_NAMES: Record<Element, string> = {
  FIRE: 'INFERNO ENCORE',
  POISON: 'TOXIC CURTAIN CALL',
  ICE: 'BLIZZARD FINALE',
  ELECTRICITY: 'BLACKOUT OVERDRIVE',
  WIND: 'HURRICANE FLOW',
  EARTH: 'LOW-END QUAKE',
  WATER: 'TIDAL TAKEOVER',
  LIGHT: 'HALO FINALE',
}

function elementFor(artist: Artist): Element {
  return DEFAULT_ELEMENT[artist.id] ?? ELEMENT_ORDER[(artist.number - 1) % ELEMENT_ORDER.length]
}

function makeMove(
  artist: Artist,
  index: number,
  name: string,
  type: MoveType,
  element: Element | null,
  cost: number,
  power: number,
  target: MoveTarget,
  description: string,
  effects: MoveEffect[] = [],
  pierce = 0,
  unlockLevel = 1,
  special = false,
): Move {
  const attackLike = ATTACK_MOVE_TYPES.has(type)
  return {
    id: `${artist.id}-move-${index}`,
    artistId: artist.id,
    name,
    type,
    element,
    cost: attackLike ? 0 : cost,
    power,
    target,
    description,
    effects,
    ...(pierce > 0 ? { pierce } : {}),
    ...(unlockLevel > 1 ? { unlockLevel } : {}),
    ...(special ? { special: true } : {}),
    ...(attackLike && power >= 7 ? { endsTurn: true } : {}),
  }
}

function buildMoves(artist: Artist): Move[] {
  const pool = NAME_POOLS[artist.genre]
  const pick = (names: string[], offset = 0) => names[(artist.number + offset) % names.length]
  const element = elementFor(artist)
  const signature = ELEMENT_EFFECTS[element]
  const basePower = 3 + Math.floor(artist.bars / 2)
  const heavyPower = 5 + artist.bars
  const elementalPower = 2 + Math.ceil(artist.bars / 3)

  const basic = makeMove(
    artist,
    0,
    pick(pool.basic),
    'attack',
    null,
    2,
    basePower,
    'enemy',
    `Deal ${basePower} damage to one enemy artist.`,
    [{ damage: basePower }],
  )

  const heavy = makeMove(
    artist,
    1,
    pick(pool.heavy),
    'attack',
    null,
    4,
    heavyPower,
    'enemy',
    `A heavy ${artist.genre} performance. Deal ${heavyPower} damage.`,
    [{ damage: heavyPower }],
  )

  const elemental = makeMove(
    artist,
    2,
    element === 'FIRE' && artist.id === 'macko-deville' ? 'SHARP BARS' : ELEMENT_MOVE_NAMES[element],
    'elemental',
    element,
    3,
    elementalPower,
    signature.target,
    signature.description,
    [{ damage: elementalPower }, ...signature.effects],
  )

  const guardValue = artist.genre === 'R&B' ? 5 : artist.genre === 'POP' ? 3 : 4
  const guard = makeMove(
    artist,
    3,
    pick(pool.guard, 2),
    artist.genre === 'R&B' ? 'healing' : 'shield',
    null,
    3,
    guardValue,
    'ally',
    artist.genre === 'R&B'
      ? `Restore ${guardValue} HP to one ally.`
      : `Grant ${guardValue} temporary Shield HP to one ally.`,
    [artist.genre === 'R&B' ? { heal: guardValue } : { shield: guardValue }],
  )

  const utility = makeMove(
    artist,
    4,
    pick(pool.utility, 4),
    artist.genre === 'R&B' ? 'healing' : 'buff',
    null,
    2,
    0,
    artist.genre === 'R&B' ? 'ally' : 'self',
    artist.genre === 'R&B'
      ? 'Restore 3 HP and cleanse one ally’s status effects.'
      : artist.genre === 'POP'
        ? 'Gain +2 Hype and +1 attack on the next move.'
        : 'Gain +2 attack on the next move and +1 Hype.',
    artist.genre === 'R&B'
      ? [{ heal: 3, cleanse: true }]
      : artist.genre === 'POP'
        ? [{ hype: 2, buffAttack: 1 }]
        : [{ buffAttack: 2, hype: 1 }],
  )

  return [basic, heavy, elemental, guard, utility]
}

function artistPrefix(artist: Artist): string {
  return artist.name.split(' ')[0].toUpperCase()
}

function masteryName(artist: Artist, suffix: string): string {
  return `${artistPrefix(artist)} · ${suffix}`
}

/**
 * Ten additional mastery moves per artist. They are intentionally generated from the
 * artist's bars, genre and element so every unlock still feels like that performer.
 */
function buildAdvancedMoves(artist: Artist): Move[] {
  const element = elementFor(artist)
  const burstPower = 2 + Math.ceil(artist.bars / 2)
  const flowPower = 2 + Math.floor(artist.bars / 3) + (artist.genre === 'HIP-HOP' ? 1 : 0)
  const hookHeal = 4 + Math.ceil(artist.bars / 3) + (artist.genre === 'R&B' ? 1 : 0)
  const armor = 5 + Math.floor(artist.bars / 3) + (artist.genre === 'POP' ? 1 : 0)
  const crowd = 2 + Math.floor(artist.bars / 4)
  const feedbackPower = 3 + Math.floor(artist.bars / 3)
  const pressurePower = 6 + Math.floor(artist.bars / 2)
  const finisherPower = 7 + artist.bars
  const signatureEffects = ELEMENT_EFFECTS[element].effects

  return [
    makeMove(
      artist,
      5,
      masteryName(artist, ELEMENT_ATTACK_NAMES[element]),
      'elemental',
      element,
      3,
      burstPower,
      'enemy',
      `Deal ${burstPower} damage and leave the ${element.toLowerCase()} signature on the target.`,
      [{ damage: burstPower }, ...signatureEffects],
      0,
      2,
    ),
    makeMove(
      artist,
      6,
      masteryName(artist, 'TRIPLE FLOW'),
      'attack',
      null,
      3,
      flowPower,
      'enemy',
      `Three quick passes for ${flowPower} damage each, with the follow-ups landing lighter.`,
      [{ damage: flowPower }, { strikes: 3 }],
      0,
      3,
    ),
    makeMove(
      artist,
      7,
      masteryName(artist, 'HOOK DOCTOR'),
      'healing',
      null,
      3,
      0,
      'ally',
      `Restore ${hookHeal} HP to an ally and cleanse their status effects.`,
      [{ heal: hookHeal, cleanse: true }],
      0,
      4,
    ),
    makeMove(
      artist,
      8,
      masteryName(artist, 'STAGE ARMOR'),
      'shield',
      null,
      4,
      0,
      'ally',
      `Grant ${armor} Shield HP and Guard for 2 turns.`,
      [{ shield: armor, status: 'fortify', statusValue: 2, statusTurns: 2 }],
      0,
      5,
    ),
    makeMove(
      artist,
      9,
      masteryName(artist, 'CROWD SURF'),
      'support',
      null,
      2,
      0,
      'none',
      `Deal ${crowd} crowd pressure, gain +1 Hype and restore 2 Crowd.`,
      [{ crowd, hype: 1, crowdHeal: 2 }],
      0,
      6,
    ),
    makeMove(
      artist,
      10,
      masteryName(artist, 'FEEDBACK LOOP'),
      'debuff',
      null,
      4,
      feedbackPower,
      'enemy',
      `Deal ${feedbackPower} damage, drain 2 Hype and weaken the target’s next attack.`,
      [
        { damage: feedbackPower },
        { drainHype: 2 },
        { status: 'weaken', statusValue: 2, statusTurns: 2 },
      ],
      0,
      7,
    ),
    makeMove(
      artist,
      11,
      masteryName(artist, 'HYPE RUN'),
      'buff',
      null,
      2,
      0,
      'self',
      'Gain +2 attack on the next move, +2 Hype and 2 Shield HP.',
      [{ buffAttack: 2, hype: 2, shield: 2 }],
      0,
      8,
    ),
    makeMove(
      artist,
      12,
      masteryName(artist, 'ENCORE PRESSURE'),
      'attack',
      null,
      5,
      pressurePower,
      'enemy',
      `Deal ${pressurePower} damage, add 2 crowd pressure and pierce 20% of DEF.`,
      [{ damage: pressurePower }, { crowd: 2 }],
      0.2,
      9,
    ),
    makeMove(
      artist,
      13,
      masteryName(artist, 'SOLD-OUT FINISH'),
      'attack',
      null,
      6,
      finisherPower,
      'enemy',
      `A two-part finish for ${finisherPower} damage plus 3 crowd pressure.`,
      [{ damage: finisherPower }, { crowd: 3 }, { strikes: 2 }],
      0.25,
      10,
    ),
    makeMove(
      artist,
      14,
      masteryName(artist, 'MASTER CLASS'),
      'support',
      null,
      4,
      0,
      'ally',
      'Restore 5 HP, grant 5 Shield HP, cleanse statuses and gain +1 Hype.',
      [{ heal: 5, shield: 5, cleanse: true, hype: 1 }],
      0,
      10,
    ),
  ]
}

function buildSpecialMove(artist: Artist): Move {
  const element = elementFor(artist)
  const power = 8 + Math.ceil(artist.bars * 0.9) + (artist.genre === 'HIP-HOP' ? 1 : 0)
  const signatureStatus = ELEMENT_EFFECTS[element].effects.find((effect) => effect.status)
  return makeMove(
    artist,
    15,
    `${artist.name.toUpperCase()} · ${SPECIAL_NAMES[element]}`,
    'special',
    element,
    7,
    power,
    'enemy',
    `Signature special: spend 3 Spotlight for ${power} damage, 3 crowd pressure and a second wave. It closes your turn.`,
    [
      { damage: power },
      { crowd: 3 },
      { strikes: 2 },
      ...(signatureStatus ? [signatureStatus] : []),
    ],
    0.3,
    SPECIAL_UNLOCK_LEVEL,
    true,
  )
}

const MACKO_MOVES: Move[] = [
  makeMove(
    getArtist('macko-deville'),
    0,
    'HEAVY TALK',
    'attack',
    null,
    3,
    5,
    'enemy',
    'Deal 5 damage to a selected enemy artist before damage mitigation.',
    [{ damage: 5 }],
  ),
  makeMove(
    getArtist('macko-deville'),
    2,
    'SHARP BARS',
    'elemental',
    'FIRE',
    4,
    3,
    'enemy',
    'Deal 3 damage and apply Burn for 2 turns.',
    [{ damage: 3, status: 'burn', statusValue: 2, statusTurns: 2 }],
  ),
  makeMove(
    getArtist('macko-deville'),
    3,
    'BIG BODY GUARD',
    'shield',
    null,
    3,
    5,
    'ally',
    'Grant 5 temporary Shield HP to an eligible artist.',
    [{ shield: 5 }],
  ),
  makeMove(
    getArtist('macko-deville'),
    1,
    'VELOUR PRESSURE',
    'attack',
    null,
    4,
    8,
    'enemy',
    'A slow, heavy Velour Night hit. Deal 8 damage.',
    [{ damage: 8 }],
  ),
  makeMove(
    getArtist('macko-deville'),
    4,
    'PINE GREEN HYPE',
    'buff',
    null,
    2,
    0,
    'self',
    'Gain +2 attack on the next move and +1 Hype.',
    [{ buffAttack: 2, hype: 1 }],
  ),
]

interface SignatureMoveSpec {
  name: string
  type: MoveType
  cost: number
  power: number
  target: MoveTarget
  description: string
  effects: MoveEffect[]
  pierce?: number
}

const SIGNATURE_MOVES: Record<string, SignatureMoveSpec[]> = {
  'miyah-rouge': [
    { name: 'VELVET CONFESSIONS', type: 'healing', cost: 3, power: 0, target: 'self', description: 'Restore 6 HP to Miyah Rouge.', effects: [{ heal: 6 }] },
    { name: 'DON’T CALL AFTER MIDNIGHT', type: 'debuff', cost: 4, power: 0, target: 'enemy', description: 'Weaken the target’s next attack by 3.', effects: [{ status: 'weaken', statusValue: 3, statusTurns: 2 }] },
    { name: 'BURGUNDY NIGHTS', type: 'attack', cost: 5, power: 11, target: 'enemy', description: 'Heavy R&B damage. Deal 11 damage.', effects: [{ damage: 11 }] },
  ],
  'zuri-mare': [
    { name: 'ISLAND FEVER', type: 'attack', cost: 3, power: 6, target: 'enemy', description: 'Deal 6 damage and refund 2 Hype.', effects: [{ damage: 6 }, { hype: 2 }] },
    { name: 'SWEET LIKE SUGARCANE', type: 'support', cost: 4, power: 0, target: 'self', description: 'Restore 8 Crowd.', effects: [{ crowdHeal: 8 }] },
    { name: 'DANCEHALL LOVE LETTER', type: 'attack', cost: 5, power: 10, target: 'enemy', description: 'A strong performance attack. Deal 10 damage.', effects: [{ damage: 10 }] },
  ],
  'selene-lux': [
    { name: 'FLASHING LIGHTS', type: 'attack', cost: 3, power: 6, target: 'enemy', description: 'A quick attack. Deal 6 damage.', effects: [{ damage: 6 }] },
    { name: 'ELECTRIC HEART', type: 'attack', cost: 4, power: 7, target: 'enemy', description: 'Deal 7 damage and gain Guard for 2 turns.', effects: [{ damage: 7 }, { status: 'fortify', statusValue: 2, statusTurns: 2 }] },
    { name: 'MIDNIGHT FREQUENCY', type: 'attack', cost: 6, power: 12, target: 'enemy', description: 'A high-impact performance. Deal 12 damage.', effects: [{ damage: 12 }] },
  ],
  'yuna-sol': [
    { name: 'SEOUL AFTER HOURS', type: 'healing', cost: 3, power: 0, target: 'self', description: 'Restore 7 HP to Yuna Sol.', effects: [{ heal: 7 }] },
    { name: 'SILHOUETTE', type: 'shield', cost: 4, power: 0, target: 'self', description: 'Add Guard for 2 turns.', effects: [{ status: 'fortify', statusValue: 3, statusTurns: 2 }] },
    { name: 'MOONLIGHT LETTERS', type: 'attack', cost: 5, power: 9, target: 'enemy', description: 'Deal 9 damage and weaken the target’s next attack.', effects: [{ damage: 9 }, { status: 'weaken', statusValue: 3, statusTurns: 2 }] },
  ],
  'nia-kembe': [
    { name: 'GOLDEN ROOTS', type: 'support', cost: 3, power: 0, target: 'self', description: 'Restore 8 Crowd.', effects: [{ crowdHeal: 8 }] },
    { name: 'MOTHERLAND MELODY', type: 'buff', cost: 4, power: 0, target: 'self', description: 'Strengthen defense by 2 and gain Guard for 2 turns.', effects: [{ buffDefense: 2, status: 'fortify', statusValue: 1, statusTurns: 2 }] },
    { name: 'SPIRIT DON’T BREAK', type: 'attack', cost: 6, power: 12, target: 'enemy', description: 'A powerful vocal attack. Deal 12 damage.', effects: [{ damage: 12 }] },
  ],
  'celine-amour': [
    { name: 'PARIS AFTER MIDNIGHT', type: 'healing', cost: 3, power: 0, target: 'ally', description: 'Heal an artist for 6 HP.', effects: [{ heal: 6 }] },
    { name: 'MON CHERI', type: 'debuff', cost: 4, power: 0, target: 'enemy', description: 'Weaken an opposing artist’s next attack by 3.', effects: [{ status: 'weaken', statusValue: 3, statusTurns: 2 }] },
    { name: 'LOVE IN TRANSLATION', type: 'attack', cost: 5, power: 9, target: 'enemy', description: 'Deal 9 damage and refund 2 Hype.', effects: [{ damage: 9 }, { hype: 2 }] },
  ],
  'marisol-vane': [
    { name: 'FUEGO EN MI CORAZÓN', type: 'attack', cost: 3, power: 7, target: 'enemy', description: 'Direct damage. Deal 7 damage.', effects: [{ damage: 7 }] },
    { name: 'NO ME LLAMES', type: 'debuff', cost: 4, power: 0, target: 'enemy', description: 'Weaken an opposing artist’s next attack by 3.', effects: [{ status: 'weaken', statusValue: 3, statusTurns: 2 }] },
    { name: 'BURNING ROSES', type: 'attack', cost: 6, power: 10, target: 'enemy', description: 'Deal 10 damage and pierce 50% of the target’s DEF.', effects: [{ damage: 10 }], pierce: 0.5 },
  ],
  'soraya-nazeem': [
    { name: 'SANDS OF DESIRE', type: 'healing', cost: 3, power: 0, target: 'self', description: 'Restore 7 HP to Soraya Nazeem.', effects: [{ heal: 7 }] },
    { name: 'MIRAGE', type: 'shield', cost: 4, power: 0, target: 'self', description: 'Generate Guard for 2 turns.', effects: [{ status: 'fortify', statusValue: 3, statusTurns: 2 }] },
    { name: 'DIAMOND TEARS', type: 'attack', cost: 6, power: 13, target: 'enemy', description: 'A high-damage cinematic attack. Deal 13 damage.', effects: [{ damage: 13 }] },
  ],
}

function buildSignatureMoves(artist: Artist): Move[] {
  const moves = buildMoves(artist)
  const specs = SIGNATURE_MOVES[artist.id]
  if (!specs) return [...moves, ...buildAdvancedMoves(artist), buildSpecialMove(artist)]
  const slots = [0, 2, 3] as const
  specs.forEach((spec, index) => {
    const slot = slots[index]
    moves[slot] = makeMove(
      artist,
      slot,
      spec.name,
      spec.type,
      elementFor(artist),
      spec.cost,
      spec.power,
      spec.target,
      spec.description,
      spec.effects,
      spec.pierce ?? 0,
    )
  })
  return [...moves, ...buildAdvancedMoves(artist), buildSpecialMove(artist)]
}

export const MOVES_BY_ARTIST: Record<string, Move[]> = Object.fromEntries(
  ARTISTS.map((artist) => [
    artist.id,
    artist.id === 'macko-deville'
      ? [...MACKO_MOVES, ...buildAdvancedMoves(artist), buildSpecialMove(artist)]
      : buildSignatureMoves(artist),
  ]),
)

export const MOVES_BY_ID: Record<string, Move> = Object.fromEntries(
  Object.values(MOVES_BY_ARTIST)
    .flat()
    .map((move) => [move.id, move]),
)

const RUNTIME_MOVES: Record<string, Move[]> = {}
const RUNTIME_MOVES_BY_ID: Record<string, Move> = {}

/** Registers the local career performer's generated move pool. */
export function registerArtistMoves(artistId: string, moves: Move[]) {
  RUNTIME_MOVES[artistId] = moves
  for (const move of moves) RUNTIME_MOVES_BY_ID[move.id] = move
}

export function unregisterArtistMoves(artistId: string) {
  const moves = RUNTIME_MOVES[artistId]
  if (!moves) return
  for (const move of moves) delete RUNTIME_MOVES_BY_ID[move.id]
  delete RUNTIME_MOVES[artistId]
}

export function movesForArtist(artistId: string): Move[] {
  return RUNTIME_MOVES[artistId] ?? MOVES_BY_ARTIST[artistId] ?? MOVES_BY_ARTIST[ARTISTS[0].id]
}

export function moveById(moveId: string): Move | undefined {
  return RUNTIME_MOVES_BY_ID[moveId] ?? MOVES_BY_ID[moveId]
}

export function defaultLoadout(artistId: string): string[] {
  const moves = movesForArtist(artistId)
  const bySlot = (slot: number) => moves.find((move) => move.id.endsWith(`-move-${slot}`))?.id
  return [bySlot(0), bySlot(2), bySlot(3)].filter((id): id is string => Boolean(id))
}

export function moveUnlockLevel(move: Move): number {
  if (move.unlockLevel !== undefined) return move.unlockLevel
  const slot = Number(move.id.split('-move-').pop())
  if (!Number.isFinite(slot)) return 1
  if (slot === 1) return 2
  if (slot === 4) return 3
  return 1
}

export function isMoveUnlocked(move: Move, level: number): boolean {
  return level >= moveUnlockLevel(move)
}

export function specialMoveForArtist(artistId: string): Move | undefined {
  return movesForArtist(artistId).find((move) => move.special)
}

export function levelFromXp(xp: number): number {
  return Math.min(MAX_CARD_LEVEL, 1 + Math.floor(Math.max(0, xp) / XP_PER_LEVEL))
}

export function progressFor(
  progress: Record<string, ArtistProgress> | undefined,
  artistId: string,
): ArtistProgress {
  const found = progress?.[artistId]
  return {
    xp: Math.min(MAX_CARD_LEVEL * XP_PER_LEVEL, Math.max(0, Math.round(found?.xp ?? 0))),
    level: Math.min(MAX_CARD_LEVEL, Math.max(1, Math.round(found?.level ?? 1))),
    loadout: found?.loadout,
    badges: found?.badges ?? {},
    badgeLoadout: found?.badgeLoadout ?? [],
  }
}

export function sanitizeLoadout(artistId: string, loadout: unknown, level = 1): string[] {
  const moves = movesForArtist(artistId)
  const byId = new Set(moves.map((move) => move.id))
  const requested = Array.isArray(loadout)
    ? loadout.filter(
        (id): id is string => {
          if (typeof id !== 'string' || !byId.has(id)) return false
          const move = moves.find((entry) => entry.id === id)!
          return !move.special && isMoveUnlocked(move, Math.max(1, level))
        },
      )
    : []
  const picked = [...new Set(requested)].slice(0, MAX_EQUIPPED_MOVES)
  const fallback = defaultLoadout(artistId)
  for (const id of fallback) {
    if (picked.length >= MAX_EQUIPPED_MOVES) break
    if (!picked.includes(id)) picked.push(id)
  }
  for (const move of moves) {
    if (picked.length >= MAX_EQUIPPED_MOVES) break
    if (!move.special && isMoveUnlocked(move, level) && !picked.includes(move.id)) {
      picked.push(move.id)
    }
  }
  return picked.slice(0, MAX_EQUIPPED_MOVES)
}

export function loadoutFor(
  progress: Record<string, ArtistProgress> | undefined,
  artistId: string,
): string[] {
  const entry = progressFor(progress, artistId)
  return sanitizeLoadout(artistId, entry.loadout, entry.level)
}

export function equippedMoves(
  progress: Record<string, ArtistProgress> | undefined,
  artistId: string,
): Move[] {
  return loadoutFor(progress, artistId)
    .map(moveById)
    .filter((move): move is Move => Boolean(move))
}

export function awardArtistXp(
  progress: Record<string, ArtistProgress>,
  plays: Record<string, number>,
  won: boolean,
  xpMultiplier = 1,
): Record<string, ArtistProgress> {
  const next = { ...progress }
  const multiplier = Number.isFinite(xpMultiplier) ? Math.max(1, xpMultiplier) : 1
  for (const [artistId, count] of Object.entries(plays)) {
    if (!count || !MOVES_BY_ARTIST[artistId]) continue
    const current = progressFor(progress, artistId)
    const baseXp = count * 30 + (won ? 20 : 0)
    const xp = Math.min(MAX_CARD_LEVEL * XP_PER_LEVEL, current.xp + Math.round(baseXp * multiplier))
    next[artistId] = { ...current, xp, level: Math.max(current.level, levelFromXp(xp)) }
  }
  return next
}

/**
 * The first ten card levels use the original stat curve. Every 39 levels after
 * that adds one prestige stat tier, so a high-level master card is stronger without
 * turning normal battles into one-shot maths. Festival CPU cards use the same
 * curve when an event matches the player's card level.
 */
export function battleStatTier(level: number): number {
  const clamped = Math.min(MAX_CARD_LEVEL, Math.max(1, Math.round(level)))
  if (clamped <= MAX_MOVE_LEVEL) return clamped
  return MAX_MOVE_LEVEL + Math.min(10, Math.floor((clamped - MAX_MOVE_LEVEL) / 39))
}

export function battleStatsFor(artist: Artist, level = 1): { hp: number; attack: number; defense: number } {
  const bonusLevel = Math.max(0, battleStatTier(level) - 1)
  return {
    hp: artist.battle.hp + bonusLevel * 2,
    attack: artist.battle.attack + Math.floor(bonusLevel / 2),
    defense: artist.battle.defense + Math.floor(bonusLevel / 3),
  }
}

export function moveTypeLabel(type: MoveType): string {
  switch (type) {
    case 'attack':
      return 'ATTACK'
    case 'healing':
      return 'HEALING'
    case 'shield':
      return 'DEFENSIVE SHIELD'
    case 'elemental':
      return 'ELEMENTAL ATTACK'
    case 'buff':
      return 'BUFF'
    case 'debuff':
      return 'DEBUFF'
    case 'support':
      return 'SUPPORT'
    case 'special':
      return 'SIGNATURE SPECIAL'
  }
}

export const ELEMENT_LIST = ELEMENT_ORDER
