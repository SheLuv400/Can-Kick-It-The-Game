import { ARTISTS, getArtist } from './roster'
import { trackFor } from './tracks'

/**
 * THE CIKI 26 — a living weekly chart.
 *
 * Every artist holds a popularity rating, a spin count and short-term momentum.
 * Each week the chart simulates releases, radio adds, tours, leaks and scandals,
 * then re-ranks every eligible artist for the Top 26. Cards played in battle push
 * their artist's spins and popularity, so a strong set can move the board.
 * Everything is stored locally.
 */

export interface ChartEntry {
  id: string
  rank: number
  prevRank: number | null
  spins: number
  prevSpins: number
  popularity: number
  momentum: number
  peak: number
  weeks: number
  single: string
  impact: number
}

export interface ChartNews {
  id: string
  week: number
  artistId: string
  tone: 'up' | 'down' | 'note'
  text: string
}

export interface ChartState {
  version: 1
  week: number
  entries: ChartEntry[]
  news: ChartNews[]
}

const STORAGE_KEY = 'ciki.charts.v1'
const MAX_NEWS = 50

const ADJECTIVES = [
  'MIDNIGHT',
  'CONCRETE',
  'VELVET',
  'CHROME',
  'GOLD',
  'STATIC',
  'NEON',
  'CROWN',
  'BURGUNDY',
  'AFTER-HOURS',
  'LOW-END',
  'SILVER',
  'BLUE',
  'HALFTONE',
  'CANDLELIGHT',
  'BRONZE',
]

const NOUNS = [
  'PRAYER',
  'SESSION',
  'CROWN',
  'RUNWAY',
  'CHURCH',
  'RECEIPT',
  'MOTION',
  'PARADE',
  'PSALM',
  'INTERLUDE',
  'FUNERAL',
  'VICTORY',
  'BAPTISM',
  'PAYPHONE',
  'STREETLIGHT',
  'ENCORE',
]

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function hash(text: string): number {
  let h = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    h ^= text.charCodeAt(index)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function pickTitle(seed: string): string {
  const adjective = ADJECTIVES[Math.floor(hash(`${seed}-a`) * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(hash(`${seed}-b`) * NOUNS.length)]
  return `${adjective} ${noun}`
}

function signatureSingle(id: string): string {
  const track = trackFor(id)
  if (track) return track.title
  const artist = getArtist(id)
  const parts = artist.encore.name.split('—')
  const title = (parts[1] ?? '').trim()
  return title || pickTitle(id)
}

function defaultEntries(): ChartEntry[] {
  return ARTISTS.map((artist) => {
    const spark = hash(artist.id)
    const popularity = clamp(28 + spark * 40 + artist.cost * 2.4 + artist.bars * 1.3, 24, 94)
    return {
      id: artist.id,
      rank: 0,
      prevRank: null,
      prevSpins: 0,
      spins: Math.round(900 + popularity * 38 + hash(`${artist.id}-debut`) * 900),
      popularity,
      momentum: (spark - 0.5) * 0.25,
      peak: ARTISTS.length,
      weeks: 1 + Math.floor(hash(`${artist.id}-weeks`) * 34),
      single: signatureSingle(artist.id),
      impact: 0,
    }
  })
}

function rerank(entries: ChartEntry[]): ChartEntry[] {
  return [...entries]
    .sort((a, b) => b.spins - a.spins || a.id.localeCompare(b.id))
    .map((entry, index) => {
      const rank = index + 1
      return { ...entry, rank, peak: Math.min(entry.peak || rank, rank) }
    })
}

/** The chart itself has 26 seats; every roster artist is eligible to enter it. */
export const CHART_SIZE = 26

export function createCharts(): ChartState {
  return {
    version: 1,
    week: 1,
    entries: rerank(defaultEntries()),
    news: [
      {
        id: 'launch-1',
        week: 1,
        artistId: ARTISTS[0].id,
        tone: 'note',
        text: `THE CIKI 26 IS LIVE. ${ARTISTS.length} ARTISTS. 26 SEATS. NO SAFE ONES.`,
      },
    ],
  }
}

export function loadCharts(): ChartState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createCharts()
    const parsed = JSON.parse(raw) as Partial<ChartState> | null
    if (!parsed || !Array.isArray(parsed.entries)) return createCharts()

    const stored = new Map<string, Partial<ChartEntry>>()
    for (const entry of parsed.entries) {
      if (entry && typeof entry.id === 'string') stored.set(entry.id, entry)
    }

    const defaults = defaultEntries()
    const entries: ChartEntry[] = ARTISTS.map((artist) => {
      const base = defaults.find((entry) => entry.id === artist.id)!
      const saved = stored.get(artist.id)
      const mappedSingle = trackFor(artist.id)?.title
      return {
        ...base,
        rank: 0,
        prevRank: typeof saved?.prevRank === 'number' ? saved.prevRank : null,
        spins: Math.max(1, Math.round(num(saved?.spins, base.spins))),
        prevSpins: Math.max(0, Math.round(num(saved?.prevSpins, 0))),
        popularity: clamp(num(saved?.popularity, base.popularity), 1, 99),
        momentum: clamp(num(saved?.momentum, base.momentum), -1, 1),
        peak: clamp(Math.round(num(saved?.peak, base.peak)), 1, ARTISTS.length),
        weeks: Math.max(1, Math.round(num(saved?.weeks, base.weeks))),
        single:
          mappedSingle ??
          (typeof saved?.single === 'string' && saved.single.trim() ? saved.single : base.single),
        impact: Math.max(0, Math.round(num(saved?.impact, 0))),
      }
    })

    const news = Array.isArray(parsed.news)
      ? parsed.news
          .filter(
            (item): item is ChartNews =>
              Boolean(item) &&
              typeof item.text === 'string' &&
              typeof item.artistId === 'string' &&
              typeof item.week === 'number',
          )
          .slice(0, MAX_NEWS)
      : []

    return {
      version: 1,
      week: clamp(Math.round(num(parsed.week, 1)), 1, 9999),
      entries: rerank(entries),
      news,
    }
  } catch {
    return createCharts()
  }
}

export function saveCharts(state: ChartState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // The chart keeps running even when storage is blocked.
  }
}

function newsId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function chartEntry(state: ChartState, id: string): ChartEntry | undefined {
  return state.entries.find((entry) => entry.id === id)
}

export function chartLeader(state: ChartState): ChartEntry | undefined {
  return state.entries[0]
}

export function addChartNews(
  state: ChartState,
  text: string,
  artistId: string,
  tone: ChartNews['tone'] = 'note',
): ChartState {
  return {
    ...state,
    news: [{ id: newsId(), week: state.week, artistId, tone, text }, ...state.news].slice(0, MAX_NEWS),
  }
}

type EventKind = 'release' | 'radio' | 'tour' | 'viral' | 'scandal' | 'leak'

const EVENT_WEIGHTS: EventKind[] = [
  'release',
  'release',
  'radio',
  'radio',
  'radio',
  'tour',
  'viral',
  'scandal',
  'scandal',
  'leak',
]

function eventFor(_: number): EventKind {
  return EVENT_WEIGHTS[Math.floor(Math.random() * EVENT_WEIGHTS.length)]
}

export function advanceCharts(state: ChartState): ChartState {
  const week = state.week + 1
  const previousLeader = state.entries[0]?.id ?? null
  const oldRanks = new Map(state.entries.map((entry) => [entry.id, entry.rank]))

  const pool = [...state.entries]
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    ;[pool[index], pool[swap]] = [pool[swap], pool[index]]
  }
  const events = new Map<string, EventKind>()
  const eventCount = 3 + Math.floor(Math.random() * 4)
  for (const entry of pool.slice(0, eventCount)) events.set(entry.id, eventFor(hash(entry.id)))

  const news: ChartNews[] = []
  const push = (artistId: string, tone: ChartNews['tone'], text: string) => {
    news.push({ id: newsId(), week, artistId, tone, text })
  }

  const advanced = state.entries.map((entry) => {
    const artist = getArtist(entry.id)
    const mappedSingle = trackFor(entry.id)?.title
    let popularity = entry.popularity + (Math.random() - 0.5) * 1.7
    let momentum = entry.momentum * 0.62
    let single = mappedSingle ?? entry.single
    const event = events.get(entry.id)

    if (event) {
      const name = artist.name
      if (event === 'release') {
        popularity += 6 + Math.random() * 5
        momentum += 0.3 + Math.random() * 0.25
        if (mappedSingle) {
          push(entry.id, 'up', `${name} pushes "${mappedSingle}" back to radio and the request line melts.`)
        } else {
          single = pickTitle(`${entry.id}-${week}`)
          push(entry.id, 'up', `${name} drops "${single}" and the request line melts.`)
        }
      } else if (event === 'radio') {
        popularity += 2 + Math.random() * 3
        momentum += 0.12 + Math.random() * 0.14
        push(entry.id, 'up', `"${single}" is added to 40+ stations overnight for ${name}.`)
      } else if (event === 'tour') {
        popularity += 2 + Math.random() * 3.5
        momentum += 0.1
        push(entry.id, 'up', `${name} sells out three nights; the merch queue wraps the block.`)
      } else if (event === 'viral') {
        popularity += 7 + Math.random() * 6
        momentum += 0.45 + Math.random() * 0.2
        push(entry.id, 'up', `A ${name} clip goes everywhere. The crowd is early and loud.`)
      } else if (event === 'scandal') {
        popularity -= 3 + Math.random() * 5
        momentum -= 0.25 + Math.random() * 0.25
        push(entry.id, 'down', `${name} catches a scandal. The blogs run it all week.`)
      } else {
        popularity -= 2 + Math.random() * 3.5
        momentum -= 0.15 + Math.random() * 0.15
        push(entry.id, 'down', `An unfinished ${name} record leaks. The mix is not kind.`)
      }
    }

    popularity = clamp(popularity + momentum * 0.9, 5, 99)
    const spins = Math.max(
      240,
      Math.round(820 + popularity * 40 + momentum * 1500 + (Math.random() - 0.5) * 520),
    )

    return {
      ...entry,
      single: mappedSingle ?? single,
      popularity,
      momentum: clamp(momentum, -1, 1),
      prevSpins: entry.spins,
      spins,
      prevRank: oldRanks.get(entry.id) ?? null,
      weeks: entry.weeks + 1,
      peak: entry.peak,
      impact: 0,
    }
  })

  const ranked = rerank(advanced)
  if (ranked[0] && ranked[0].id !== previousLeader) {
    const leader = getArtist(ranked[0].id)
    push(ranked[0].id, 'up', `${leader.name} takes the #1 spot. The whole board shifts under it.`)
  }

  return {
    ...state,
    week,
    entries: ranked,
    news: [...news.reverse(), ...state.news].slice(0, MAX_NEWS),
  }
}

/** Push battle plays into the live chart. Returns a new state with re-ranked entries. */
export function applyChartImpact(state: ChartState, plays: Record<string, number>): ChartState {
  const cleaned = Object.entries(plays).filter(([id, count]) => count > 0 && Boolean(getArtist(id)))
  if (!cleaned.length) return state

  const entries = state.entries.map((entry) => {
    const count = plays[entry.id] ?? 0
    if (count <= 0) return entry
    return {
      ...entry,
      popularity: clamp(entry.popularity + Math.min(5, count * 0.32), 5, 99),
      momentum: clamp(entry.momentum + Math.min(0.6, count * 0.05), -1, 1),
      spins: entry.spins + count * 60,
      impact: entry.impact + count,
    }
  })

  const [topId, topPlays] = cleaned.sort((a, b) => b[1] - a[1])[0]
  const lead = getArtist(topId)
  const ranked = rerank(entries)
  return addChartNews(
    { ...state, entries: ranked },
    `YOUR SET PUT ${topPlays} PLAYS ON ${lead.name}. ${ranked.find((entry) => entry.id === topId)?.spins.toLocaleString('en-US')} SPINS THIS WEEK.`,
    topId,
    'up',
  )
}

export interface ChartBoost {
  popularity?: number
  spins?: number
  momentum?: number
  note?: string
}

/** Nudge an artist after a label release, then re-rank the board. */
export function applyChartBoost(state: ChartState, artistId: string, boost: ChartBoost): ChartState {
  const exists = state.entries.some((entry) => entry.id === artistId)
  if (!exists) return state
  const entries = state.entries.map((entry) =>
    entry.id === artistId
      ? {
          ...entry,
          popularity: clamp(entry.popularity + (boost.popularity ?? 0), 5, 99),
          spins: Math.max(1, entry.spins + Math.round(boost.spins ?? 0)),
          momentum: clamp(entry.momentum + (boost.momentum ?? 0), -1, 1),
        }
      : entry,
  )
  const ranked = rerank(entries)
  const next = { ...state, entries: ranked }
  return boost.note ? addChartNews(next, boost.note, artistId, 'up') : next
}

export function movement(entry: ChartEntry): { label: string; dir: 'up' | 'down' | 'flat' | 'new' } {
  if (entry.prevRank === null) return { label: 'NEW', dir: 'new' }
  const delta = entry.prevRank - entry.rank
  if (delta > 0) return { label: `▲ ${delta}`, dir: 'up' }
  if (delta < 0) return { label: `▼ ${Math.abs(delta)}`, dir: 'down' }
  return { label: '—', dir: 'flat' }
}
