import { ARTISTS, getArtist } from './roster'
import { CHART_SIZE, chartEntry, pickTitle, type ChartEntry, type ChartState } from './charts'

/**
 * RECORD LABEL OFFICE — the management sim behind Ultimate Team.
 *
 * The player is Vice President of the label. They scout and sign artists, budget
 * albums, choose release weeks against a crowded market, approve expense reports,
 * and handle scandals, leaks and shakedowns. Performance promotes them to Head of
 * Artist Management and then Mentor / Head of A&R.
 */

export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'DENIED'
export type CrisisKind = 'SCANDAL' | 'EXTORTION' | 'LEAK' | 'DRAMA'

export interface SignedArtist {
  id: string
  since: number
  fee: number
  morale: number
}

export interface Album {
  id: string
  artistId: string
  title: string
  production: number
  marketing: number
  started: number
  releaseWeek: number
  status: 'IN PRODUCTION' | 'RELEASED'
  sales?: number
  revenue?: number
  debut?: number
  peak?: number
}

export interface Expense {
  id: string
  artistId: string | null
  title: string
  detail: string
  amount: number
  status: ExpenseStatus
  week: number
}

export interface CrisisOption {
  id: string
  label: string
  cost: number
  rep: number
  morale: number
  outcome: string
}

export interface Crisis {
  id: string
  kind: CrisisKind
  artistId: string
  title: string
  detail: string
  week: number
  options: CrisisOption[]
  status: 'OPEN' | 'RESOLVED'
  resolution?: string
}

export interface LedgerEntry {
  id: string
  week: number
  text: string
  amount: number
}

export interface LabelState {
  version: 1
  week: number
  signed: SignedArtist[]
  albums: Album[]
  expenses: Expense[]
  crises: Crisis[]
  ledger: LedgerEntry[]
  reputation: number
  revenue: number
  spending: number
}

export const MAX_ROSTER = 6
export const MIN_BUDGET = 0
export const MAX_BUDGET = 1200
export const BUDGET_STEP = 50

const STORAGE_KEY = 'ciki.label.v1'
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const money = (value: number) => Math.round(value / 5) * 5

function hash(text: string): number {
  let h = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    h ^= text.charCodeAt(index)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function createLabel(week = 1): LabelState {
  return {
    version: 1,
    week,
    signed: [],
    albums: [],
    expenses: [],
    crises: [],
    ledger: [],
    reputation: 52,
    revenue: 0,
    spending: 0,
  }
}

export function loadLabel(fallbackWeek = 1): LabelState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createLabel(fallbackWeek)
    const parsed = JSON.parse(raw) as Partial<LabelState> | null
    if (!parsed || !Array.isArray(parsed.signed)) return createLabel(fallbackWeek)

    const ids = new Set(ARTISTS.map((artist) => artist.id))
    const signed: SignedArtist[] = parsed.signed
      .filter((entry): entry is SignedArtist => Boolean(entry) && ids.has(entry.id))
      .slice(0, MAX_ROSTER)
      .map((entry) => ({
        id: entry.id,
        since: Math.max(1, Math.round(numberOr(entry.since, 1))),
        fee: Math.max(0, Math.round(numberOr(entry.fee, 0))),
        morale: clamp(Math.round(numberOr(entry.morale, 65)), 0, 100),
      }))

    return {
      version: 1,
      week: clamp(Math.round(numberOr(parsed.week, fallbackWeek)), 1, 9999),
      signed,
      albums: Array.isArray(parsed.albums) ? (parsed.albums as Album[]) : [],
      expenses: Array.isArray(parsed.expenses) ? (parsed.expenses as Expense[]) : [],
      crises: Array.isArray(parsed.crises) ? (parsed.crises as Crisis[]) : [],
      ledger: Array.isArray(parsed.ledger) ? (parsed.ledger as LedgerEntry[]).slice(0, 60) : [],
      reputation: clamp(Math.round(numberOr(parsed.reputation, 52)), 0, 100),
      revenue: Math.max(0, Math.round(numberOr(parsed.revenue, 0))),
      spending: Math.max(0, Math.round(numberOr(parsed.spending, 0))),
    }
  } catch {
    return createLabel(fallbackWeek)
  }
}

export function saveLabel(state: LabelState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage may be unavailable; the label still runs for this session.
  }
}

export function signedArtist(state: LabelState, id: string): SignedArtist | undefined {
  return state.signed.find((entry) => entry.id === id)
}

export function albumsFor(state: LabelState, id: string): Album[] {
  return state.albums.filter((album) => album.artistId === id && album.status === 'RELEASED')
}

export type ChartRoyaltyTier = 'SMASH' | 'CHARTING' | 'OFF CHART'

export interface ChartRoyaltyLine {
  artistId: string
  rank: number | null
  spins: number
  amount: number
  tier: ChartRoyaltyTier
}

/**
 * One signed artist's weekly royalty. Only a Top-26 record earns money;
 * rank, spins, upward movement and the released catalog all lift the check.
 */
export function chartRoyaltyFor(
  signed: SignedArtist,
  entry: ChartEntry | undefined,
  released: number,
): ChartRoyaltyLine {
  if (!entry || entry.rank > CHART_SIZE) {
    return {
      artistId: signed.id,
      rank: entry?.rank ?? null,
      spins: entry?.spins ?? 0,
      amount: 0,
      tier: 'OFF CHART',
    }
  }

  const climb = entry.prevRank === null ? 0 : Math.max(0, entry.prevRank - entry.rank)
  const amount = money(
    30 +
      entry.spins * 0.02 +
      (CHART_SIZE + 1 - entry.rank) * 8 +
      entry.popularity * 0.6 +
      Math.min(30, climb * 4) +
      released * 12 +
      signed.morale * 0.15,
  )

  return {
    artistId: signed.id,
    rank: entry.rank,
    spins: entry.spins,
    amount,
    tier: entry.rank <= 10 ? 'SMASH' : 'CHARTING',
  }
}

/** Projected weekly royalty for every artist on the current roster. */
export function chartRoyalties(state: LabelState, charts: ChartState): ChartRoyaltyLine[] {
  return state.signed.map((signed) =>
    chartRoyaltyFor(
      signed,
      chartEntry(charts, signed.id),
      state.albums.filter((album) => album.artistId === signed.id && album.status === 'RELEASED')
        .length,
    ),
  )
}

export function signingFee(id: string, charts: ChartState): number {
  const popularity = chartEntry(charts, id)?.popularity ?? 50
  return money(150 + popularity * 6)
}

export function signingBoard(state: LabelState, charts: ChartState): string[] {
  const signed = new Set(state.signed.map((entry) => entry.id))
  return ARTISTS.filter((artist) => !signed.has(artist.id))
    .map((artist) => artist.id)
    .sort((a, b) => (chartEntry(charts, a)?.rank ?? 99) - (chartEntry(charts, b)?.rank ?? 99))
}

/* ------------------------------------------------------------------ roles */

export interface RoleRequirement {
  label: string
  have: number
  need: number
  done: boolean
}

export interface RoleInfo {
  index: number
  name: string
  blurb: string
  next: { name: string; requirements: RoleRequirement[] } | null
}

const ROLES = [
  {
    name: 'VICE PRESIDENT',
    blurb: 'You run the day-to-day: the roster, the budgets and the fires nobody else wants.',
  },
  {
    name: 'HEAD OF ARTIST MANAGEMENT',
    blurb: 'The roster trusts you now. Signings, releases and artist relations are yours to shape.',
  },
  {
    name: 'MENTOR · HEAD OF A&R',
    blurb: 'The label’s north star. Artists come to you before they sign anywhere else.',
  },
] as const

export function roleInfo(state: LabelState): RoleInfo {
  const released = state.albums.filter((album) => album.status === 'RELEASED').length
  const signed = state.signed.length
  const index = signed >= 4 && released >= 2 && state.reputation >= 60 ? 2 : signed >= 2 ? 1 : 0
  const role = ROLES[index]
  const next =
    index === 0
      ? {
          name: ROLES[1].name,
          requirements: [
            { label: 'ARTISTS SIGNED', have: signed, need: 2, done: signed >= 2 },
          ],
        }
      : index === 1
        ? {
            name: ROLES[2].name,
            requirements: [
              { label: 'ARTISTS SIGNED', have: signed, need: 4, done: signed >= 4 },
              { label: 'ALBUMS RELEASED', have: released, need: 2, done: released >= 2 },
              {
                label: 'LABEL REPUTATION',
                have: state.reputation,
                need: 60,
                done: state.reputation >= 60,
              },
            ],
          }
        : null
  return { index, name: role.name, blurb: role.blurb, next }
}

/* -------------------------------------------------------------- projections */

export function marketHeat(week: number): number {
  return 0.82 + hash(`heat-${week}`) * 0.42
}

export interface AlbumProjection {
  quality: number
  reach: number
  heat: number
  sales: number
  revenue: number
  debut: number
  boost: number
}

export function albumProjection(input: {
  popularity: number
  production: number
  marketing: number
  reputation: number
  releaseWeek: number
  seed?: string
}): AlbumProjection {
  const quality = clamp(35 + input.production / 8, 20, 130)
  const rawReach =
    input.popularity * 0.5 + (input.marketing / 10) * 0.18 + quality * 0.2 + input.reputation * 0.1
  const heat = marketHeat(input.releaseWeek)
  const reach = clamp(rawReach * (1.12 - heat * 0.12), 5, 99)
  const noise = 0.92 + hash(`${input.seed ?? 'album'}-${input.releaseWeek}`) * 0.2
  const sales = Math.round(reach * 300 * (quality / 100) * noise + 1400)
  const revenue = Math.round(sales * (0.035 + reach / 1400))
  const debut = clamp(Math.round(28 - reach / 4 - (heat - 1) * 9), 1, ARTISTS.length)
  const boost = 3.5 + input.production / 380 + input.marketing / 340
  return { quality, reach, heat, sales, revenue, debut, boost }
}

/* ------------------------------------------------------------------- events */

const EXPENSE_TEMPLATES = [
  { title: 'STUDIO TIME', detail: 'Overnight mix session at The Bunker.' },
  { title: 'PRODUCER INVOICE', detail: 'Four beats and one late-night revision.' },
  { title: 'RADIO PROMO', detail: 'Regionals, playlist plugs and a van full of stickers.' },
  { title: 'VIDEO TREATMENT', detail: 'Director wants a rooftop, a car and rain.' },
  { title: 'LEGAL RETAINER', detail: 'Clearance work on a sample nobody logged.' },
  { title: 'MIXING SESSION', detail: 'Two engineers, one deadline, cold coffee.' },
  { title: 'WARDROBE', detail: 'Video shoot fits, returned the same night.' },
  { title: 'TOURING ADVANCE', detail: 'Bus deposit for the three-city run.' },
]

function makeExpense(artistId: string, week: number): Expense {
  const template = EXPENSE_TEMPLATES[Math.floor(Math.random() * EXPENSE_TEMPLATES.length)]
  const artist = getArtist(artistId)
  return {
    id: newId('exp'),
    artistId,
    title: template.title,
    detail: `${artist.name} · ${template.detail}`,
    amount: money(45 + Math.random() * 265),
    status: 'PENDING',
    week,
  }
}

const CRISIS_TEMPLATES: Record<
  CrisisKind,
  { title: string; detail: string; options: Omit<CrisisOption, 'id'>[] }
> = {
  SCANDAL: {
    title: 'SCANDAL ON THE TIMELINE',
    detail:
      'A years-old clip resurfaces and the blogs are calling for a statement. Your artist is not answering the phone.',
    options: [
      {
        label: 'PAY THE CRISIS TEAM',
        cost: 260,
        rep: 2,
        morale: 4,
        outcome: 'The story dies in 48 hours. Expensive, but the roster feels protected.',
      },
      {
        label: 'ISSUE A STATEMENT',
        cost: 0,
        rep: -4,
        morale: -5,
        outcome: 'The statement lands flat. The label looks slow and the artist goes quiet.',
      },
      {
        label: 'LET IT BURN',
        cost: 0,
        rep: -8,
        morale: -9,
        outcome: 'The silence becomes the story. Radio pulls the single for a week.',
      },
    ],
  },
  EXTORTION: {
    title: 'SHAKEDOWN AT THE LOADING DOCK',
    detail:
      'Two men with a clipboard want “security money” before the video shoot can wrap. One of them keeps mentioning a badge.',
    options: [
      {
        label: 'PAY THEM OFF',
        cost: 340,
        rep: 1,
        morale: 3,
        outcome: 'The shoot finishes. Nobody talks about it, and the invoice disappears.',
      },
      {
        label: 'CALL THE LAWYERS',
        cost: 160,
        rep: 3,
        morale: 1,
        outcome: 'Legal makes it expensive for them. The label looks untouchable.',
      },
      {
        label: 'REFUSE TO PAY',
        cost: 0,
        rep: -6,
        morale: -6,
        outcome: 'The shoot is shut down. The roster blames you for the lost day.',
      },
    ],
  },
  LEAK: {
    title: 'THE MIX LEAKED',
    detail:
      'An unfinished record is circulating with a rough vocal and a missing bridge. The release is still three weeks out.',
    options: [
      {
        label: 'BUY IT BACK',
        cost: 240,
        rep: 1,
        morale: 3,
        outcome: 'The leak is contained. The budget takes the hit, not the artist.',
      },
      {
        label: 'DROP IT EARLY',
        cost: 0,
        rep: 3,
        morale: 4,
        outcome: 'You turn the leak into a surprise release. The blogs call it a move.',
      },
      {
        label: 'IGNORE IT',
        cost: 0,
        rep: -3,
        morale: -4,
        outcome: 'The rough version becomes the version people know. The artist notices.',
      },
    ],
  },
  DRAMA: {
    title: 'BEEF IN THE GROUP CHAT',
    detail:
      'Two artists on the roster traded shots in public. The timeline is picking sides and your phone will not stop.',
    options: [
      {
        label: 'PRIVATE MEDIATION',
        cost: 180,
        rep: 2,
        morale: 6,
        outcome: 'They leave the room with a handshake and a joint track. The label looks steady.',
      },
      {
        label: 'PUBLIC SUPPORT',
        cost: 0,
        rep: 1,
        morale: 2,
        outcome: 'You back both artists publicly. The story cools without a winner.',
      },
      {
        label: 'STAY QUIET',
        cost: 0,
        rep: -4,
        morale: -7,
        outcome: 'The silence reads as weakness. Both artists remember it.',
      },
    ],
  },
}

function makeCrisis(artistId: string, week: number, popularity: number): Crisis {
  const kinds: CrisisKind[] = ['SCANDAL', 'EXTORTION', 'LEAK', 'DRAMA']
  const kind = kinds[Math.floor(Math.random() * kinds.length)]
  const template = CRISIS_TEMPLATES[kind]
  const artist = getArtist(artistId)
  const scale = 0.75 + popularity / 200
  return {
    id: newId('crisis'),
    kind,
    artistId,
    title: template.title,
    detail: `${artist.name} — ${template.detail}`,
    week,
    options: template.options.map((option, index) => ({
      ...option,
      id: `opt-${index}`,
      cost: money(option.cost * scale),
    })),
    status: 'OPEN',
  }
}

/* ------------------------------------------------------------------ actions */

export interface LabelActionResult {
  label: LabelState
  credits: number
}

export function signArtist(
  state: LabelState,
  id: string,
  fee: number,
  credits: number,
  week: number,
): LabelActionResult | null {
  if (state.signed.length >= MAX_ROSTER) return null
  if (state.signed.some((entry) => entry.id === id)) return null
  if (!getArtist(id) || credits < fee) return null
  const artist = getArtist(id)
  return {
    credits: credits - fee,
    label: {
      ...state,
      spending: state.spending + fee,
      signed: [...state.signed, { id, since: week, fee, morale: 68 }],
      ledger: [
        {
          id: newId('ledger'),
          week,
          text: `SIGNED ${artist.name}`,
          amount: -fee,
        },
        ...state.ledger,
      ].slice(0, 60),
    },
  }
}

export function dropArtist(
  state: LabelState,
  id: string,
  credits: number,
): LabelActionResult | null {
  const signed = state.signed.find((entry) => entry.id === id)
  if (!signed) return null
  const artist = getArtist(id)
  return {
    credits,
    label: {
      ...state,
      signed: state.signed.filter((entry) => entry.id !== id),
      ledger: [
        {
          id: newId('ledger'),
          week: state.week,
          text: `DROPPED ${artist.name} · REMAINING BENEFITS LOST`,
          amount: 0,
        },
        ...state.ledger,
      ].slice(0, 60),
    },
  }
}

export function startAlbum(
  state: LabelState,
  input: {
    artistId: string
    title: string
    production: number
    marketing: number
    releaseWeek: number
  },
  credits: number,
): LabelActionResult | null {
  if (!signedArtist(state, input.artistId)) return null
  if (state.albums.some((album) => album.artistId === input.artistId && album.status === 'IN PRODUCTION')) {
    return null
  }
  const cost = Math.round(input.production + input.marketing)
  if (credits < cost) return null
  if (input.releaseWeek <= state.week) return null
  const artist = getArtist(input.artistId)
  const album: Album = {
    id: newId('album'),
    artistId: input.artistId,
    title: input.title.trim().toUpperCase().slice(0, 28) || pickTitle(input.artistId + state.week),
    production: clamp(Math.round(input.production), MIN_BUDGET, MAX_BUDGET),
    marketing: clamp(Math.round(input.marketing), MIN_BUDGET, MAX_BUDGET),
    started: state.week,
    releaseWeek: input.releaseWeek,
    status: 'IN PRODUCTION',
  }
  return {
    credits: credits - cost,
    label: {
      ...state,
      albums: [album, ...state.albums],
      spending: state.spending + cost,
      ledger: [
        {
          id: newId('ledger'),
          week: state.week,
          text: `ALBUM BUDGET · ${artist.name} — "${album.title}"`,
          amount: -cost,
        },
        ...state.ledger,
      ].slice(0, 60),
    },
  }
}

export function reviewExpense(
  state: LabelState,
  expenseId: string,
  approve: boolean,
  credits: number,
): LabelActionResult | null {
  const expense = state.expenses.find((entry) => entry.id === expenseId)
  if (!expense || expense.status !== 'PENDING') return null
  if (approve && credits < expense.amount) return null
  const artist = expense.artistId ? getArtist(expense.artistId) : null
  const signed = expense.artistId ? signedArtist(state, expense.artistId) : undefined
  const repDelta = approve ? 1.2 : -1
  const moraleDelta = approve ? 2 : -4
  const amount = approve ? -expense.amount : 0

  return {
    credits: approve ? credits - expense.amount : credits,
    label: {
      ...state,
      reputation: clamp(state.reputation + repDelta, 0, 100),
      spending: state.spending + (approve ? expense.amount : 0),
      signed: state.signed.map((entry) =>
        signed && entry.id === signed.id
          ? { ...entry, morale: clamp(entry.morale + moraleDelta, 0, 100) }
          : entry,
      ),
      expenses: state.expenses.map((entry) =>
        entry.id === expense.id ? { ...entry, status: approve ? 'APPROVED' : 'DENIED' } : entry,
      ),
      ledger: [
        {
          id: newId('ledger'),
          week: state.week,
          text: approve
            ? `${expense.title} · ${artist?.name ?? 'LABEL'}`
            : `${expense.title} DENIED · ${artist?.name ?? 'LABEL'}`,
          amount,
        },
        ...state.ledger,
      ].slice(0, 60),
    },
  }
}

export function resolveCrisis(
  state: LabelState,
  crisisId: string,
  optionId: string,
  credits: number,
): LabelActionResult | null {
  const crisis = state.crises.find((entry) => entry.id === crisisId)
  if (!crisis || crisis.status !== 'OPEN') return null
  const option = crisis.options.find((entry) => entry.id === optionId)
  if (!option || credits < option.cost) return null
  const signed = signedArtist(state, crisis.artistId)
  return {
    credits: credits - option.cost,
    label: {
      ...state,
      reputation: clamp(state.reputation + option.rep, 0, 100),
      spending: state.spending + option.cost,
      signed: state.signed.map((entry) =>
        signed && entry.id === signed.id
          ? { ...entry, morale: clamp(entry.morale + option.morale, 0, 100) }
          : entry,
      ),
      crises: state.crises.map((entry) =>
        entry.id === crisis.id
          ? { ...entry, status: 'RESOLVED', resolution: `${option.label} — ${option.outcome}` }
          : entry,
      ),
      ledger: [
        {
          id: newId('ledger'),
          week: state.week,
          text: `${crisis.kind} · ${option.label}`,
          amount: -option.cost,
        },
        ...state.ledger,
      ].slice(0, 60),
    },
  }
}

/* ------------------------------------------------------------- week advance */

export interface ChartBoostNote {
  artistId: string
  popularity: number
  spins: number
  momentum: number
  note: string
}

export interface WeekSummary {
  label: LabelState
  credits: number
  boosts: ChartBoostNote[]
  notes: string[]
  royalty: number
  revenue: number
}

export function advanceLabelWeek(state: LabelState, charts: ChartState, credits: number): WeekSummary {
  const week = state.week + 1
  const boosts: ChartBoostNote[] = []
  const notes: string[] = []
  let revenue = 0
  let royalty = 0
  let reputation = state.reputation
  let albums = state.albums

  for (const album of state.albums) {
    if (album.status === 'RELEASED' || album.releaseWeek > week) continue
    const artist = getArtist(album.artistId)
    const popularity = chartEntry(charts, album.artistId)?.popularity ?? 55
    const projection = albumProjection({
      popularity,
      production: album.production,
      marketing: album.marketing,
      reputation,
      releaseWeek: album.releaseWeek,
      seed: album.id,
    })
    const sales = Math.round(projection.sales * (0.9 + Math.random() * 0.2))
    const take = Math.round(sales * (0.035 + projection.reach / 1400))
    revenue += take
    reputation = clamp(reputation + 1.6, 0, 100)
    albums = albums.map((entry) =>
      entry.id === album.id
        ? {
            ...entry,
            status: 'RELEASED',
            sales,
            revenue: take,
            debut: projection.debut,
            peak: projection.debut,
          }
        : entry,
    )
    boosts.push({
      artistId: album.artistId,
      popularity: projection.boost,
      spins: Math.round(600 + sales / 40),
      momentum: 0.4,
      note: `LABEL RELEASE · ${artist.name} — "${album.title}" debuts at #${projection.debut}. ${sales.toLocaleString('en-US')} units moved.`,
    })
    notes.push(`${album.title} · ${artist.name} debuted #${projection.debut}`)
  }

  const royaltyLines = chartRoyalties({ ...state, albums }, charts)
  royalty = royaltyLines.reduce((sum, line) => sum + line.amount, 0)

  const newExpenses = [...state.expenses]
  const pending = newExpenses.filter((expense) => expense.status === 'PENDING')
  if (state.signed.length && pending.length < 6) {
    const count = 1 + (Math.random() < 0.55 ? 1 : 0)
    for (let index = 0; index < count; index += 1) {
      const artist = state.signed[Math.floor(Math.random() * state.signed.length)]
      newExpenses.push(makeExpense(artist.id, week))
    }
  }

  const openCrises = state.crises.filter((crisis) => crisis.status === 'OPEN')
  const newCrises = [...state.crises]
  if (state.signed.length && openCrises.length < 2 && Math.random() < 0.5) {
    const artist = state.signed[Math.floor(Math.random() * state.signed.length)]
    const popularity = chartEntry(charts, artist.id)?.popularity ?? 55
    newCrises.push(makeCrisis(artist.id, week, popularity))
  }

  const ledger: LedgerEntry[] = []
  for (const line of royaltyLines) {
    if (line.amount <= 0) continue
    ledger.push({
      id: newId('ledger'),
      week,
      text: `CHART ROYALTY · ${getArtist(line.artistId).name} · #${line.rank}`,
      amount: line.amount,
    })
  }
  for (const album of albums) {
    if (album.status === 'RELEASED' && album.releaseWeek === week && album.revenue) {
      ledger.push({
        id: newId('ledger'),
        week,
        text: `RELEASE INCOME · "${album.title}"`,
        amount: album.revenue,
      })
    }
  }

  return {
    credits: credits + royalty + revenue,
    boosts,
    notes,
    royalty,
    revenue,
    label: {
      ...state,
      week,
      albums,
      expenses: newExpenses,
      crises: newCrises,
      reputation,
      revenue: state.revenue + revenue + royalty,
      ledger: [...ledger, ...state.ledger].slice(0, 60),
    },
  }
}
