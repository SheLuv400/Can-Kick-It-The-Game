/**
 * Public Sites worker.
 *
 * The game is a static client-side app. The only dynamic surface is the
 * online-conduct API: player reports and temporary online bans. It is backed by
 * the site's D1 database when the DB binding is attached. If the binding is
 * absent (for example a local static preview), the game still serves normally
 * and the client reports that the safety desk is offline.
 */

const REPORT_REASONS = new Set([
  'bullying',
  'harassment',
  'racial-abuse',
  'cheating',
  'other',
])
const REPORTS_FOR_BAN = 3
const REPORT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000
const BASE_BAN_MS = 30 * 60 * 1000

let schemaReady = false

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
    },
  })
}

function cleanKey(value) {
  if (typeof value !== 'string') return ''
  return value.trim().toUpperCase().slice(0, 48)
}

function cleanText(value, limit) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, limit)
}

async function ensureSchema(db) {
  if (schemaReady) return
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS online_reports (
        id TEXT PRIMARY KEY,
        target_key TEXT NOT NULL,
        target_name TEXT NOT NULL,
        reporter_key TEXT NOT NULL,
        reason TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        room_code TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        consumed INTEGER NOT NULL DEFAULT 0
      )
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS online_reports_target
      ON online_reports (target_key, created_at)
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS online_reports_reporter
      ON online_reports (target_key, reporter_key, created_at)
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS online_conduct (
        player_key TEXT PRIMARY KEY,
        report_count INTEGER NOT NULL DEFAULT 0,
        ban_level INTEGER NOT NULL DEFAULT 0,
        banned_until INTEGER NOT NULL DEFAULT 0,
        last_report_at INTEGER NOT NULL DEFAULT 0
      )
    `),
  ])
  schemaReady = true
}

async function banStatus(db, playerKey) {
  const row = await db
    .prepare('SELECT ban_level, banned_until FROM online_conduct WHERE player_key = ?')
    .bind(playerKey)
    .first()
  const now = Date.now()
  const bannedUntil = Number(row?.banned_until ?? 0)
  return {
    bannedUntil,
    banLevel: Number(row?.ban_level ?? 0),
    remainingMs: Math.max(0, bannedUntil - now),
  }
}

async function submitReport(db, body) {
  const targetKey = cleanKey(body?.targetId) || cleanKey(body?.targetName)
  const targetName = cleanText(body?.targetName, 32) || targetKey
  const reporterKey = cleanKey(body?.reporterId)
  const reason = cleanText(body?.reason, 32)
  const note = cleanText(body?.note, 280)
  const roomCode = cleanText(body?.roomCode, 8).toUpperCase()

  if (targetKey.length < 2) return json({ error: 'TARGET_REQUIRED' }, 400)
  if (reporterKey.length < 2) return json({ error: 'REPORTER_REQUIRED' }, 400)
  if (targetKey === reporterKey) return json({ error: 'SELF_REPORT' }, 400)
  if (!REPORT_REASONS.has(reason)) return json({ error: 'REASON_REQUIRED' }, 400)

  const now = Date.now()
  const duplicate = await db
    .prepare(
      `SELECT id FROM online_reports
       WHERE target_key = ? AND reporter_key = ? AND created_at >= ? LIMIT 1`,
    )
    .bind(targetKey, reporterKey, now - DUPLICATE_WINDOW_MS)
    .first()
  if (duplicate) return json({ error: 'ALREADY_REPORTED_TODAY' }, 409)

  await db
    .prepare(
      `INSERT INTO online_reports
       (id, target_key, target_name, reporter_key, reason, note, room_code, created_at, consumed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    )
    .bind(
      crypto.randomUUID(),
      targetKey,
      targetName,
      reporterKey,
      reason,
      note,
      roomCode,
      now,
    )
    .run()

  const countRow = await db
    .prepare(
      `SELECT COUNT(DISTINCT reporter_key) AS reports
       FROM online_reports
       WHERE target_key = ? AND created_at >= ? AND consumed = 0`,
    )
    .bind(targetKey, now - REPORT_WINDOW_MS)
    .first()
  const reports = Number(countRow?.reports ?? 0)
  if (reports < REPORTS_FOR_BAN) {
    return json({ accepted: true, reports, needed: REPORTS_FOR_BAN, banApplied: false })
  }

  const current = await banStatus(db, targetKey)
  const banLevel = current.banLevel + 1
  const duration = BASE_BAN_MS * 2 ** (banLevel - 1)
  // Each new report ban starts from this report, not from whatever remained
  // on the previous ban. Level 2 is 60 minutes, not 30 + 60.
  const bannedUntil = now + duration

  await db.batch([
    db
      .prepare(
        `INSERT INTO online_conduct
         (player_key, report_count, ban_level, banned_until, last_report_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(player_key) DO UPDATE SET
           report_count = report_count + excluded.report_count,
           ban_level = excluded.ban_level,
           banned_until = excluded.banned_until,
           last_report_at = excluded.last_report_at`,
      )
      .bind(targetKey, reports, banLevel, bannedUntil, now),
    db
      .prepare(
        `UPDATE online_reports SET consumed = 1
         WHERE target_key = ? AND consumed = 0 AND created_at >= ?`,
      )
      .bind(targetKey, now - REPORT_WINDOW_MS),
  ])

  return json({
    accepted: true,
    reports,
    needed: REPORTS_FOR_BAN,
    banApplied: true,
    banMinutes: Math.round(duration / 60_000),
    bannedUntil,
    banLevel,
  })
}

async function handleApi(request, env) {
  const url = new URL(request.url)
  if (url.pathname === '/api/online/conduct' && request.method === 'GET') {
    const playerKey = cleanKey(url.searchParams.get('playerId'))
    if (playerKey.length < 2) return json({ error: 'PLAYER_REQUIRED' }, 400)
    if (!env.DB) return json({ error: 'CONDUCT_OFFLINE' }, 503)
    await ensureSchema(env.DB)
    const status = await banStatus(env.DB, playerKey)
    return json({ ok: true, ...status, active: status.remainingMs > 0 })
  }

  if (url.pathname === '/api/online/report' && request.method === 'POST') {
    if (!env.DB) return json({ error: 'CONDUCT_OFFLINE' }, 503)
    let body
    try {
      body = await request.json()
    } catch {
      return json({ error: 'BAD_JSON' }, 400)
    }
    await ensureSchema(env.DB)
    return submitReport(env.DB, body)
  }

  return json({ error: 'NOT_FOUND' }, 404)
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/online/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-headers': 'content-type',
            'access-control-allow-methods': 'GET, POST, OPTIONS',
            'access-control-max-age': '86400',
          },
        })
      }
      try {
        return await handleApi(request, env)
      } catch (error) {
        console.error('online conduct api failed', error)
        return json({ error: 'CONDUCT_UNAVAILABLE' }, 503)
      }
    }
    return env.ASSETS.fetch(request)
  },
}
