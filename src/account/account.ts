import { careerTitleForId } from '../game/career-data'

export interface FriendRecord {
  code: string
  name: string
  addedAt: number
}

export type MatchResult = 'win' | 'loss' | 'draw'
export type MatchMode = 'solo' | 'casual' | 'ranked'

export interface PlayerStats {
  matches: number
  wins: number
  losses: number
  draws: number
  streak: number
  bestStreak: number
  attacks: number
  actions: number
  damage: number
  kos: number
  features: number
  encores: number
  crateDraws: number
  responseMs: number
  responseSamples: number
  artistPlays: Record<string, number>
  casualWins: number
  casualLosses: number
  rankedWins: number
  rankedLosses: number
  badgeXp: number
  badgeTiers: number
  artistLevels: number
  labelScore: number
  chartHeat: number
  lastPlayed: number
  updatedAt: number
}

export interface PlayerLegacyInput {
  badgeXp: number
  badgeTiers: number
  artistLevels: number
  labelScore: number
  chartHeat: number
}

export interface MatchStatsInput {
  result: MatchResult
  mode: MatchMode
  plays?: Record<string, number>
  attacks?: number
  actions?: number
  damage?: number
  kos?: number
  features?: number
  encores?: number
  crateDraws?: number
  responseMs?: number
  responseSamples?: number
}

export interface AccountRecord {
  stats: PlayerStats
  avatarArtistId: string | null
  activeTitleId: string | null
  id: string
  username: string
  usernameKey: string
  salt: string
  passwordHash: string
  friendCode: string
  friends: FriendRecord[]
  createdAt: number
  lastLogin: number
}

export interface AccountPublic {
  id: string
  username: string
  avatarArtistId: string | null
  activeTitleId: string | null
  friendCode: string
  friends: FriendRecord[]
  stats: PlayerStats
  createdAt: number
}

const ACCOUNTS_KEY = 'ciki.accounts.v1'
const SESSION_KEY = 'ciki.session.v1'
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const USERNAME_PATTERN = /^[A-Za-z0-9 _-]{3,18}$/

function nonNegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0
}

export function emptyPlayerStats(): PlayerStats {
  return {
    matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    streak: 0,
    bestStreak: 0,
    attacks: 0,
    actions: 0,
    damage: 0,
    kos: 0,
    features: 0,
    encores: 0,
    crateDraws: 0,
    responseMs: 0,
    responseSamples: 0,
    artistPlays: {},
    casualWins: 0,
    casualLosses: 0,
    rankedWins: 0,
    rankedLosses: 0,
    badgeXp: 0,
    badgeTiers: 0,
    artistLevels: 0,
    labelScore: 0,
    chartHeat: 0,
    lastPlayed: 0,
    updatedAt: 0,
  }
}

export function normalizePlayerStats(raw: unknown): PlayerStats {
  const stats = emptyPlayerStats()
  if (!raw || typeof raw !== 'object') return stats
  const candidate = raw as Partial<PlayerStats>
  for (const key of [
    'matches', 'wins', 'losses', 'draws', 'streak', 'bestStreak', 'attacks', 'actions',
    'damage', 'kos', 'features', 'encores', 'crateDraws', 'responseMs', 'responseSamples',
    'casualWins', 'casualLosses', 'rankedWins', 'rankedLosses', 'badgeXp', 'badgeTiers',
    'artistLevels', 'labelScore', 'chartHeat', 'lastPlayed', 'updatedAt',
  ] as const) {
    stats[key] = nonNegativeInteger(candidate[key])
  }
  if (candidate.artistPlays && typeof candidate.artistPlays === 'object') {
    for (const [artistId, plays] of Object.entries(candidate.artistPlays)) {
      if (typeof artistId === 'string' && artistId.length <= 48) {
        stats.artistPlays[artistId] = nonNegativeInteger(plays)
      }
    }
  }
  return stats
}

export function applyMatchStats(stats: PlayerStats, input: MatchStatsInput): PlayerStats {
  const next = normalizePlayerStats(stats)
  next.matches += 1
  next.lastPlayed = Date.now()
  next.updatedAt = next.lastPlayed
  if (input.result === 'win') {
    next.wins += 1
    next.streak += 1
    next.bestStreak = Math.max(next.bestStreak, next.streak)
  } else if (input.result === 'loss') {
    next.losses += 1
    next.streak = 0
  } else {
    next.draws += 1
  }
  if (input.mode === 'casual') {
    if (input.result === 'win') next.casualWins += 1
    else if (input.result === 'loss') next.casualLosses += 1
  } else if (input.mode === 'ranked') {
    if (input.result === 'win') next.rankedWins += 1
    else if (input.result === 'loss') next.rankedLosses += 1
  }
  next.attacks += nonNegativeInteger(input.attacks)
  next.actions += nonNegativeInteger(input.actions)
  next.damage += nonNegativeInteger(input.damage)
  next.kos += nonNegativeInteger(input.kos)
  next.features += nonNegativeInteger(input.features)
  next.encores += nonNegativeInteger(input.encores)
  next.crateDraws += nonNegativeInteger(input.crateDraws)
  next.responseMs += nonNegativeInteger(input.responseMs)
  next.responseSamples += nonNegativeInteger(input.responseSamples)
  for (const [artistId, plays] of Object.entries(input.plays ?? {})) {
    if (typeof artistId !== 'string' || artistId.length > 48) continue
    next.artistPlays[artistId] =
      (next.artistPlays[artistId] ?? 0) + nonNegativeInteger(plays)
  }
  return next
}

export function favoriteArtistId(stats: PlayerStats): string | null {
  let best: string | null = null
  let bestPlays = 0
  for (const [artistId, plays] of Object.entries(stats.artistPlays)) {
    if (plays > bestPlays) {
      best = artistId
      bestPlays = plays
    }
  }
  return best
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

async function derivePassword(password: string, salt: string): Promise<string> {
  if (!crypto.subtle) throw new Error('PASSWORD SECURITY IS NOT AVAILABLE IN THIS BROWSER.')
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: fromBase64(salt),
      iterations: 120_000,
      hash: 'SHA-256',
    },
    key,
    256,
  )
  return toBase64(new Uint8Array(bits))
}

function loadRecords(): AccountRecord[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((entry): entry is AccountRecord => {
        if (!entry || typeof entry !== 'object') return false
        const candidate = entry as Partial<AccountRecord>
        return (
          typeof candidate.id === 'string' &&
          typeof candidate.username === 'string' &&
          typeof candidate.usernameKey === 'string' &&
          typeof candidate.salt === 'string' &&
          typeof candidate.passwordHash === 'string' &&
          typeof candidate.friendCode === 'string' &&
          Array.isArray(candidate.friends)
        )
      })
      .map((record) => ({
        ...record,
        avatarArtistId: normalizeAvatarArtistId(record.avatarArtistId),
        activeTitleId: normalizeAccountTitleId(record.activeTitleId),
        stats: normalizePlayerStats(record.stats),
      }))
  } catch {
    return []
  }
}

function saveRecords(records: AccountRecord[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(records))
}

function normalizeAvatarArtistId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const clean = value.trim().slice(0, 48)
  return clean || null
}

function normalizeAccountTitleId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return careerTitleForId(value)?.id ?? null
}

function publicRecord(record: AccountRecord): AccountPublic {
  return {
    id: record.id,
    username: record.username,
    avatarArtistId: record.avatarArtistId ?? null,
    activeTitleId: record.activeTitleId ?? null,
    friendCode: record.friendCode,
    friends: [...record.friends],
    stats: { ...record.stats, artistPlays: { ...record.stats.artistPlays } },
    createdAt: record.createdAt,
  }
}

function newFriendCode(records: AccountRecord[]): string {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const bytes = randomBytes(6)
    const code = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('')
    if (!records.some((record) => record.friendCode === code)) return code
  }
  throw new Error('COULD NOT CREATE A FRIEND CODE. TRY AGAIN.')
}

export function normalizeFriendCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

function validateCredentials(username: string, password: string) {
  const clean = username.trim()
  if (!USERNAME_PATTERN.test(clean)) {
    throw new Error('USERNAME: 3–18 LETTERS, NUMBERS, SPACES, _ OR -.')
  }
  if (password.length < 6) throw new Error('PASSWORD MUST BE AT LEAST 6 CHARACTERS.')
  if (password.length > 72) throw new Error('PASSWORD IS TOO LONG.')
  return clean
}

export async function registerAccount(username: string, password: string): Promise<AccountPublic> {
  const clean = validateCredentials(username, password)
  const records = loadRecords()
  const usernameKey = clean.toLowerCase()
  if (records.some((record) => record.usernameKey === usernameKey)) {
    throw new Error('THAT USERNAME IS ALREADY ON THIS DEVICE.')
  }
  const salt = toBase64(randomBytes(16))
  const record: AccountRecord = {
    id: `acct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    avatarArtistId: null,
    activeTitleId: null,
    username: clean,
    usernameKey,
    salt,
    passwordHash: await derivePassword(password, salt),
    friendCode: newFriendCode(records),
    friends: [],
    stats: emptyPlayerStats(),
    createdAt: Date.now(),
    lastLogin: Date.now(),
  }
  saveRecords([...records, record])
  localStorage.setItem(SESSION_KEY, record.id)
  return publicRecord(record)
}

export async function signInAccount(username: string, password: string): Promise<AccountPublic> {
  const clean = username.trim()
  if (!clean || !password) throw new Error('ENTER YOUR USERNAME AND PASSWORD.')
  const records = loadRecords()
  const record = records.find((entry) => entry.usernameKey === clean.toLowerCase())
  if (!record) throw new Error('NO ACCOUNT WITH THAT USERNAME ON THIS DEVICE.')
  const hash = await derivePassword(password, record.salt)
  if (hash !== record.passwordHash) throw new Error('WRONG PASSWORD.')
  record.lastLogin = Date.now()
  saveRecords(records.map((entry) => (entry.id === record.id ? record : entry)))
  localStorage.setItem(SESSION_KEY, record.id)
  return publicRecord(record)
}

export function loadSessionAccount(): AccountPublic | null {
  try {
    const id = localStorage.getItem(SESSION_KEY)
    if (!id) return null
    const record = loadRecords().find((entry) => entry.id === id)
    return record ? publicRecord(record) : null
  } catch {
    return null
  }
}

export function signOutSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function addFriendToAccount(accountId: string, rawCode: string): AccountPublic {
  const code = normalizeFriendCode(rawCode)
  if (code.length !== 6) throw new Error('FRIEND CODE MUST BE 6 CHARACTERS.')
  const records = loadRecords()
  const record = records.find((entry) => entry.id === accountId)
  if (!record) throw new Error('SIGN IN AGAIN TO ADD A FRIEND.')
  if (code === record.friendCode) throw new Error('THAT IS YOUR OWN FRIEND CODE.')
  if (record.friends.some((friend) => friend.code === code)) {
    throw new Error('THAT FRIEND IS ALREADY ON YOUR LIST.')
  }
  record.friends = [
    ...record.friends,
    { code, name: `FRIEND ${code}`, addedAt: Date.now() },
  ].slice(0, 40)
  saveRecords(records.map((entry) => (entry.id === accountId ? record : entry)))
  return publicRecord(record)
}

export function removeFriendFromAccount(accountId: string, code: string): AccountPublic {
  const records = loadRecords()
  const record = records.find((entry) => entry.id === accountId)
  if (!record) throw new Error('SIGN IN AGAIN TO EDIT FRIENDS.')
  record.friends = record.friends.filter((friend) => friend.code !== code)
  saveRecords(records.map((entry) => (entry.id === accountId ? record : entry)))
  return publicRecord(record)
}

export function syncLegacyForAccount(
  accountId: string,
  input: PlayerLegacyInput,
): AccountPublic {
  const records = loadRecords()
  const record = records.find((entry) => entry.id === accountId)
  if (!record) throw new Error('SIGN IN AGAIN TO SYNC YOUR BILLBOARD.')
  const clean: PlayerLegacyInput = {
    badgeXp: nonNegativeInteger(input.badgeXp),
    badgeTiers: nonNegativeInteger(input.badgeTiers),
    artistLevels: nonNegativeInteger(input.artistLevels),
    labelScore: nonNegativeInteger(input.labelScore),
    chartHeat: nonNegativeInteger(input.chartHeat),
  }
  const changed = (Object.keys(clean) as Array<keyof PlayerLegacyInput>).some(
    (key) => record.stats[key] !== clean[key],
  )
  if (!changed) return publicRecord(record)
  record.stats = { ...record.stats, ...clean, updatedAt: Date.now() }
  saveRecords(records.map((entry) => (entry.id === accountId ? record : entry)))
  return publicRecord(record)
}

export function recordMatchForAccount(accountId: string, input: MatchStatsInput): AccountPublic {
  const records = loadRecords()
  const record = records.find((entry) => entry.id === accountId)
  if (!record) throw new Error('SIGN IN AGAIN TO RECORD MATCH STATS.')
  record.stats = applyMatchStats(record.stats, input)
  saveRecords(records.map((entry) => (entry.id === accountId ? record : entry)))
  return publicRecord(record)
}

export function setAccountAvatar(accountId: string, artistId: string | null): AccountPublic {
  const records = loadRecords()
  const record = records.find((entry) => entry.id === accountId)
  if (!record) throw new Error('SIGN IN AGAIN TO EDIT YOUR PROFILE ARTIST.')
  record.avatarArtistId = normalizeAvatarArtistId(artistId)
  saveRecords(records.map((entry) => (entry.id === accountId ? record : entry)))
  return publicRecord(record)
}

export function setAccountTitle(accountId: string, titleId: string | null): AccountPublic {
  const records = loadRecords()
  const record = records.find((entry) => entry.id === accountId)
  if (!record) throw new Error('SIGN IN AGAIN TO EDIT YOUR CARD TITLE.')
  record.activeTitleId = normalizeAccountTitleId(titleId)
  saveRecords(records.map((entry) => (entry.id === accountId ? record : entry)))
  return publicRecord(record)
}

export function rememberFriendName(accountId: string, code: string, name: string): AccountPublic | null {
  const clean = name.trim().slice(0, 18)
  if (!clean) return null
  const records = loadRecords()
  const record = records.find((entry) => entry.id === accountId)
  const friend = record?.friends.find((entry) => entry.code === code)
  if (!record || !friend || friend.name === clean) return null
  friend.name = clean
  saveRecords(records.map((entry) => (entry.id === accountId ? record : entry)))
  return publicRecord(record)
}
