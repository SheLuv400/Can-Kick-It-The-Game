/**
 * Online safety ledger.
 *
 * Quit penalties are local to the device so a CPU-only player never receives
 * one. Report bans are global and live in the Sites Worker's D1 database; the
 * game remains playable if that API is unavailable, but reports are never
 * faked locally.
 */

export type OnlineReportReason =
  | 'bullying'
  | 'harassment'
  | 'racial-abuse'
  | 'cheating'
  | 'other'

export const ONLINE_REPORT_REASONS: Array<{
  id: OnlineReportReason
  label: string
  detail: string
}> = [
  {
    id: 'bullying',
    label: 'BULLYING',
    detail: 'Targeted intimidation, threats or repeated cruelty.',
  },
  {
    id: 'harassment',
    label: 'HARASSMENT',
    detail: 'Unwanted sexual attention, stalking or repeated abuse.',
  },
  {
    id: 'racial-abuse',
    label: 'RACIAL / VOCAL ABUSE',
    detail: 'Racial slurs, hate speech or abusive voice chat.',
  },
  {
    id: 'cheating',
    label: 'CHEATING',
    detail: 'Exploiting bugs, ghosting the result or tampering with a match.',
  },
  {
    id: 'other',
    label: 'OTHER SAFETY ISSUE',
    detail: 'Anything else that made the room unsafe.',
  },
]

export const PUBLIC_ONLINE_API = 'https://site-feacdc5bc49e490794946b6e6b47f727.freebuff.page'
export const QUIT_LIMIT = 3
export const QUIT_WINDOW_MS = 2 * 60 * 60 * 1000
export const QUIT_COOLDOWN_MS = 15 * 60 * 1000

const QUIT_STORAGE_KEY = 'ciki.online.quits.v1'

interface QuitLedger {
  quits: number[]
  cooldownUntil: number
}

export interface QuitPenalty {
  active: boolean
  count: number
  limit: number
  windowMs: number
  cooldownUntil: number
  remainingMs: number
}

export interface OnlineBanStatus {
  available: boolean
  active: boolean
  bannedUntil: number
  banLevel: number
  remainingMs: number
}

export interface OnlinePenalty {
  active: boolean
  source: 'quit' | 'report' | null
  until: number
  remainingMs: number
  quitCount: number
  quitLimit: number
}

export interface OnlineReportResult {
  accepted: boolean
  reports: number
  needed: number
  banApplied: boolean
  banMinutes?: number
  bannedUntil?: number
  banLevel?: number
}

export interface OnlineReportInput {
  targetId?: string
  targetName: string
  reporterId: string
  reason: OnlineReportReason
  note?: string
  roomCode?: string
}

function apiBase(): string {
  const configured = import.meta.env.VITE_ONLINE_API_BASE
  if (typeof configured === 'string' && configured.trim()) {
    return configured.replace(/\/+$/, '')
  }
  if (typeof window === 'undefined') return PUBLIC_ONLINE_API
  const host = window.location.hostname
  if (host.endsWith('.freebuff.page')) return window.location.origin
  return PUBLIC_ONLINE_API
}

function readLedger(): QuitLedger {
  try {
    const raw = localStorage.getItem(QUIT_STORAGE_KEY)
    if (!raw) return { quits: [], cooldownUntil: 0 }
    const parsed = JSON.parse(raw) as Partial<QuitLedger> | null
    return {
      quits: Array.isArray(parsed?.quits)
        ? parsed.quits
            .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
            .slice(-20)
        : [],
      cooldownUntil:
        typeof parsed?.cooldownUntil === 'number' && Number.isFinite(parsed.cooldownUntil)
          ? Math.max(0, parsed.cooldownUntil)
          : 0,
    }
  } catch {
    return { quits: [], cooldownUntil: 0 }
  }
}

function writeLedger(ledger: QuitLedger) {
  try {
    localStorage.setItem(QUIT_STORAGE_KEY, JSON.stringify(ledger))
  } catch {
    // A blocked storage API must not break the online exit flow.
  }
}

export function readQuitPenalty(now = Date.now()): QuitPenalty {
  const ledger = readLedger()
  const recent = ledger.quits.filter((at) => now - at < QUIT_WINDOW_MS)
  const active = ledger.cooldownUntil > now
  return {
    active,
    count: recent.length,
    limit: QUIT_LIMIT,
    windowMs: QUIT_WINDOW_MS,
    cooldownUntil: ledger.cooldownUntil,
    remainingMs: active ? ledger.cooldownUntil - now : 0,
  }
}

/** Record one self-initiated online exit and start a cooldown at the limit. */
export function recordOnlineQuit(now = Date.now()): QuitPenalty {
  const ledger = readLedger()
  const recent = ledger.quits.filter((at) => now - at < QUIT_WINDOW_MS)
  recent.push(now)
  let cooldownUntil = ledger.cooldownUntil
  if (recent.length >= QUIT_LIMIT && cooldownUntil <= now) {
    cooldownUntil = now + QUIT_COOLDOWN_MS
  }
  writeLedger({ quits: recent.slice(-20), cooldownUntil })
  return readQuitPenalty(now)
}

export async function fetchOnlineBan(playerId: string): Promise<OnlineBanStatus> {
  const empty: OnlineBanStatus = {
    available: false,
    active: false,
    bannedUntil: 0,
    banLevel: 0,
    remainingMs: 0,
  }
  if (!playerId) return empty
  try {
    const response = await fetch(
      `${apiBase()}/api/online/conduct?playerId=${encodeURIComponent(playerId)}`,
      { cache: 'no-store' },
    )
    if (!response.ok) return empty
    const data = (await response.json()) as {
      active?: boolean
      bannedUntil?: number
      banLevel?: number
      remainingMs?: number
    }
    const bannedUntil = Number(data.bannedUntil ?? 0)
    const remainingMs = Math.max(0, Number(data.remainingMs ?? 0))
    return {
      available: true,
      active: Boolean(data.active) && remainingMs > 0,
      bannedUntil,
      banLevel: Number(data.banLevel ?? 0),
      remainingMs,
    }
  } catch {
    return empty
  }
}

export function mergeOnlinePenalty(
  ban: OnlineBanStatus | null,
  quit: QuitPenalty,
  now = Date.now(),
): OnlinePenalty {
  const reportRemaining = ban?.active ? Math.max(0, ban.bannedUntil - now) : 0
  if (reportRemaining > 0) {
    return {
      active: true,
      source: 'report',
      until: ban?.bannedUntil ?? now + reportRemaining,
      remainingMs: reportRemaining,
      quitCount: quit.count,
      quitLimit: quit.limit,
    }
  }
  const quitRemaining = quit.active ? Math.max(0, quit.cooldownUntil - now) : 0
  if (quitRemaining > 0) {
    return {
      active: true,
      source: 'quit',
      until: quit.cooldownUntil,
      remainingMs: quitRemaining,
      quitCount: quit.count,
      quitLimit: quit.limit,
    }
  }
  return {
    active: false,
    source: null,
    until: 0,
    remainingMs: 0,
    quitCount: quit.count,
    quitLimit: quit.limit,
  }
}

export async function submitOnlineReport(input: OnlineReportInput): Promise<OnlineReportResult> {
  const response = await fetch(`${apiBase()}/api/online/report`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      targetId: input.targetId,
      targetName: input.targetName,
      reporterId: input.reporterId,
      reason: input.reason,
      note: input.note ?? '',
      roomCode: input.roomCode ?? '',
    }),
  })
  const data = (await response.json().catch(() => ({}))) as Partial<OnlineReportResult> & {
    error?: string
  }
  if (!response.ok || data.accepted !== true) {
    if (data.error === 'ALREADY_REPORTED_TODAY') {
      throw new Error('YOU ALREADY REPORTED THIS PLAYER TODAY.')
    }
    if (data.error === 'CONDUCT_OFFLINE') {
      throw new Error('THE SAFETY DESK IS OFFLINE. TRY AGAIN LATER.')
    }
    throw new Error('THE REPORT COULD NOT BE SENT. TRY AGAIN.')
  }
  return {
    accepted: true,
    reports: Number(data.reports ?? 0),
    needed: Number(data.needed ?? QUIT_LIMIT),
    banApplied: Boolean(data.banApplied),
    banMinutes: data.banMinutes,
    bannedUntil: data.bannedUntil,
    banLevel: data.banLevel,
  }
}

export function formatPenaltyClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
