import type { Candidate, DeletedCandidate, DeletedOrder, Order, Role, User } from './types'
import { supabase } from './supabase'

function must() {
  if (!supabase) throw new Error('supabase')
  return supabase
}

function dateOrNull(v: unknown): string | null {
  if (!v) return null
  return String(v).slice(0, 10)
}

function dateOrEmpty(v: unknown): string {
  return dateOrNull(v) || ''
}

export function profileToUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    email: String(row.email || ''),
    passwordHash: '',
    role: row.role as Role,
    avatar: (row.avatar as string | null) || null,
    createdAt: String(row.created_at || new Date().toISOString()),
  }
}

export function orderFromRow(row: Record<string, unknown>): Order {
  return {
    id: String(row.id),
    position: String(row.position || ''),
    department: String(row.department || ''),
    source: row.source as Order['source'],
    type: row.type as Order['type'],
    orderDate: dateOrEmpty(row.order_date),
    deadline: dateOrEmpty(row.deadline),
    comment: String(row.comment || ''),
    status: row.status as Order['status'],
    qty: Number(row.qty) || 1,
    urgency: row.urgency as Order['urgency'],
    responsibleId: row.responsible_id ? String(row.responsible_id) : '',
    keyPosition: Boolean(row.key_position),
    closedAt: dateOrNull(row.closed_at),
    createdBy: row.created_by ? String(row.created_by) : '',
  }
}

export function candidateFromRow(row: Record<string, unknown>): Candidate {
  return {
    id: String(row.id),
    fullName: String(row.full_name || ''),
    position: String(row.position || ''),
    source: row.source as Candidate['source'],
    previousPosition: String(row.previous_position || ''),
    type: row.type as Candidate['type'],
    date: dateOrEmpty(row.date),
    comment: String(row.comment || ''),
    stage: row.stage as Candidate['stage'],
    hiredDate: dateOrNull(row.hired_date),
    createdBy: row.created_by ? String(row.created_by) : '',
    probationResult: (row.probation_result as Candidate['probationResult']) || null,
    probationDecidedAt: dateOrNull(row.probation_decided_at),
    rejectedFrom: (row.rejected_from as Candidate['rejectedFrom']) || null,
    rejectedAt: dateOrNull(row.rejected_at),
    stageDates: (row.stage_dates as Candidate['stageDates']) || {},
    keyPosition: Boolean(row.key_position),
  }
}

function orderToRow(o: Order) {
  return {
    id: o.id,
    position: o.position,
    department: o.department,
    source: o.source,
    type: o.type,
    order_date: o.orderDate,
    deadline: o.deadline,
    comment: o.comment || '',
    status: o.status,
    qty: o.qty,
    urgency: o.urgency,
    responsible_id: o.responsibleId || null,
    key_position: o.keyPosition,
    closed_at: o.closedAt,
    created_by: o.createdBy || null,
  }
}

function candidateToRow(c: Candidate) {
  return {
    id: c.id,
    full_name: c.fullName,
    position: c.position,
    source: c.source,
    previous_position: c.previousPosition || '',
    type: c.type,
    date: c.date,
    comment: c.comment || '',
    stage: c.stage,
    hired_date: c.hiredDate,
    created_by: c.createdBy || null,
    probation_result: c.probationResult,
    probation_decided_at: c.probationDecidedAt,
    rejected_from: c.rejectedFrom,
    rejected_at: c.rejectedAt,
    stage_dates: c.stageDates || {},
    key_position: c.keyPosition,
  }
}

export async function cloudNeedsSetup(): Promise<boolean> {
  const { data, error } = await must().rpc('app_needs_setup')
  if (error) throw error
  return Boolean(data)
}

export async function cloudSessionId(): Promise<string | null> {
  const { data } = await must().auth.getSession()
  return data.session?.user.id ?? null
}

export async function cloudLogin(email: string, password: string): Promise<boolean> {
  const { error } = await must().auth.signInWithPassword({ email: email.trim(), password })
  return !error
}

export async function cloudLogout() {
  await must().auth.signOut()
}

export async function invokeAdmin(body: Record<string, unknown>) {
  const db = must()
  const { data: sessionData } = await db.auth.getSession()
  const token = sessionData.session?.access_token
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch('/api/admin', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  let payload: { error?: string; ok?: boolean } = {}
  try {
    payload = (await res.json()) as { error?: string; ok?: boolean }
  } catch {
    payload = { error: res.statusText || 'server' }
  }
  if (!res.ok || payload.error) throw new Error(payload.error || `HTTP ${res.status}`)
  return payload
}

export async function cloudLoadAll(): Promise<{
  users: User[]
  orders: Order[]
  candidates: Candidate[]
  deletedOrders: DeletedOrder[]
  deletedCandidates: DeletedCandidate[]
}> {
  const db = must()
  const [profiles, orders, candidates, deletedOrders, deletedCandidates] = await Promise.all([
    db.from('profiles').select('*').order('created_at', { ascending: false }),
    db.from('orders').select('*').order('order_date', { ascending: false }),
    db.from('candidates').select('*').order('date', { ascending: false }),
    db.from('deleted_orders').select('*').order('deleted_at', { ascending: false }),
    db.from('deleted_candidates').select('*').order('deleted_at', { ascending: false }),
  ])
  const firstErr = profiles.error || orders.error || candidates.error || deletedOrders.error || deletedCandidates.error
  if (firstErr) throw firstErr
  return {
    users: (profiles.data || []).map((r) => profileToUser(r as Record<string, unknown>)),
    orders: (orders.data || []).map((r) => orderFromRow(r as Record<string, unknown>)),
    candidates: (candidates.data || []).map((r) => candidateFromRow(r as Record<string, unknown>)),
    deletedOrders: (deletedOrders.data || []).map((r) => {
      const row = r as Record<string, unknown>
      return { ...orderFromRow(row), deletedAt: String(row.deleted_at || new Date().toISOString()) }
    }),
    deletedCandidates: (deletedCandidates.data || []).map((r) => {
      const row = r as Record<string, unknown>
      return { ...candidateFromRow(row), deletedAt: String(row.deleted_at || new Date().toISOString()) }
    }),
  }
}

export async function cloudUpsertOrders(rows: Order[]) {
  if (!rows.length) return
  const { error } = await must().from('orders').upsert(rows.map(orderToRow))
  if (error) throw error
}

export async function cloudApplyOrderClosures(rows: Order[]) {
  if (!rows.length) return
  const { error } = await must().rpc('apply_order_closures', {
    rows: rows.map((o) => ({ id: o.id, status: o.status, closed_at: o.closedAt })),
  })
  if (error) throw error
}

export async function cloudDeleteOrder(id: string) {
  const { error } = await must().from('orders').delete().eq('id', id)
  if (error) throw error
}

export async function cloudInsertDeletedOrder(row: DeletedOrder) {
  const { error } = await must()
    .from('deleted_orders')
    .upsert({ ...orderToRow(row), deleted_at: row.deletedAt })
  if (error) throw error
}

export async function cloudDeleteDeletedOrder(id: string) {
  const { error } = await must().from('deleted_orders').delete().eq('id', id)
  if (error) throw error
}

export async function cloudUpsertCandidates(rows: Candidate[]) {
  if (!rows.length) return
  const { error } = await must().from('candidates').upsert(rows.map(candidateToRow))
  if (error) throw error
}

export async function cloudDeleteCandidate(id: string) {
  const { error } = await must().from('candidates').delete().eq('id', id)
  if (error) throw error
}

export async function cloudInsertDeletedCandidate(row: DeletedCandidate) {
  const { error } = await must()
    .from('deleted_candidates')
    .upsert({ ...candidateToRow(row), deleted_at: row.deletedAt })
  if (error) throw error
}

export async function cloudDeleteDeletedCandidate(id: string) {
  const { error } = await must().from('deleted_candidates').delete().eq('id', id)
  if (error) throw error
}

export async function cloudUpdateAvatar(id: string, avatar: string) {
  const { error } = await must().from('profiles').update({ avatar }).eq('id', id)
  if (error) throw error
}

export async function cloudUpdateProfile(
  id: string,
  patch: { name?: string; email?: string; role?: string },
) {
  const row: Record<string, string> = {}
  if (typeof patch.name === 'string') row.name = patch.name.trim()
  if (typeof patch.email === 'string') row.email = patch.email.trim().toLowerCase()
  if (typeof patch.role === 'string') row.role = patch.role
  if (!Object.keys(row).length) return
  const { error } = await must().from('profiles').update(row).eq('id', id)
  if (error) throw error
}

export async function cloudChangeOwnPassword(next: string) {
  const { error } = await must().auth.updateUser({ password: next })
  if (error) throw error
}

export async function cloudVerifyPassword(email: string, password: string) {
  const { error } = await must().auth.signInWithPassword({ email, password })
  return !error
}
