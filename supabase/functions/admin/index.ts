import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_EMAIL = 'Timekeeper.1120@gmail.com'
const ADMIN_NAME = 'Bobur Babajanov'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anon || !service) return json({ error: 'env' }, 500)

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'json' }, 400)
  }
  const action = String(payload.action || '')

  if (action === 'setup') {
    const password = String(payload.password || '')
    if (password.length < 6) return json({ error: 'weak' }, 400)
    const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true })
    if ((count || 0) > 0) return json({ error: 'exists' }, 400)
    const created = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { name: ADMIN_NAME, role: 'admin' },
    })
    if (created.error || !created.data.user) return json({ error: created.error?.message || 'create' }, 400)
    const ins = await admin.from('profiles').insert({
      id: created.data.user.id,
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      role: 'admin',
    })
    if (ins.error) return json({ error: ins.error.message }, 400)
    return json({ ok: true })
  }

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'auth' }, 401)
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: authData, error: authErr } = await userClient.auth.getUser(token)
  if (authErr || !authData.user) return json({ error: 'auth' }, 401)
  const { data: me } = await admin.from('profiles').select('role').eq('id', authData.user.id).maybeSingle()
  if (me?.role !== 'admin') return json({ error: 'forbidden' }, 403)

  if (action === 'create') {
    const name = String(payload.name || '').trim()
    const email = String(payload.email || '').trim().toLowerCase()
    const password = String(payload.password || '')
    const role = String(payload.role || 'recruiter')
    if (!name || !email) return json({ error: 'required' }, 400)
    if (password.length < 6) return json({ error: 'weak' }, 400)
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    })
    if (created.error || !created.data.user) return json({ error: created.error?.message || 'exists' }, 400)
    const ins = await admin.from('profiles').insert({
      id: created.data.user.id,
      name,
      email,
      role,
    })
    if (ins.error) return json({ error: ins.error.message }, 400)
    return json({ ok: true, id: created.data.user.id })
  }

  if (action === 'setPassword') {
    const id = String(payload.id || '')
    const password = String(payload.password || '')
    if (!id || password.length < 6) return json({ error: 'weak' }, 400)
    const upd = await admin.auth.admin.updateUserById(id, { password })
    if (upd.error) return json({ error: upd.error.message }, 400)
    return json({ ok: true })
  }

  if (action === 'delete') {
    const id = String(payload.id || '')
    if (!id || id === authData.user.id) return json({ error: 'self' }, 400)
    const { data: target } = await admin.from('profiles').select('role').eq('id', id).maybeSingle()
    if (target?.role === 'admin') {
      const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin')
      if ((count || 0) <= 1) return json({ error: 'lastAdmin' }, 400)
    }
    const del = await admin.auth.admin.deleteUser(id)
    if (del.error) return json({ error: del.error.message }, 400)
    return json({ ok: true })
  }

  if (action === 'update') {
    const id = String(payload.id || '')
    const patch: Record<string, unknown> = {}
    if (typeof payload.name === 'string') patch.name = payload.name.trim()
    if (typeof payload.email === 'string') patch.email = payload.email.trim().toLowerCase()
    if (typeof payload.role === 'string') patch.role = payload.role
    if (!id || !Object.keys(patch).length) return json({ error: 'required' }, 400)
    if (patch.role && patch.role !== 'admin') {
      const { data: target } = await admin.from('profiles').select('role').eq('id', id).maybeSingle()
      if (target?.role === 'admin') {
        const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin')
        if ((count || 0) <= 1) return json({ error: 'lastAdmin' }, 400)
      }
    }
    if (typeof patch.email === 'string') {
      const upd = await admin.auth.admin.updateUserById(id, { email: String(patch.email) })
      if (upd.error) return json({ error: upd.error.message }, 400)
    }
    const ins = await admin.from('profiles').update(patch).eq('id', id)
    if (ins.error) return json({ error: ins.error.message }, 400)
    return json({ ok: true })
  }

  return json({ error: 'action' }, 400)
})
