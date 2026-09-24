const ADMIN_EMAIL = 'Timekeeper.1120@gmail.com'
const ADMIN_NAME = 'Bobur Babajanov'
const ROLES = ['admin', 'director', 'deputy', 'head', 'recruiter']

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function headers(serviceKey, extra = {}) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function rest(url, serviceKey, path, init = {}) {
  const res = await fetch(`${url}${path}`, {
    ...init,
    headers: { ...headers(serviceKey), ...(init.headers || {}) },
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { message: text }
  }
  return { ok: res.ok, status: res.status, data }
}

async function authUserByJwt(url, serviceKey, jwt) {
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${jwt}` },
  })
  if (!res.ok) return null
  return res.json()
}

async function profileRole(url, serviceKey, id) {
  const { data } = await rest(url, serviceKey, `/rest/v1/profiles?id=eq.${id}&select=role`)
  return Array.isArray(data) && data[0] ? data[0].role : null
}

async function profilesCount(url, serviceKey) {
  const res = await fetch(`${url}/rest/v1/profiles?select=id`, {
    headers: { ...headers(serviceKey), Prefer: 'count=exact', Range: '0-0' },
  })
  const cr = res.headers.get('content-range') || '0/0'
  const total = Number(cr.split('/')[1] || 0)
  return Number.isFinite(total) ? total : 0
}

async function upsertProfile(url, serviceKey, row) {
  return rest(url, serviceKey, '/rest/v1/profiles', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(row),
  })
}

async function findAuthByEmail(url, serviceKey, email) {
  const target = email.toLowerCase()
  for (let page = 1; page <= 10; page++) {
    const { ok, data } = await rest(url, serviceKey, `/auth/v1/admin/users?page=${page}&per_page=200`)
    if (!ok) return null
    const users = data?.users || []
    const found = users.find((u) => (u.email || '').toLowerCase() === target)
    if (found) return found
    if (users.length < 200) break
  }
  return null
}

async function requireAdmin(req, url, serviceKey) {
  const authHeader = req.headers.authorization || req.headers.Authorization || ''
  const jwt = String(authHeader).startsWith('Bearer ') ? String(authHeader).slice(7) : ''
  if (!jwt) return { error: 'auth', status: 401 }
  const me = await authUserByJwt(url, serviceKey, jwt)
  if (!me?.id) return { error: 'auth', status: 401 }
  const role = await profileRole(url, serviceKey, me.id)
  if (role !== 'admin') return { error: 'forbidden', status: 403 }
  return { me }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }
  if (req.method !== 'POST') {
    json(res, 405, { error: 'method' })
    return
  }

  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !serviceKey) {
    json(res, 500, {
      error:
        'Server sozlanmagan: .env / Vercel ga SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY qo‘ying (Secret, VITE_ emas)',
    })
    return
  }

  const payload = await readJson(req)
  if (!payload) {
    json(res, 400, { error: 'json' })
    return
  }
  const action = String(payload.action || '')

  try {
    if (action === 'setup') {
      const password = String(payload.password || '')
      if (password.length < 6) {
        json(res, 400, { error: 'weak' })
        return
      }
      if ((await profilesCount(url, serviceKey)) > 0) {
        json(res, 400, { error: 'exists' })
        return
      }
      let user = await findAuthByEmail(url, serviceKey, ADMIN_EMAIL)
      if (user) {
        const upd = await rest(url, serviceKey, `/auth/v1/admin/users/${user.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            password,
            email_confirm: true,
            user_metadata: { name: ADMIN_NAME, role: 'admin' },
          }),
        })
        if (!upd.ok) {
          json(res, 400, { error: upd.data?.msg || upd.data?.message || 'update' })
          return
        }
      } else {
        const created = await rest(url, serviceKey, '/auth/v1/admin/users', {
          method: 'POST',
          body: JSON.stringify({
            email: ADMIN_EMAIL,
            password,
            email_confirm: true,
            user_metadata: { name: ADMIN_NAME, role: 'admin' },
          }),
        })
        if (!created.ok || !created.data?.id) {
          json(res, 400, { error: created.data?.msg || created.data?.message || 'create' })
          return
        }
        user = created.data
      }
      const ins = await upsertProfile(url, serviceKey, {
        id: user.id,
        name: ADMIN_NAME,
        email: ADMIN_EMAIL.toLowerCase(),
        role: 'admin',
      })
      if (!ins.ok) {
        json(res, 400, { error: ins.data?.message || 'profile' })
        return
      }
      json(res, 200, { ok: true })
      return
    }

    const gate = await requireAdmin(req, url, serviceKey)
    if (gate.error) {
      json(res, gate.status, { error: gate.error })
      return
    }

    if (action === 'create') {
      const name = String(payload.name || '').trim()
      const email = String(payload.email || '').trim().toLowerCase()
      const password = String(payload.password || '')
      const role = String(payload.role || 'recruiter')
      if (!name || !email) {
        json(res, 400, { error: 'required' })
        return
      }
      if (password.length < 6) {
        json(res, 400, { error: 'weak' })
        return
      }
      if (!ROLES.includes(role)) {
        json(res, 400, { error: 'role' })
        return
      }
      const created = await rest(url, serviceKey, '/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: { name, role },
        }),
      })
      if (!created.ok || !created.data?.id) {
        json(res, 400, { error: created.data?.msg || created.data?.message || 'exists' })
        return
      }
      const ins = await upsertProfile(url, serviceKey, {
        id: created.data.id,
        name,
        email,
        role,
      })
      if (!ins.ok) {
        json(res, 400, { error: ins.data?.message || 'profile' })
        return
      }
      json(res, 200, { ok: true, id: created.data.id })
      return
    }

    if (action === 'setPassword') {
      const id = String(payload.id || '')
      const password = String(payload.password || '')
      if (!id || password.length < 6) {
        json(res, 400, { error: 'weak' })
        return
      }
      const upd = await rest(url, serviceKey, `/auth/v1/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ password }),
      })
      if (!upd.ok) {
        json(res, 400, { error: upd.data?.msg || upd.data?.message || 'password' })
        return
      }
      json(res, 200, { ok: true })
      return
    }

    if (action === 'delete') {
      const id = String(payload.id || '')
      if (!id || id === gate.me.id) {
        json(res, 400, { error: 'self' })
        return
      }
      const targetRole = await profileRole(url, serviceKey, id)
      if (targetRole === 'admin') {
        const { data } = await rest(url, serviceKey, '/rest/v1/profiles?role=eq.admin&select=id')
        if (Array.isArray(data) && data.length <= 1) {
          json(res, 400, { error: 'lastAdmin' })
          return
        }
      }
      const del = await rest(url, serviceKey, `/auth/v1/admin/users/${id}`, { method: 'DELETE' })
      if (!del.ok) {
        json(res, 400, { error: del.data?.msg || del.data?.message || 'delete' })
        return
      }
      json(res, 200, { ok: true })
      return
    }

    if (action === 'update') {
      const id = String(payload.id || '')
      const patch = {}
      if (typeof payload.name === 'string') patch.name = payload.name.trim()
      if (typeof payload.email === 'string') patch.email = payload.email.trim().toLowerCase()
      if (typeof payload.role === 'string') patch.role = payload.role
      if (!id || !Object.keys(patch).length) {
        json(res, 400, { error: 'required' })
        return
      }
      if (patch.role && !ROLES.includes(patch.role)) {
        json(res, 400, { error: 'role' })
        return
      }
      if (patch.role && patch.role !== 'admin') {
        const targetRole = await profileRole(url, serviceKey, id)
        if (targetRole === 'admin') {
          const { data } = await rest(url, serviceKey, '/rest/v1/profiles?role=eq.admin&select=id')
          if (Array.isArray(data) && data.length <= 1) {
            json(res, 400, { error: 'lastAdmin' })
            return
          }
        }
      }
      if (patch.email) {
        const upd = await rest(url, serviceKey, `/auth/v1/admin/users/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ email: patch.email }),
        })
        if (!upd.ok) {
          json(res, 400, { error: upd.data?.msg || upd.data?.message || 'email' })
          return
        }
      }
      const qs = new URLSearchParams(patch).toString()
      const ins = await rest(url, serviceKey, `/rest/v1/profiles?id=eq.${id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(patch),
      })
      if (!ins.ok) {
        json(res, 400, { error: ins.data?.message || qs || 'update' })
        return
      }
      json(res, 200, { ok: true })
      return
    }

    json(res, 400, { error: 'action' })
  } catch (err) {
    json(res, 500, { error: err instanceof Error ? err.message : 'server' })
  }
}
