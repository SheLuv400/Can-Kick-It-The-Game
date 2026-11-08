export type MatchResult = 'win' | 'loss' | 'draw'

export interface LeaderboardEntry {
  name: string
  wins: number
  losses: number
  draws: number
  streak: number
  bestStreak: number
  matches: number
  lastPlayed: number
}

export interface LeaderboardSummary {
  wins: number
  losses: number
  draws: number
  winRate: number
  streak: number
  bestStreak: number
}

const STORAGE_KEY = 'ciki.leaderboard.v1'
const MAX_ENTRIES = 50

function cleanName(name: string): string {
  return name.trim().toUpperCase().slice(0, 18) || 'PLAYER'
}

function freshEntry(name: string, now: number): LeaderboardEntry {
  return {
    name: cleanName(name),
    wins: 0,
    losses: 0,
    draws: 0,
    streak: 0,
    bestStreak: 0,
    matches: 0,
    lastPlayed: now,
  }
}

function applyResult(entry: LeaderboardEntry, result: MatchResult, now: number) {
  entry.matches += 1
  entry.lastPlayed = now
  if (result === 'win') {
    entry.wins += 1
    entry.streak += 1
    entry.bestStreak = Math.max(entry.bestStreak, entry.streak)
  } else if (result === 'loss') {
    entry.losses += 1
    entry.streak = 0
  } else {
    entry.draws += 1
  }
}

function inverse(result: MatchResult): MatchResult {
  if (result === 'win') return 'loss'
  if (result === 'loss') return 'win'
  return 'draw'
}

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((entry): entry is LeaderboardEntry => {
        if (!entry || typeof entry !== 'object') return false
        const candidate = entry as Partial<LeaderboardEntry>
        return typeof candidate.name === 'string' && typeof candidate.wins === 'number'
      })
      .map((entry) => ({
        ...freshEntry(entry.name, entry.lastPlayed ?? 0),
        ...entry,
        name: cleanName(entry.name),
      }))
      .slice(0, MAX_ENTRIES)
  } catch {
    return []
  }
}

export function saveLeaderboard(entries: LeaderboardEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
  } catch {
    // The board is a nice-to-have; storage failures must not break a match.
  }
}

/**
 * Records both players after a private match. The board is stored on this
 * device, so friends you play from this install stay ranked together.
 */
export function recordOnlineMatch(
  self: { name: string; result: MatchResult },
  opponent: { name: string; result: MatchResult },
): LeaderboardEntry[] {
  const now = Date.now()
  const entries = loadLeaderboard()
  const byName = new Map(entries.map((entry) => [cleanName(entry.name), entry]))

  for (const player of [self, opponent]) {
    const name = cleanName(player.name)
    const entry = byName.get(name) ?? freshEntry(name, now)
    applyResult(entry, player.result, now)
    byName.set(name, entry)
  }

  const next = [...byName.values()]
    .sort((a, b) => b.wins - a.wins || b.bestStreak - a.bestStreak || b.matches - a.matches)
    .slice(0, MAX_ENTRIES)
  saveLeaderboard(next)
  return next
}

export function summarize(entries: LeaderboardEntry[], name: string): LeaderboardSummary {
  const entry = entries.find((row) => row.name === cleanName(name))
  if (!entry) return { wins: 0, losses: 0, draws: 0, winRate: 0, streak: 0, bestStreak: 0 }
  const decided = entry.wins + entry.losses
  return {
    wins: entry.wins,
    losses: entry.losses,
    draws: entry.draws,
    winRate: decided > 0 ? entry.wins / decided : 0,
    streak: entry.streak,
    bestStreak: entry.bestStreak,
  }
}

export { inverse as inverseResult }
