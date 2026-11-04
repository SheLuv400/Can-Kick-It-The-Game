import { createFreebuffAuth } from '@freebuff/auth'

let auth
let schemaReady

function getAuth(env) {
  if (!auth) {
    auth = createFreebuffAuth({
      clientId: env.FREEBUFF_CLIENT_ID,
      issuer: env.FREEBUFF_ISSUER,
      baseUrl: env.APP_ORIGIN,
    })
  }
  return auth
}

function ensureSchema(env) {
  schemaReady ??= env.DB.prepare(
    'CREATE TABLE IF NOT EXISTS site_owner (id INTEGER PRIMARY KEY CHECK (id = 1), sub TEXT NOT NULL)',
  ).run()
  return schemaReady
}

async function claimOrCheckOwner(env, sub) {
  await ensureSchema(env)

  const existing = await env.DB.prepare('SELECT sub FROM site_owner WHERE id = 1').first()
  if (existing) return existing.sub === sub

  await env.DB.prepare('INSERT OR IGNORE INTO site_owner (id, sub) VALUES (1, ?)').bind(sub).run()
  const claimed = await env.DB.prepare('SELECT sub FROM site_owner WHERE id = 1').first()
  return Boolean(claimed && claimed.sub === sub)
}

export default {
  fetch(request, env) {
    const auth = getAuth(env)

    return auth.wrap(async (req) => {
      const url = new URL(req.url)
      const user = await auth.getUser(req)

      if (!user) {
        if ((req.headers.get('accept') || '').includes('text/html')) {
          const signin = new URL('/auth/freebuff/signin', env.APP_ORIGIN)
          signin.searchParams.set('returnTo', url.pathname + url.search)
          return Response.redirect(signin.toString(), 302)
        }
        return new Response('Sign in required', {
          status: 401,
          headers: { 'cache-control': 'no-store' },
        })
      }

      if (!(await claimOrCheckOwner(env, user.sub))) {
        return new Response('This link is locked to another Freebuff account.', {
          status: 403,
          headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
        })
      }

      const response = await env.ASSETS.fetch(req)
      const headers = new Headers(response.headers)
      headers.set('cache-control', 'no-store')
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    })(request, env)
  },
}
