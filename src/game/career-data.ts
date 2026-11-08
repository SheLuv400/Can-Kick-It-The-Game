import type { BadgeId } from './badges'
import type { Artist, Crew, Difficulty, Genre } from './types'
import { ARTISTS, getArtist } from './roster'
import { VENUES, type Venue } from './circuits'

export const CAREER_TITLE = 'FROM THE BASEMENT TO THE BILLBOARD'
export const CAREER_MAX_OVR = 99
export const CAREER_MIN_OVR = 50
/** A normal Prestige run ends at level 55. */
export const CAREER_MIN_LEVEL = 1
export const CAREER_PRESTIGE_MAX_LEVEL = 55
/** After ten full Prestiges the card continues from Master Level 56 to 1,000. */
export const CAREER_MASTER_START_LEVEL = 56
export const CAREER_MAX_LEVEL = 1000
export const CAREER_MAX_PRESTIGE = 10
export const CAREER_PRESTIGE_XP_BONUS = 0.2
export const CAREER_STARTING_AP = 0
export const CAREER_AP_PER_LEVEL = 5
export const CAREER_MAX_AP = 245
export const CAREER_AP_FIRST_CLEAR = 5
export const CAREER_AP_CHAPTER_CLEAR = 10
export const CAREER_MOVE_SLOTS = 3
export const CAREER_STORAGE_KEY = 'ciki.career.v1'
export const CAREER_BACKUP_KEY = 'ciki.career.v1.backup'
export const CAREER_SLOTS_KEY = 'ciki.career.slots.v1'
export const CAREER_SLOTS_BACKUP_KEY = 'ciki.career.slots.v1.backup'
export const CAREER_SLOT_COUNT = 5
export const CAREER_VERSION = 7

export interface CareerReputationTier {
  id: 'unsigned-rookie' | 'underground-buzz' | 'mixtape-prospect' | 'local-headliner' | 'chart-contender' | 'diamond-mic'
  title: string
  short: string
  min: number
  max: number
  blurb: string
  roomLine: string
  unlock: string
  accent: string
}

/** The personal artist's six music-industry development titles. */
export const CAREER_REPUTATION_TIERS: CareerReputationTier[] = [
  {
    id: 'unsigned-rookie',
    title: 'UNSIGNED ROOKIE',
    short: 'ROOKIE',
    min: 50,
    max: 59,
    blurb: 'Raw talent, a first booth and everything to prove.',
    roomLine: 'Everybody starts somewhere. Let’s hear what you got.',
    unlock: 'Basic cuts and the first story rooms',
    accent: '#b9b0a1',
  },
  {
    id: 'underground-buzz',
    title: 'UNDERGROUND BUZZ',
    short: 'BUZZ',
    min: 60,
    max: 69,
    blurb: 'The city has heard the name. The first badge slot opens.',
    roomLine: 'Word travels fast when the room actually listens.',
    unlock: 'First badge slot · intermediate genre cuts',
    accent: '#c7d1d9',
  },
  {
    id: 'mixtape-prospect',
    title: 'MIXTAPE PROSPECT',
    short: 'PROSPECT',
    min: 70,
    max: 79,
    blurb: 'A real following, a second badge slot and better rooms.',
    roomLine: 'Word around the city is that your last set got people talking.',
    unlock: 'Second badge slot · improved attack and support cuts',
    accent: '#f4c84e',
  },
  {
    id: 'local-headliner',
    title: 'LOCAL HEADLINER',
    short: 'HEADLINER',
    min: 80,
    max: 89,
    blurb: 'The poster has your name above the bill. The room expects more.',
    roomLine: 'The crowd came to see you headline tonight.',
    unlock: 'Third badge slot · advanced performance cuts',
    accent: '#c9a8ff',
  },
  {
    id: 'chart-contender',
    title: 'CHART CONTENDER',
    short: 'CONTENDER',
    min: 90,
    max: 94,
    blurb: 'The city is not enough anymore. The charts are listening.',
    roomLine: 'The whole city knows the name now. Do not get comfortable.',
    unlock: 'Fourth badge slot · elite eligible moves',
    accent: '#ffb46b',
  },
  {
    id: 'diamond-mic',
    title: 'DIAMOND MIC LEGEND',
    short: 'LEGEND',
    min: 95,
    max: 99,
    blurb: 'A career built from the basement to the brightest stage.',
    roomLine: 'You built your name from nothing. The microphone belongs to you.',
    unlock: 'Diamond Mic card · fifth badge slot at 99 · signature headline cut',
    accent: '#d8c7ff',
  },
]

export function careerReputationForOvr(ovr: number): CareerReputationTier {
  const value = Math.max(CAREER_MIN_OVR, Math.min(CAREER_MAX_OVR, Math.round(ovr)))
  return CAREER_REPUTATION_TIERS.find((tier) => value >= tier.min && value <= tier.max) ?? CAREER_REPUTATION_TIERS[0]
}

export function careerReputationIndex(ovr: number): number {
  return CAREER_REPUTATION_TIERS.indexOf(careerReputationForOvr(ovr))
}

export type CareerAttributeId =
  | 'bars'
  | 'hooks'
  | 'stagePresence'
  | 'endurance'
  | 'defense'
  | 'chemistry'

export interface CareerAttributeMeta {
  id: CareerAttributeId
  label: string
  short: string
  description: string
  effect: string
}

export const CAREER_ATTRIBUTES: CareerAttributeMeta[] = [
  {
    id: 'bars',
    label: 'BARS',
    short: 'BRS',
    description: 'Lyrical attack craft. Raises personal direct damage and qualifying battle cuts.',
    effect: 'DMG',
  },
  {
    id: 'hooks',
    label: 'HOOKS',
    short: 'HKS',
    description: 'Memorable writing and recovery. Raises eligible healing, hooks and support effects.',
    effect: 'HEAL',
  },
  {
    id: 'stagePresence',
    label: 'STAGE PRESENCE',
    short: 'STG',
    description: 'Command of the room. Raises crowd pressure and stage-performance effects.',
    effect: 'CROWD',
  },
  {
    id: 'endurance',
    label: 'ENDURANCE',
    short: 'END',
    description: 'Stamina for long sets. Raises the personal artist HP pool.',
    effect: 'HP',
  },
  {
    id: 'defense',
    label: 'DEFENSE',
    short: 'DEF',
    description: 'Composure under pressure. Raises shields, guard and defensive effects.',
    effect: 'DEF',
  },
  {
    id: 'chemistry',
    label: 'CHEMISTRY',
    short: 'CHE',
    description: 'Collaboration instinct. Raises Feature Verse and crew collaboration contributions.',
    effect: 'FEAT',
  },
]


export interface CareerOption {
  id: string
  label: string
  color?: string
  unlockChapter?: number
}

export type CareerOptionCategory =
  | 'presentation'
  | 'face'
  | 'skin'
  | 'hair'
  | 'hairColor'
  | 'facialHair'
  | 'facialHairColor'
  | 'top'
  | 'bottoms'
  | 'hat'
  | 'glasses'
  | 'jewelry'
  | 'shoes'

export const CAREER_OPTIONS: Record<CareerOptionCategory, CareerOption[]> = {
  presentation: [
    { id: 'male', label: 'MALE' },
    { id: 'female', label: 'FEMALE' },
  ],
  face: [
    { id: 'male-01', label: 'MALE 01' },
    { id: 'male-02', label: 'MALE 02' },
    { id: 'male-03', label: 'MALE 03' },
    { id: 'male-04', label: 'MALE 04' },
    { id: 'male-05', label: 'MALE 05' },
    { id: 'male-06', label: 'MALE 06' },
    { id: 'female-01', label: 'FEMALE 01' },
    { id: 'female-02', label: 'FEMALE 02' },
    { id: 'female-03', label: 'FEMALE 03' },
    { id: 'female-04', label: 'FEMALE 04' },
    { id: 'female-05', label: 'FEMALE 05' },
    { id: 'female-06', label: 'FEMALE 06' },
  ],
  skin: [
    { id: 'porcelain', label: 'PORCELAIN', color: '#efd0b8' },
    { id: 'sand', label: 'SAND', color: '#dfae82' },
    { id: 'honey', label: 'HONEY', color: '#c98d5f' },
    { id: 'caramel', label: 'CARAMEL', color: '#ae7148' },
    { id: 'chestnut', label: 'CHESTNUT', color: '#7d4b2f' },
    { id: 'deep', label: 'DEEP', color: '#4a2a1c' },
  ],
  hair: [
    { id: 'male-01', label: 'SHORT TWISTS' },
    { id: 'male-02', label: 'BUZZ CUT' },
    { id: 'male-03', label: 'AFRO' },
    { id: 'male-04', label: 'LONG BRAIDS' },
    { id: 'male-05', label: 'SPIKY TWISTS' },
    { id: 'male-06', label: 'CORNROWS' },
    { id: 'female-01', label: 'TOP BUN' },
    { id: 'female-02', label: 'LONG WAVES' },
    { id: 'female-03', label: 'BRAIDED UPDO' },
    { id: 'female-04', label: 'AFRO' },
    { id: 'female-05', label: 'SLEEK BOB' },
    { id: 'female-06', label: 'LONG BRAIDS' },
  ],
  hairColor: [
    { id: 'black', label: 'BLACK', color: '#171313' },
    { id: 'espresso', label: 'ESPRESSO', color: '#3b241a' },
    { id: 'burgundy', label: 'BURGUNDY', color: '#6d1f36' },
    { id: 'honey', label: 'HONEY', color: '#b77a38' },
    { id: 'platinum', label: 'PLATINUM', color: '#e7dcc8' },
    { id: 'cobalt', label: 'COBALT', color: '#2d4f90', unlockChapter: 7 },
  ],
  facialHair: [
    { id: 'none', label: 'NONE' },
    { id: 'shadow', label: 'SHADOW' },
    { id: 'goatee', label: 'GOATEE' },
    { id: 'beard', label: 'FULL BEARD' },
    { id: 'mustache', label: 'MUSTACHE' },
  ],
  facialHairColor: [
    { id: 'black', label: 'BLACK', color: '#171313' },
    { id: 'brown', label: 'BROWN', color: '#4a2c1d' },
    { id: 'auburn', label: 'AUBURN', color: '#71301e' },
    { id: 'gray', label: 'GRAY', color: '#9a9690' },
  ],
  top: [
    { id: 'male-01', label: 'REDLINE MOTO JACKET' },
    { id: 'male-02', label: 'WHITE BOX TEE' },
    { id: 'male-03', label: '26 GOLD JERSEY' },
    { id: 'male-04', label: 'GREY HOODIE' },
    { id: 'male-05', label: 'RED PUFFER VEST' },
    { id: 'male-06', label: 'DENIM JACKET' },
    { id: 'female-01', label: 'LEATHER MOTO' },
    { id: 'female-02', label: 'WHITE CROP TANK' },
    { id: 'female-03', label: 'PINK HOODIE' },
    { id: 'female-04', label: 'GOLD HALTER' },
    { id: 'female-05', label: '26 GOLD JERSEY' },
    { id: 'female-06', label: 'CROPPED DENIM' },
  ],
  bottoms: [
    { id: 'baggy-jeans', label: 'BAGGY JEANS' },
    { id: 'cargo', label: 'CARGO PANTS' },
    { id: 'leather-pants', label: 'LEATHER PANTS' },
    { id: 'skirt', label: 'LONG SKIRT' },
    { id: 'track-pants', label: 'TRACK PANTS' },
    { id: 'shorts', label: 'SHORTS' },
  ],
  hat: [
    { id: 'none', label: 'NONE' },
    { id: 'fitted-cap', label: 'FITTED CAP' },
    { id: 'beanie', label: 'BEANIE' },
    { id: 'visor', label: 'VISOR' },
    { id: 'bucket', label: 'BUCKET HAT' },
    { id: 'headband', label: 'HEADBAND' },
    { id: 'bandana', label: 'BANDANA' },
  ],
  glasses: [
    { id: 'none', label: 'NONE' },
    { id: 'rectangle', label: 'RECTANGLE' },
    { id: 'round', label: 'ROUND' },
    { id: 'shades', label: 'SHADES' },
    { id: 'chrome', label: 'CHROME SHIELD', unlockChapter: 6 },
  ],
  jewelry: [
    { id: 'none', label: 'NONE' },
    { id: 'cuban-chain', label: 'CUBAN LINK' },
    { id: 'pendant-chain', label: 'PENDANT CHAIN' },
    { id: 'medallion', label: 'MEDALLION' },
    { id: 'hoops', label: 'GOLD HOOPS' },
    { id: 'studs', label: 'DIAMOND STUDS' },
    { id: 'diamond-hoops', label: 'DIAMOND HOOPS' },
  ],
  shoes: [
    { id: 'white-high', label: 'WHITE STRAP HIGH-TOP' },
    { id: 'red-black-high', label: 'BLACK / RED HIGH-TOP' },
    { id: 'wheat-boot', label: 'WHEAT WORK BOOT' },
    { id: 'black-silver-chunky', label: 'BLACK / SILVER CHUNKY' },
    { id: 'white-purple-low', label: 'WHITE / PURPLE LOW' },
    { id: 'black-chunky', label: 'BLACK CHUNKY' },
    { id: 'red-white-high', label: 'RED / WHITE HIGH-TOP' },
    { id: 'navy-cream-low', label: 'NAVY / CREAM LOW' },
    { id: 'black-silver-low', label: 'BLACK / SILVER LOW' },
    { id: 'purple-silver-chunky', label: 'PURPLE / SILVER CHUNKY' },
    { id: 'black-canvas-low', label: 'BLACK CANVAS LOW' },
    { id: 'silver-gold-high', label: 'SILVER / GOLD HIGH-TOP' },
  ],
}

export function careerOptionsFor(category: CareerOptionCategory, presentation: string): CareerOption[] {
  const options = CAREER_OPTIONS[category]
  if (category === 'face' || category === 'hair' || category === 'top') {
    const gender = presentation === 'female' ? 'female' : 'male'
    return options.filter((option) => option.id.startsWith(`${gender}-`))
  }
  return options
}

export const CAREER_APPEARANCE_GROUPS: {
  category: Exclude<CareerOptionCategory, 'presentation'>
  label: string
}[] = [
  { category: 'face', label: 'FACE' },
  { category: 'skin', label: 'SKIN TONE' },
  { category: 'hair', label: 'HAIRSTYLE' },
  { category: 'hairColor', label: 'HAIR COLOR' },
  { category: 'facialHair', label: 'FACIAL HAIR' },
  { category: 'facialHairColor', label: 'FACIAL HAIR COLOR' },
  { category: 'top', label: 'TOP' },
  { category: 'bottoms', label: 'BOTTOMS' },
  { category: 'hat', label: 'HAT' },
  { category: 'glasses', label: 'GLASSES' },
  { category: 'jewelry', label: 'JEWELRY' },
  { category: 'shoes', label: 'SHOES' },
]

export interface CareerHometown {
  id: string
  city: string
  region: string
}

export const DEFAULT_CAREER_HOMETOWN_ID = 'new-york'

/** All 50 states plus Washington, D.C. Old city IDs remain valid aliases. */
export const CAREER_HOMETOWNS: CareerHometown[] = [
  { id: 'alabama', city: 'BIRMINGHAM', region: 'ALABAMA' },
  { id: 'alaska', city: 'ANCHORAGE', region: 'ALASKA' },
  { id: 'arizona', city: 'PHOENIX', region: 'ARIZONA' },
  { id: 'arkansas', city: 'LITTLE ROCK', region: 'ARKANSAS' },
  { id: 'california', city: 'LOS ANGELES', region: 'CALIFORNIA' },
  { id: 'colorado', city: 'DENVER', region: 'COLORADO' },
  { id: 'connecticut', city: 'HARTFORD', region: 'CONNECTICUT' },
  { id: 'delaware', city: 'WILMINGTON', region: 'DELAWARE' },
  { id: 'district-of-columbia', city: 'WASHINGTON', region: 'DISTRICT OF COLUMBIA' },
  { id: 'florida', city: 'MIAMI', region: 'FLORIDA' },
  { id: 'georgia', city: 'ATLANTA', region: 'GEORGIA' },
  { id: 'hawaii', city: 'HONOLULU', region: 'HAWAII' },
  { id: 'idaho', city: 'BOISE', region: 'IDAHO' },
  { id: 'illinois', city: 'CHICAGO', region: 'ILLINOIS' },
  { id: 'indiana', city: 'INDIANAPOLIS', region: 'INDIANA' },
  { id: 'iowa', city: 'DES MOINES', region: 'IOWA' },
  { id: 'kansas', city: 'WICHITA', region: 'KANSAS' },
  { id: 'kentucky', city: 'LOUISVILLE', region: 'KENTUCKY' },
  { id: 'louisiana', city: 'NEW ORLEANS', region: 'LOUISIANA' },
  { id: 'maine', city: 'PORTLAND', region: 'MAINE' },
  { id: 'maryland', city: 'BALTIMORE', region: 'MARYLAND' },
  { id: 'massachusetts', city: 'BOSTON', region: 'MASSACHUSETTS' },
  { id: 'michigan', city: 'DETROIT', region: 'MICHIGAN' },
  { id: 'minnesota', city: 'MINNEAPOLIS', region: 'MINNESOTA' },
  { id: 'mississippi', city: 'JACKSON', region: 'MISSISSIPPI' },
  { id: 'missouri', city: 'KANSAS CITY', region: 'MISSOURI' },
  { id: 'montana', city: 'BILLINGS', region: 'MONTANA' },
  { id: 'nebraska', city: 'OMAHA', region: 'NEBRASKA' },
  { id: 'nevada', city: 'LAS VEGAS', region: 'NEVADA' },
  { id: 'new-hampshire', city: 'MANCHESTER', region: 'NEW HAMPSHIRE' },
  { id: 'new-jersey', city: 'NEWARK', region: 'NEW JERSEY' },
  { id: 'new-mexico', city: 'ALBUQUERQUE', region: 'NEW MEXICO' },
  { id: 'new-york', city: 'NEW YORK CITY', region: 'NEW YORK' },
  { id: 'north-carolina', city: 'CHARLOTTE', region: 'NORTH CAROLINA' },
  { id: 'north-dakota', city: 'FARGO', region: 'NORTH DAKOTA' },
  { id: 'ohio', city: 'CLEVELAND', region: 'OHIO' },
  { id: 'oklahoma', city: 'OKLAHOMA CITY', region: 'OKLAHOMA' },
  { id: 'oregon', city: 'PORTLAND', region: 'OREGON' },
  { id: 'pennsylvania', city: 'PHILADELPHIA', region: 'PENNSYLVANIA' },
  { id: 'rhode-island', city: 'PROVIDENCE', region: 'RHODE ISLAND' },
  { id: 'south-carolina', city: 'COLUMBIA', region: 'SOUTH CAROLINA' },
  { id: 'south-dakota', city: 'SIOUX FALLS', region: 'SOUTH DAKOTA' },
  { id: 'tennessee', city: 'MEMPHIS', region: 'TENNESSEE' },
  { id: 'texas', city: 'HOUSTON', region: 'TEXAS' },
  { id: 'utah', city: 'SALT LAKE CITY', region: 'UTAH' },
  { id: 'vermont', city: 'BURLINGTON', region: 'VERMONT' },
  { id: 'virginia', city: 'RICHMOND', region: 'VIRGINIA' },
  { id: 'washington', city: 'SEATTLE', region: 'WASHINGTON' },
  { id: 'west-virginia', city: 'CHARLESTON', region: 'WEST VIRGINIA' },
  { id: 'wisconsin', city: 'MILWAUKEE', region: 'WISCONSIN' },
  { id: 'wyoming', city: 'CHEYENNE', region: 'WYOMING' },
]

const CAREER_HOMETOWN_ALIASES: Record<string, string> = {
  brooklyn: 'new-york',
  atlanta: 'georgia',
  chicago: 'illinois',
  houston: 'texas',
  'los-angeles': 'california',
  'new-orleans': 'louisiana',
  detroit: 'michigan',
  miami: 'florida',
  philadelphia: 'pennsylvania',
  oakland: 'california',
  memphis: 'tennessee',
  newark: 'new-jersey',
}

export const CAREER_CREWS: Crew[] = [
  'CONCRETE POETS',
  'VELVET COURT',
  'NEON CHOIR',
  'STATIC KINGS',
  'MIDNIGHT CARTEL',
]

export interface CareerStarterDeck {
  id: 'balanced' | 'crew' | 'genre'
  name: string
  tagline: string
  description: string
}

export const CAREER_STARTER_DECKS: CareerStarterDeck[] = [
  {
    id: 'balanced',
    name: 'BEDROOM TAPES',
    tagline: 'ALL-ROUND START',
    description: 'A little offense, a little defense, and no obvious weakness. Built from the first 25 standard tracks.',
  },
  {
    id: 'crew',
    name: 'THE HOMETEAM',
    tagline: 'CREW SYNENERGY',
    description: 'Lean into one crew for Feature Verse payoffs. A higher ceiling if the pieces line up.',
  },
  {
    id: 'genre',
    name: 'ONE LANE, ALL IN',
    tagline: 'GENRE FOCUS',
    description: 'Stack your chosen genre for a focused setlist and stronger genre anthems.',
  },
]

export interface CareerMissionObjective {
  id: string
  kind: 'win' | 'personal-play' | 'feature' | 'clean' | 'defend' | 'elemental' | 'headliner'
  label: string
  target: number
}

export interface CareerMission {
  id: string
  chapter: number
  index: 1 | 2 | 3
  title: string
  subtitle: string
  story: { speaker: string; text: string }[]
  objectives: CareerMissionObjective[]
  rewardXp: number
  rewardBadge?: BadgeId
  rewardMoveIndex?: number
  opponentName: string
  venue: Venue
  rivalDeck: string[]
  rivalLineup: string[]
  difficulty: Difficulty
  isBoss: boolean
  genreLine: string
}

export interface CareerChapter {
  number: number
  title: string
  tagline: string
  label: string
  producer: string
  promoter: string
  synopsis: string
  venue: Venue
  missions: CareerMission[]
}

const GENRE_LINES: Record<Genre, string[]> = {
  'HIP-HOP': [
    'Make the room repeat every bar.',
    'Treat the beat like a thesis and prove it.',
    'No ad-libs. Just the whole picture.',
  ],
  'R&B': [
    'Let the hook do the heavy lifting.',
    'Leave space for the harmony to land.',
    'Make the crowd feel it before they hear it.',
  ],
  POP: [
    'Turn the stage into a camera flash.',
    'Give them a chorus they can carry home.',
    'Big gesture. Bigger payoff.',
  ],
}

function venueById(id: string): Venue {
  return VENUES.find((venue) => venue.id === id) ?? VENUES[0]
}

export function buildRivalDeck(rivalIds: string[], genre: Genre): string[] {
  const valid = rivalIds.filter((id) => ARTISTS.some((artist) => artist.id === id))
  const fallback = [...ARTISTS].sort((a, b) => {
    const aScore = (a.genre === genre ? 2 : 0) + (valid.includes(a.id) ? 4 : 0)
    const bScore = (b.genre === genre ? 2 : 0) + (valid.includes(b.id) ? 4 : 0)
    return bScore - aScore
  })
  const counts = new Map<string, number>()
  const deck: string[] = []
  let cursor = 0
  while (deck.length < 26 && cursor < 300) {
    const candidateId = valid.length && cursor % 2 === 0 ? valid[Math.floor(cursor / 2) % valid.length] : null
    const candidate = candidateId ? fallback.find((artist) => artist.id === candidateId) ?? fallback[cursor % fallback.length] : fallback[cursor % fallback.length]
    cursor += 1
    const used = counts.get(candidate.id) ?? 0
    if (used >= 2) continue
    counts.set(candidate.id, used + 1)
    deck.push(candidate.id)
  }
  if (deck.length < 26) {
    for (const artist of fallback) {
      while ((counts.get(artist.id) ?? 0) < 2 && deck.length < 26) {
        counts.set(artist.id, (counts.get(artist.id) ?? 0) + 1)
        deck.push(artist.id)
      }
    }
  }
  return deck
}

function rosterName(id: string): string {
  const artist = getArtist(id)
  return artist?.name ?? 'THE HOUSE'
}

function chapterRivals(chapter: number, genre: Genre): string[] {
  const hipHop = ['rook-havoc', 'cipher-jones', 'taj-omen', 'macko-deville', 'casso-royale', 'krown-vandal', 'vexa-volt', 'sefa-kamanzi']
  const rnb = ['sable-monroe', 'liv-orchid', 'saint-velvet', 'renee-blue', 'juno-maison', 'marisol-vane', 'nia-kembe', 'soraya-nazeem']
  const pop = ['amara-afterglow', 'pixel-cherry', 'ziggy-stereo', 'lola-laser', 'nova-candy', 'orbit-lane', 'tangerine-lux', 'yuna-sol']
  const genrePool = genre === 'HIP-HOP' ? hipHop : genre === 'R&B' ? rnb : pop
  const mixed = [hipHop, rnb, pop].flat()
  const offset = (chapter * 2) % mixed.length
  return [
    genrePool[(chapter - 1) % genrePool.length],
    mixed[(offset + chapter) % mixed.length],
    genrePool[(chapter + 2) % genrePool.length],
    mixed[(offset + 7) % mixed.length],
  ].filter((id, index, all) => all.indexOf(id) === index)
}

interface ChapterSeed {
  title: string
  tagline: string
  label: string
  producer: string
  promoter: string
  synopsis: string
  venueId: string
  badge?: BadgeId
  titles: [string, string, string]
  subtitles: [string, string, string]
  beats: [string, string, string]
}

const CHAPTER_SEEDS: ChapterSeed[] = [
  {
    title: 'THE FIRST DEMO',
    tagline: 'A bedroom, a microphone, and one shot.',
    label: 'DUST & GOLD TAPES',
    producer: 'MARA VOSS',
    promoter: 'DEX ROURKE',
    synopsis: 'An unsigned artist walks into a basement booth with three dollars and a verse. The first take is never the one that matters; the one you finish is.',
    venueId: 'basement',
    badge: 'executioner',
    titles: ['THE FIRST DEMO', 'BOOTH 3 AFTER MIDNIGHT', 'THE FIRST STAGE'],
    subtitles: ['Cut the record.', 'Make the engineer believe.', 'Play it for a room.'],
    beats: [
      'MARA VOSS: “Give me one clean pass. No pretending. The room can hear a lie.”',
      'MARA VOSS: “The tape is done. Now we need a body in the room to prove it.”',
      'DEX ROURKE: “Basement rules: no guest list, no second chances, no wasted bars.”',
    ],
  },
  {
    title: 'CORNER CYPHER',
    tagline: 'The block is the first critic.',
    label: 'FREEFORM UNION',
    producer: 'PROFESSOR KAY',
    promoter: 'TINA “TEE” MOSS',
    synopsis: 'A cypher has no green room. Every verse is a public application. The corner does not care about your demo — only what you do when the beat drops.',
    venueId: 'rooftop-radio',
    badge: 'medic',
    titles: ['THE CORNER IS OPEN', 'PASS THE MIC', 'KING OF THE CYPHER'],
    subtitles: ['Earn a spot.', 'Hold the room.', 'Leave with a name.'],
    beats: [
      'PROFESSOR KAY: “You are not competing. You are introducing yourself. There is a difference.”',
      'TINA MOSS: “The mic is hot. The crowd is hotter. Do not take all night.”',
      'PROFESSOR KAY: “The crown is not a trophy. It is a receipt. Show them what it cost.”',
    ],
  },
  {
    title: 'AFTER HOURS',
    tagline: 'A producer, a late pass, and a neon room.',
    label: 'VELVET HOURS',
    producer: 'NOELLE VANTE',
    promoter: 'RICO 2AM',
    synopsis: 'The demo gets played after midnight in a room full of people who claim they do not listen to demos. One producer does. One night can change the whole budget.',
    venueId: 'neon-arcade',
    badge: 'closer',
    titles: ['THE NIGHT SHIFT', 'THE PRODUCER’S BET', 'AFTER HOURS SHOWCASE'],
    subtitles: ['Get in the room.', 'Turn a maybe into a yes.', 'Own the late set.'],
    beats: [
      'NOELLE VANTE: “Neon makes everybody look famous. I want to hear what is left when the lights go down.”',
      'RICO 2AM: “Noelle does not sign records. She signs rooms. Make her remember yours.”',
      'NOELLE VANTE: “You get six minutes. Use the first two to make them stop talking.”',
    ],
  },
  {
    title: 'THE OPEN MIC RUN',
    tagline: 'Small stages. Real judges. No favors.',
    label: 'OPEN MIC ALLIANCE',
    producer: 'MISS HARLOW',
    promoter: 'JULES PERRY',
    synopsis: 'A three-night showcase puts unknown acts in front of people who can open doors and people who can close them. The only trick is consistency.',
    venueId: 'velvet-ballroom',
    badge: 'guardian',
    titles: ['OPEN MIC NIGHT ONE', 'THE SEMIFINAL', 'THE OPEN MIC CROWN'],
    subtitles: ['Make the cut.', 'Survive the second look.', 'Win the room twice.'],
    beats: [
      'MISS HARLOW: “Night one is a filter. I am not looking for perfect. I am looking for a reason to bring you back.”',
      'JULES PERRY: “The semifinal crowd has heard everything. Give them something they cannot file away.”',
      'MISS HARLOW: “One night does not make a career. But it can make a contract. Show me which one you want.”',
    ],
  },
  {
    title: 'THE CREW TEST',
    tagline: 'A solo voice only goes so far.',
    label: 'CROSSFADE COLLECTIVE',
    producer: 'PROFESSOR KAY',
    promoter: 'TINA “TEE” MOSS',
    synopsis: 'A crew does not need another soloist. It needs someone who knows when to pass the mic, when to hold it, and when to share the stage.',
    venueId: 'pier-26',
    badge: 'assist',
    titles: ['FIVE HEADS, ONE STAGE', 'CREW DRILL', 'THE CREW TEST'],
    subtitles: ['Find the blend.', 'Trust the room.', 'Pass the audition.'],
    beats: [
      'TINA MOSS: “Everybody can rap on their own. The test is whether the room gets better when you walk into it.”',
      'PROFESSOR KAY: “Feature chemistry is not a personality. It is a decision. Make it.”',
      'TINA MOSS: “If you get sent backstage, come back with something to say. That is the whole job.”',
    ],
  },
  {
    title: 'SIGNED OR INDEPENDENT',
    tagline: 'Two contracts. One name.',
    label: 'PAPER PLANE PROMOTIONS',
    producer: 'NOELLE VANTE',
    promoter: 'DEX ROURKE',
    synopsis: 'A boutique label offers a deal and a partner offers a van. Neither is a villain. Both require the artist to decide what “making it” is supposed to mean.',
    venueId: 'chrome-chapel',
    badge: 'encore',
    titles: ['TWO CONTRACTS', 'THE INDEPENDENT ROUTE', 'SIGNED OR INDEPENDENT'],
    subtitles: ['Read the fine print.', 'Build the van tour.', 'Choose the next room.'],
    beats: [
      'NOELLE VANTE: “A contract is a mirror. It shows you what you are willing to trade.”',
      'DEX ROURKE: “The independent route is not cheaper. It is just yours.”',
      'NOELLE VANTE: “Whatever you choose, the stage is still the stage. Do not let the paperwork perform for you.”',
    ],
  },
  {
    title: 'CITY LIGHTS TOUR',
    tagline: 'Four cities, one setlist, no off nights.',
    label: 'NIGHT BUS LIVE',
    producer: 'RICO 2AM',
    promoter: 'MISS HARLOW',
    synopsis: 'The first proper run is a test of endurance. Different rooms, different crowds, same artist. A tour can make a name or expose a crack.',
    venueId: 'rooftop-radio',
    badge: 'momentum',
    titles: ['CITY ONE', 'CITY TWO', 'CITY LIGHTS FINALE'],
    subtitles: ['Open the run.', 'Hold the middle.', 'Close the loop.'],
    beats: [
      'RICO 2AM: “City one is adrenaline. City two is the actual job. Do not confuse them.”',
      'MISS HARLOW: “The crowd knows the tape now. They came to hear you be better than it.”',
      'RICO 2AM: “Last night of the run. No new tricks. Just the best version of the set.”',
    ],
  },
  {
    title: 'THE INDUSTRY SHOWCASE',
    tagline: 'The room where a rumor becomes a budget.',
    label: 'CROWN NOTE MEDIA',
    producer: 'MARA VOSS',
    promoter: 'JULES PERRY',
    synopsis: 'A showcase full of A&Rs, playlist editors and people who only clap after someone else does. The personal card has to carry a room built on side-eye.',
    venueId: 'crown-coliseum',
    badge: 'elementalist',
    titles: ['THE INDUSTRY ROOM', 'THE SHOWCASE SET', 'THE CO-SIGN'],
    subtitles: ['Read the room.', 'Give them the highlight.', 'Make the co-sign stick.'],
    beats: [
      'MARA VOSS: “This room does not boo. It just forgets. Make forgetting impossible.”',
      'JULES PERRY: “Play the songs that got you here. The next album can wait until after the check clears.”',
      'MARA VOSS: “One co-sign can open a door. Your job is to make sure the room remembers who walked through it.”',
    ],
  },
  {
    title: 'ROAD TO THE HEADLINER',
    tagline: 'The last small room before the big one.',
    label: 'HEADLINE OR NOWHERE',
    producer: 'NOELLE VANTE',
    promoter: 'DEX ROURKE',
    synopsis: 'The headliner circuit is not a victory lap. It is a final exam with lights. Every artist on the bill can close a room. Only one can close the night.',
    venueId: 'midnight-garden',
    badge: 'veteran',
    titles: ['NO SMALL ROOMS', 'THE HEADLINER TEST', 'ONE NIGHT BEFORE'],
    subtitles: ['Fill the room.', 'Take the top slot.', 'Keep the nerve.'],
    beats: [
      'DEX ROURKE: “A headliner is not the loudest act. It is the act the room waits for.”',
      'NOELLE VANTE: “The test is not whether you can win. It is whether you can hold the room after you do.”',
      'DEX ROURKE: “Tomorrow the billboard. Tonight, sleep. You have earned the quiet.”',
    ],
  },
  {
    title: 'THE BILLBOARD MOMENT',
    tagline: 'From the basement to the biggest room in the city.',
    label: 'THE BILLBOARD GROUP',
    producer: 'MARA VOSS',
    promoter: 'JULES PERRY',
    synopsis: 'The final championship is a billboard campaign disguised as a battle. Every rival has a story. Every story has a stage. The last one belongs to whoever can still be themselves under the lights.',
    venueId: 'crown-coliseum',
    badge: 'headliner',
    titles: ['THE BILLBOARD STAGE', 'THE LAST OBSTACLE', 'THE BILLBOARD MOMENT'],
    subtitles: ['Arrive.', 'Outlast the room.', 'Become the headliner.'],
    beats: [
      'MARA VOSS: “The billboard is not the finish line. It is a photograph of the night you decided to keep going.”',
      'JULES PERRY: “One more room. One more set. Do not shrink now.”',
      'MARA VOSS: “Look at the sign. Then look at the stage. You are already the artist. Finish the story.”',
    ],
  },
]

function objectivesFor(chapter: number, index: 1 | 2 | 3): CareerMissionObjective[] {
  const objectives: CareerMissionObjective[] = [
    { id: 'win', kind: 'win', label: 'WIN THE BATTLE', target: 1 },
    {
      id: 'personal-play',
      kind: 'personal-play',
      label: `PLAY THE PERSONAL CARD ${index === 3 ? 4 : 3} TIMES`,
      target: index === 3 ? 4 : 3,
    },
  ]
  if (index === 2) {
    if (chapter % 3 === 0) {
      objectives.push({ id: 'feature', kind: 'feature', label: 'LAND 1 FEATURE VERSE WITH THE PERSONAL CARD', target: 1 })
    } else if (chapter % 3 === 1) {
      objectives.push({ id: 'defend', kind: 'defend', label: 'BLOCK OR HEAL 1 TIME WITH THE PERSONAL CARD', target: 1 })
    } else {
      objectives.push({ id: 'elemental', kind: 'elemental', label: 'USE 1 ELEMENTAL CUT WITH THE PERSONAL CARD', target: 1 })
    }
  }
  if (index === 3) {
    objectives.push({ id: 'clean', kind: 'clean', label: 'FINISH WITHOUT THE PERSONAL CARD GOING BACKSTAGE', target: 1 })
  }
  return objectives
}

function buildChapter(seed: ChapterSeed, chapterIndex: number, genre: Genre): CareerChapter {
  const number = chapterIndex + 1
  const venue = venueById(seed.venueId)
  const rivals = chapterRivals(number, genre)
  const rivalDeck = buildRivalDeck(rivals, genre)
  const rivalLineup = Array.from(new Set(rivalDeck)).slice(0, 5)
  const badge = seed.badge
  const missions: CareerMission[] = seed.titles.map((title, offset) => {
    const index = (offset + 1) as 1 | 2 | 3
    return {
      id: `ch${number}-m${index}`,
      chapter: number,
      index,
      title,
      subtitle: seed.subtitles[offset],
      story: [
        { speaker: 'NARRATOR', text: seed.synopsis },
        { speaker: seed.producer, text: seed.beats[offset] },
        {
          speaker: 'YOU',
          text: GENRE_LINES[genre][offset % GENRE_LINES[genre].length],
        },
      ],
      objectives: objectivesFor(number, index),
      rewardXp: 1000 + number * 260 + offset * 140,
      rewardBadge: index === 3 ? badge : undefined,
      rewardMoveIndex: index === 2 ? 4 + (number % 4) : undefined,
      opponentName: rosterName(rivals[offset % Math.max(1, rivals.length)]),
      venue,
      rivalDeck,
      rivalLineup,
      difficulty: number <= 3 ? 'OPENING' : number <= 7 ? 'HEADLINER' : 'LEGEND',
      isBoss: index === 3,
      genreLine: GENRE_LINES[genre][offset],
    }
  })
  return {
    number,
    title: seed.title,
    tagline: seed.tagline,
    label: seed.label,
    producer: seed.producer,
    promoter: seed.promoter,
    synopsis: seed.synopsis,
    venue,
    missions,
  }
}

export function careerChapters(genre: Genre): CareerChapter[] {
  return CHAPTER_SEEDS.map((seed, index) => buildChapter(seed, index, genre))
}

/** Stable chapter metadata for screens that only need labels and progress. */
export const CAREER_CHAPTER_META = CHAPTER_SEEDS.map((seed, index) => ({
  number: index + 1,
  title: seed.title,
  tagline: seed.tagline,
  label: seed.label,
  venueId: seed.venueId,
}))

/** Move slots, in order, are drawn from the chosen genre's real battle move pool. */
export const CAREER_MOVE_UNLOCK_RANK = [1, 1, 1, 5, 10, 15, 20, 30, 40, 55]
/** The signature cut is the reward for completing a level-55 Prestige run. */
export const CAREER_SIGNATURE_UNLOCK_RANK = 55
/** Badge slots open during each Prestige run and relock when the level resets. */
export const CAREER_BADGE_SLOT_RANK = [10, 20, 30, 40, 55]

export type CareerTitleSource = 'default' | 'climb' | 'master' | 'legend'

export interface CareerRankTitle {
  id: string
  label: string
  color: string
  /** Master and Legend milestone level. */
  rank?: number
  /** Prestige number for Climb titles. */
  prestige?: number
  /** Level inside that Prestige run: 10, 20, 30, 40 or 55. */
  prestigeLevel?: number
  animated?: boolean
  source: CareerTitleSource
}

/** Rank titles are permanent Legacy unlocks, so they survive a Prestige reset. */
export const CAREER_DEFAULT_TITLE: CareerRankTitle = {
  id: 'unsigned',
  label: 'UNSIGNED',
  color: '#b9b0a1',
  source: 'default',
}

const CAREER_TITLE_COLORS = [
  '#f4c84e', '#ffb46b', '#ff6a3d', '#56e0ff', '#b388ff',
  '#8affc1', '#ff8db8', '#d8e4f0', '#d8c7ff', '#ff3d8b',
]

const CAREER_CLIMB_LABELS: string[][] = [
  ['OPEN MIC', 'FIRST TAKE', 'BOOTH PROSPECT', 'NAME IN THE ROOM', 'RUN STARTER'],
  ['DEMO RUNNER', 'BUZZ BUILDER', 'LOCAL HYPE', 'CROWD PULL', 'SECOND WIND'],
  ['MIXTAPE HAND', 'STREET HEAT', 'RADIO READY', 'CITY SIGNAL', 'THIRD DEGREE'],
  ['SHOW CLOSER', 'STAGE HUSTLER', 'ROOM SHAKER', 'BAR FOR BAR', 'FOURTH QUARTER'],
  ['HALFWAY LEGEND', 'PRIME FIVE', 'MIDNIGHT MIC', 'CROWD KEEPER', 'PENTHOUSE FLOW'],
  ['SIXTH SENSE', 'VELVET VERSE', 'HEADLINE HEAT', 'SOLD OUT SOUL', 'ENCORE ENGINE'],
  ['SEVENTH HEAVEN', 'GOLDEN RUN', 'MARQUEE NAME', 'NEON NOTEBOOK', 'FULL HOUSE'],
  ['EIGHT MILE', 'DIAMOND DRAFT', 'MAIN STAGE', 'CROWN CHECK', 'PLATINUM PEN'],
  ['NINTH WONDER', 'LEGACY LOAD', 'BILLBOARD BOUND', 'FINAL FOUR', 'ALMOST LEGEND'],
  ['TENTH DEGREE', 'PRESTIGE LEGEND', 'LEGEND RUN', 'TEN OUT OF TEN', 'FINAL CURTAIN'],
]

const CAREER_CLIMB_LEVELS = [10, 20, 30, 40, 55]

/** 50 titles: five per Prestige, every ten levels through the level-55 cap. */
export const CAREER_CLIMB_TITLES: CareerRankTitle[] = CAREER_CLIMB_LABELS.flatMap(
  (labels, prestigeIndex) => {
    const prestige = prestigeIndex + 1
    return labels.map((label, index) => {
      const prestigeLevel = CAREER_CLIMB_LEVELS[index]
      const id = prestigeLevel === 55
        ? prestige === CAREER_MAX_PRESTIGE ? 'prestige-legend' : `prime-${prestige}`
        : `climb-p${prestige}-l${prestigeLevel}`
      return {
        id,
        label,
        color: CAREER_TITLE_COLORS[(prestigeIndex + index) % CAREER_TITLE_COLORS.length],
        prestige,
        prestigeLevel,
        source: 'climb',
        animated: prestigeLevel === 55 && prestige >= 8,
      }
    })
  },
)

const CAREER_MASTER_ENTRY_LABELS = [
  'MASTER CROSSING',
  'FIFTY-SIX',
  'MASTER DOOR',
  'MASTER SEAL',
  'BEYOND LEGEND',
]

/** The five-title bundle awarded the moment a card enters Prestige Master at 56. */
export const CAREER_MASTER_ENTRY_TITLES: CareerRankTitle[] = CAREER_MASTER_ENTRY_LABELS.map(
  (label, index) => ({
    id: `master-entry-${index + 1}`,
    label,
    color: CAREER_TITLE_COLORS[(index + 4) % CAREER_TITLE_COLORS.length],
    rank: CAREER_MASTER_START_LEVEL,
    source: 'master',
    animated: index === CAREER_MASTER_ENTRY_LABELS.length - 1,
  }),
)

const CAREER_LEGEND_LABELS: Record<number, string[]> = {
  100: ['CENTURY CLUB', 'HUNDRED PROOF', 'FIRST CENTURY', 'CENTURY STAMP', 'HUNDRED BAR'],
  200: ['DOUBLE CENTURY', 'TWO HUNDRED', '200 PROOF', 'DOUBLE HUNDRED', 'CENTURY DOUBLE'],
  300: ['THREE CENTURY', 'TRIPLE HUNDRED', 'TRIPLE CROWN', '300 CLUB', 'TRIPLE MIC'],
  400: ['FOUR CENTURY', 'QUAD HUNDRED', '400 CLUB', 'FOURTH CENTURY', 'QUAD MIC'],
  500: ['HALF MILLENNIUM', 'FIVE HUNDRED', '500 CLUB', 'MIDPOINT LEGEND', 'HALFWAY MASTER'],
  600: ['SIX CENTURY', '600 CLUB', 'SIX HUNDRED', 'SIXTH CENTURY', 'SIX-SPEED LEGEND'],
  700: ['SEVEN CENTURY', '700 CLUB', 'SEVEN HUNDRED', 'SEVENTH CENTURY', 'LUCKY SEVEN'],
  800: ['EIGHT CENTURY', '800 CLUB', 'EIGHT HUNDRED', 'EIGHTH CENTURY', 'OCTANE LEGEND'],
  900: ['NINE CENTURY', '900 CLUB', 'NINE HUNDRED', 'NINTH CENTURY', 'ONE STEP AWAY'],
  1000: ['THOUSAND CLUB', 'MILLENNIUM MIC', 'ONE THOUSAND', 'FINAL THOUSAND', 'CAREER COMPLETE'],
}

const CAREER_LEGEND_LEVELS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]

/** Five titles every 100 Master levels, from 100 through the level-1,000 cap. */
export const CAREER_LEGEND_TITLES: CareerRankTitle[] = CAREER_LEGEND_LEVELS.flatMap(
  (level) => (CAREER_LEGEND_LABELS[level] ?? []).map((label, index) => ({
    id: `legend-${level}-${index + 1}`,
    label,
    color: CAREER_TITLE_COLORS[(index + level / 100) % CAREER_TITLE_COLORS.length],
    rank: level,
    source: 'legend' as const,
    animated: level === 1000 && index === 4,
  })),
)

/** Compatibility aliases for older imports. The catalog now uses the explicit sets. */
export const CAREER_PRIME_TITLES = CAREER_CLIMB_TITLES
export const CAREER_MASTER_TITLES = [...CAREER_MASTER_ENTRY_TITLES, ...CAREER_LEGEND_TITLES]
export const CAREER_RANK_TITLES = CAREER_MASTER_ENTRY_TITLES

export const CAREER_TITLE_CATALOG: CareerRankTitle[] = [
  CAREER_DEFAULT_TITLE,
  ...CAREER_CLIMB_TITLES,
  ...CAREER_MASTER_ENTRY_TITLES,
  ...CAREER_LEGEND_TITLES,
]

/** Old saves keep their selected title when it has a new-ladder equivalent. */
export const CAREER_TITLE_ALIASES: Record<string, string> = {
  'rookie-prime': 'climb-p1-l10',
  'buzz-prime': 'climb-p2-l20',
  'prospect-prime': 'climb-p3-l30',
  'headliner-prime': 'climb-p4-l40',
  'run-prime': 'prime-1',
  'master-100': 'legend-100-1',
  'master-250': 'legend-200-1',
  'master-500': 'legend-500-1',
  'master-750': 'legend-700-1',
  'master-1000': 'legend-1000-1',
}

export function careerTitleForId(id: string | null | undefined): CareerRankTitle | null {
  if (!id) return null
  const resolved = CAREER_TITLE_ALIASES[id] ?? id
  return CAREER_TITLE_CATALOG.find((title) => title.id === resolved) ?? null
}

export function careerTitleUnlockLabel(title: CareerRankTitle): string {
  if (title.source === 'climb') return `PRESTIGE ${title.prestige} · LEVEL ${title.prestigeLevel}`
  if (title.source === 'legend') return `LEGEND LEVEL ${title.rank}`
  if (title.source === 'master') return `PRESTIGE ${CAREER_MAX_PRESTIGE} · LEVEL ${title.rank}`
  return 'STARTING TITLE'
}

export function careerRankTitleForRank(rank: number): CareerRankTitle {
  return [...CAREER_TITLE_CATALOG]
    .reverse()
    .find((title) => title.rank !== undefined && rank >= title.rank) ?? CAREER_DEFAULT_TITLE
}

export const CAREER_MOVE_TEMPLATE_ARTIST: Record<Genre, string> = {
  'HIP-HOP': 'cipher-jones',
  'R&B': 'amara-afterglow',
  POP: 'ziggy-stereo',
}

export const CAREER_CREW_BY_GENRE: Record<Genre, Crew> = {
  'HIP-HOP': 'CONCRETE POETS',
  'R&B': 'VELVET COURT',
  POP: 'NEON CHOIR',
}

export function careerOption(category: CareerOptionCategory, id: string): CareerOption | undefined {
  return CAREER_OPTIONS[category].find((option) => option.id === id)
}

export function careerOptionLabel(category: CareerOptionCategory, id: string): string {
  return careerOption(category, id)?.label ?? id.replace(/-/g, ' ').toUpperCase()
}

export function careerHometown(id: string): CareerHometown {
  const resolved = CAREER_HOMETOWN_ALIASES[id] ?? id
  return (
    CAREER_HOMETOWNS.find((home) => home.id === resolved) ??
    CAREER_HOMETOWNS.find((home) => home.id === DEFAULT_CAREER_HOMETOWN_ID) ??
    CAREER_HOMETOWNS[0]
  )
}

export type { Artist }
