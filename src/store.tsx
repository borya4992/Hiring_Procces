import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Candidate, DeletedCandidate, DeletedOrder, Lang, Order, PipelineStage, ProbationResult, Role, Stage, StageDates, Theme, Toast, Urgency, User } from './types'
import { CANDIDATE_STAGES, REJECTABLE_STAGES, STAGES } from './types'
import { t } from './i18n'

const KEYS = {
  users: 'hireflow.users',
  orders: 'hireflow.orders',
  candidates: 'hireflow.candidates',
  deletedOrders: 'hireflow.deletedOrders',
  deletedCandidates: 'hireflow.deletedCandidates',
  session: 'hireflow.session',
  theme: 'hireflow.theme',
  lang: 'hireflow.lang',
  version: 'hireflow.dataVersion',
}

const DATA_VERSION = 3

export const ADMIN_EMAIL = 'Timekeeper.1120@gmail.com'
export const ADMIN_NAME = 'Bobur Babajanov'

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`hireflow:${password}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function uid(): string {
  return crypto.randomUUID()
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export const PROBATION_DAYS = 80
export const BRAND = 'HP-Hiring Procces'

function iso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return iso(d)
}

export function todayIso(): string {
  return daysAgo(0)
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() + n)
  return iso(d)
}

export function probationReviewDate(hiredDate: string): string {
  return addDays(hiredDate, PROBATION_DAYS)
}

export function isOnProbation(c: Candidate): boolean {
  return c.stage === 'probation' && !c.probationResult
}

export function isProbationDue(c: Candidate, today = todayIso()): boolean {
  if (!isOnProbation(c)) return false
  const hired = c.hiredDate || c.date
  return probationReviewDate(hired) <= today
}

export function isRejectableStage(stage: Stage | null | undefined): stage is Stage {
  return !!stage && (REJECTABLE_STAGES as Stage[]).includes(stage)
}

export function isRejected(c: Candidate): boolean {
  return isRejectableStage(c.rejectedFrom) && Boolean(c.rejectedAt)
}

export function rejectedFromOf(c: Candidate): Stage | null {
  if (!isRejected(c)) return null
  return c.rejectedFrom
}

export const INTERNSHIP_DAYS = 3

export function isPipelineStage(stage: Stage | null | undefined): stage is PipelineStage {
  return !!stage && (STAGES as string[]).includes(stage)
}

export function normalizeStageDates(c: {
  date: string
  stage: Stage
  hiredDate?: string | null
  stageDates?: StageDates | null
}): StageDates {
  const dates: StageDates = {}
  const raw = c.stageDates || {}
  for (const s of STAGES) {
    const v = raw[s]
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) dates[s] = v
  }
  if (!dates.found) dates.found = c.date
  if (isPipelineStage(c.stage) && !dates[c.stage]) {
    dates[c.stage] = c.stage === 'hired' || c.stage === 'probation' ? c.hiredDate || c.date : c.date
  }
  return dates
}

export function stageEnteredAt(c: Candidate, stage: Stage): string | null {
  if (stage === 'rejected') return c.rejectedAt
  if (!isPipelineStage(stage)) return null
  return c.stageDates?.[stage] || (stage === 'found' ? c.date : null)
}

export function daysInCurrentStage(c: Candidate, today = todayIso()): number {
  const start = stageEnteredAt(c, c.stage) || c.date
  const end = isRejected(c) ? c.rejectedAt || today : today
  return Math.max(0, daysBetween(start, end))
}

export function daysAtStage(c: Candidate, stage: PipelineStage, today = todayIso()): number | null {
  const start = c.stageDates?.[stage]
  if (!start) return null
  const idx = STAGES.indexOf(stage)
  let end: string | undefined
  for (let i = idx + 1; i < STAGES.length; i++) {
    const d = c.stageDates?.[STAGES[i]]
    if (d) {
      end = d
      break
    }
  }
  if (!end && isRejected(c) && (c.rejectedFrom === stage || c.stage === stage)) end = c.rejectedAt || today
  if (!end && c.stage === stage) end = today
  if (!end) return null
  return Math.max(0, daysBetween(start, end))
}

export function internshipStart(c: Candidate): string | null {
  return c.stageDates?.internship || (c.stage === 'internship' ? c.date : null)
}

export function internshipReviewDate(c: Candidate): string | null {
  const start = internshipStart(c)
  return start ? addDays(start, INTERNSHIP_DAYS) : null
}

export function isInternshipDue(c: Candidate, today = todayIso()): boolean {
  if (c.stage !== 'internship' || isRejected(c)) return false
  const due = internshipReviewDate(c)
  return !!due && due <= today
}

export const DEADLINE_SOON_DAYS = 3

export function orderQty(o: { qty?: number }): number {
  const n = Number(o.qty)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 1
}

export function daysUntilDeadline(deadline: string, today = todayIso()): number {
  return daysBetween(today, deadline)
}

export function isOrderDeadlineSoon(o: Order, today = todayIso()): boolean {
  if (o.status !== 'open' || !o.deadline) return false
  return daysUntilDeadline(o.deadline, today) <= DEADLINE_SOON_DAYS
}

function normalizeUrgency(value: unknown): Urgency {
  if (value === 'urgent' || value === 'reserve' || value === 'medium') return value
  return 'medium'
}

function normalizeOrder(o: Order): Order {
  const qty = Number(o.qty)
  return {
    ...o,
    qty: Number.isFinite(qty) && qty > 0 ? Math.round(qty) : 1,
    urgency: normalizeUrgency(o.urgency),
    responsibleId: typeof o.responsibleId === 'string' ? o.responsibleId : '',
    keyPosition: Boolean(o.keyPosition),
  }
}

export function userById(users: User[], id: string | null | undefined): User | null {
  if (!id) return null
  return users.find((u) => u.id === id) ?? null
}

export function userName(users: User[], id: string | null | undefined, empty = ''): string {
  return userById(users, id)?.name || empty
}

export function stageBreakdown(people: Candidate[]): Record<Stage, number> {
  const counts = Object.fromEntries([...STAGES, 'rejected'].map((s) => [s, 0])) as Record<Stage, number>
  for (const c of people) {
    if (isRejected(c)) counts.rejected += 1
    else if (isOnProbation(c)) counts.probation += 1
    else counts[c.stage] = (counts[c.stage] || 0) + 1
  }
  return counts
}

function normalizeStage(value: unknown): Stage {
  if (typeof value === 'string' && (CANDIDATE_STAGES as string[]).includes(value)) return value as Stage
  return 'found'
}

function normalizeCandidate(c: Candidate): Candidate {
  let stage = normalizeStage(c.stage)
  let rejectedFrom = isRejectableStage(c.rejectedFrom) ? c.rejectedFrom : null
  let rejectedAt = c.rejectedAt || null
  if (stage === 'rejected') {
    rejectedFrom = rejectedFrom || 'screening'
    rejectedAt = rejectedAt || c.date || todayIso()
    stage = rejectedFrom
  }
  if (!isRejectableStage(rejectedFrom)) {
    rejectedFrom = null
    rejectedAt = null
  } else if (!rejectedAt) {
    rejectedAt = c.date || todayIso()
  }
  return {
    ...c,
    stage,
    hiredDate: c.hiredDate ?? null,
    probationResult: c.probationResult ?? null,
    probationDecidedAt: c.probationDecidedAt ?? null,
    rejectedFrom,
    rejectedAt,
    stageDates: normalizeStageDates({ ...c, stage }),
    keyPosition: Boolean(c.keyPosition),
  }
}

function migrateRole(role: string): Role {
  if (role === 'admin' || role === 'director' || role === 'deputy' || role === 'head' || role === 'recruiter') {
    return role
  }
  if (role === 'hr') return 'head'
  if (role === 'observer') return 'deputy'
  return 'recruiter'
}

export function isHiredStage(stage: string): boolean {
  return stage === 'hired' || stage === 'probation'
}

function applyHireClosures(list: Order[], people: Candidate[]): Order[] {
  const hiredByPos = new Map<string, number>()
  for (const c of people) {
    if (isRejected(c) || !isHiredStage(c.stage)) continue
    hiredByPos.set(c.position, (hiredByPos.get(c.position) || 0) + 1)
  }
  const groups = new Map<string, Order[]>()
  for (const o of list) {
    if (o.status === 'cancelled') continue
    const rows = groups.get(o.position) || []
    rows.push(o)
    groups.set(o.position, rows)
  }
  const next = list.map((o) => ({ ...o }))
  const byId = new Map(next.map((o) => [o.id, o]))
  for (const [, rows] of groups) {
    const sorted = rows.slice().sort((a, b) => a.orderDate.localeCompare(b.orderDate) || a.id.localeCompare(b.id))
    let remaining = hiredByPos.get(sorted[0]?.position || '') || 0
    for (const o of sorted) {
      const row = byId.get(o.id)
      if (!row || row.status === 'cancelled') continue
      const need = orderQty(row)
      if (remaining >= need && need > 0) {
        remaining -= need
        if (row.status !== 'filled') {
          row.status = 'filled'
          row.closedAt = row.closedAt || todayIso()
        }
      } else if (row.status === 'filled') {
        row.status = 'open'
        row.closedAt = null
      }
    }
  }
  return next
}

function wipeLegacyDemo() {
  if (load<number>(KEYS.version, 0) === DATA_VERSION) return
  localStorage.removeItem(KEYS.users)
  localStorage.removeItem(KEYS.orders)
  localStorage.removeItem(KEYS.candidates)
  localStorage.removeItem(KEYS.deletedOrders)
  localStorage.removeItem(KEYS.deletedCandidates)
  localStorage.removeItem(KEYS.session)
  save(KEYS.version, DATA_VERSION)
}

function loadAppData(): {
  users: User[]
  orders: Order[]
  candidates: Candidate[]
  deletedOrders: DeletedOrder[]
  deletedCandidates: DeletedCandidate[]
} {
  wipeLegacyDemo()
  const users = load<User[]>(KEYS.users, []).map((u) => ({ ...u, role: migrateRole(u.role) }))
  const candidates = load<Candidate[]>(KEYS.candidates, []).map((c) => normalizeCandidate(c))
  const orders = applyHireClosures(load<Order[]>(KEYS.orders, []).map((o) => normalizeOrder(o)), candidates)
  const deletedOrders = load<DeletedOrder[]>(KEYS.deletedOrders, []).map((o) => ({
    ...normalizeOrder(o),
    deletedAt: o.deletedAt,
  }))
  const deletedCandidates = load<DeletedCandidate[]>(KEYS.deletedCandidates, []).map((c) => ({
    ...normalizeCandidate(c),
    deletedAt: c.deletedAt,
  }))
  save(KEYS.users, users)
  save(KEYS.orders, orders)
  save(KEYS.candidates, candidates)
  save(KEYS.deletedOrders, deletedOrders)
  save(KEYS.deletedCandidates, deletedCandidates)
  return { users, orders, candidates, deletedOrders, deletedCandidates }
}

export function inRange(dateStr: string, from: string, to: string): boolean {
  if (!dateStr) return false
  const a = from <= to ? from : to
  const b = from <= to ? to : from
  return dateStr >= a && dateStr <= b
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(from)
  const b = new Date(to)
  a.setHours(12, 0, 0, 0)
  b.setHours(12, 0, 0, 0)
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export function eachDay(from: string, to: string): string[] {
  const start = from <= to ? from : to
  const end = from <= to ? to : from
  const out: string[] = []
  const d = new Date(start)
  d.setHours(12, 0, 0, 0)
  const last = new Date(end)
  last.setHours(12, 0, 0, 0)
  while (d.getTime() <= last.getTime()) {
    out.push(iso(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}

export function timeToHireByPosition(orders: Order[], candidates: Candidate[], from: string, to: string) {
  const acc = new Map<string, number[]>()
  const add = (position: string, days: number) => {
    if (days < 0) return
    const arr = acc.get(position) ?? []
    arr.push(days)
    acc.set(position, arr)
  }
  const matchedOrders = new Set<string>()
  for (const c of candidates) {
    if (!isHiredStage(c.stage)) continue
    const hiredDate = c.hiredDate || c.date
    if (!inRange(hiredDate, from, to)) continue
    const order =
      orders.find((o) => o.position === c.position && o.status === 'filled') ??
      orders.find((o) => o.position === c.position && o.status !== 'cancelled')
    if (!order) continue
    add(c.position, daysBetween(order.orderDate, hiredDate))
    matchedOrders.add(order.id)
  }
  for (const o of orders) {
    if (o.status !== 'filled' || !o.closedAt || matchedOrders.has(o.id)) continue
    if (!inRange(o.closedAt, from, to)) continue
    add(o.position, daysBetween(o.orderDate, o.closedAt))
  }
  return [...acc.entries()]
    .map(([position, days]) => ({
      position,
      count: days.length,
      avg: Math.round((days.reduce((s, n) => s + n, 0) / days.length) * 10) / 10,
    }))
    .sort((a, b) => a.avg - b.avg)
}

export function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => daysAgo(n - 1 - i))
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  if (!y || !m || !d) return dateStr
  return `${d}.${m}.${y}`
}

export function parseDisplayDate(text: string): string | null {
  const match = text.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!match) return null
  const dd = match[1].padStart(2, '0')
  const mm = match[2].padStart(2, '0')
  const yyyy = match[3]
  const iso = `${yyyy}-${mm}-${dd}`
  const dt = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(dt.getTime())) return null
  if (dt.getFullYear() !== Number(yyyy) || dt.getMonth() + 1 !== Number(mm) || dt.getDate() !== Number(dd)) {
    return null
  }
  return iso
}

export function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const size = 256
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('canvas'))
        return
      }
      const scale = Math.max(size / img.width, size / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.86))
      URL.revokeObjectURL(url)
    }
    img.onerror = () => reject(new Error('image'))
    img.src = url
  })
}

interface Store {
  ready: boolean
  users: User[]
  orders: Order[]
  candidates: Candidate[]
  deletedOrders: DeletedOrder[]
  deletedCandidates: DeletedCandidate[]
  currentUser: User | null
  theme: Theme
  lang: Lang
  toasts: Toast[]
  t: (key: string) => string
  needsSetup: boolean
  setTheme: (theme: Theme) => void
  setLang: (lang: Lang) => void
  login: (email: string, password: string) => Promise<boolean>
  setupAdmin: (password: string) => Promise<string | null>
  logout: () => void
  toast: (message: string, kind?: Toast['kind']) => void
  updateAvatar: (dataUrl: string) => void
  changeOwnPassword: (current: string, next: string) => Promise<string | null>
  addOrder: (row: Omit<Order, 'id' | 'createdBy'>) => void
  updateOrder: (id: string, patch: Partial<Order>) => void
  deleteOrder: (id: string) => void
  restoreOrder: (id: string) => void
  addCandidate: (row: Omit<Candidate, 'id' | 'createdBy'>) => void
  updateCandidate: (id: string, patch: Partial<Candidate>) => void
  bulkUpdateStages: (ids: string[], stage: Stage) => void
  deleteCandidate: (id: string) => void
  restoreCandidate: (id: string) => void
  rejectCandidate: (id: string) => void
  unrejectCandidate: (id: string) => void
  decideProbation: (id: string, result: ProbationResult) => void
  addUser: (input: { name: string; email: string; password: string; role: Role }) => Promise<string | null>
  updateUser: (id: string, patch: Partial<Pick<User, 'name' | 'email' | 'role'>>) => string | null
  setUserPassword: (id: string, password: string) => Promise<string | null>
  deleteUser: (id: string) => string | null
  canManageOrders: boolean
  canManageCandidates: boolean
  isAdmin: boolean
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [deletedOrders, setDeletedOrders] = useState<DeletedOrder[]>([])
  const [deletedCandidates, setDeletedCandidates] = useState<DeletedCandidate[]>([])
  const [sessionId, setSessionId] = useState<string | null>(() => load<string | null>(KEYS.session, null))
  const [theme, setThemeState] = useState<Theme>(() => load<Theme>(KEYS.theme, 'midnight'))
  const [lang, setLangState] = useState<Lang>(() => load<Lang>(KEYS.lang, 'uz'))
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const data = loadAppData()
    setUsers(data.users)
    setOrders(data.orders)
    setCandidates(data.candidates)
    setDeletedOrders(data.deletedOrders)
    setDeletedCandidates(data.deletedCandidates)
    setSessionId(load<string | null>(KEYS.session, null))
    setReady(true)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.lang = lang
  }, [theme, lang])

  const currentUser = useMemo(
    () => users.find((u) => u.id === sessionId) ?? null,
    [users, sessionId],
  )

  const persistUsers = (next: User[]) => {
    setUsers(next)
    save(KEYS.users, next)
  }
  const persistOrders = (next: Order[]) => {
    setOrders(next)
    save(KEYS.orders, next)
  }
  const persistOrdersSyncHires = (next: Order[]) => {
    persistOrders(applyHireClosures(next, candidates))
  }
  const persistCandidates = (next: Candidate[]) => {
    setCandidates(next)
    save(KEYS.candidates, next)
  }
  const persistCandidatesSyncOrders = (next: Candidate[]) => {
    persistCandidates(next)
    persistOrders(applyHireClosures(orders, next))
  }
  const persistDeletedOrders = (next: DeletedOrder[]) => {
    setDeletedOrders(next)
    save(KEYS.deletedOrders, next)
  }
  const persistDeletedCandidates = (next: DeletedCandidate[]) => {
    setDeletedCandidates(next)
    save(KEYS.deletedCandidates, next)
  }

  const toast = useCallback((message: string, kind: Toast['kind'] = 'ok') => {
    const id = uid()
    setToasts((prev) => [...prev, { id, message, kind }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 2800)
  }, [])

  const setTheme = (next: Theme) => {
    setThemeState(next)
    save(KEYS.theme, next)
  }
  const setLang = (next: Lang) => {
    setLangState(next)
    save(KEYS.lang, next)
  }

  const login = async (email: string, password: string) => {
    const hash = await hashPassword(password)
    const user = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.passwordHash === hash,
    )
    if (!user) return false
    setSessionId(user.id)
    save(KEYS.session, user.id)
    return true
  }

  const setupAdmin = async (password: string) => {
    if (users.length) return t(lang, 'auth.error')
    if (password.length < 6) return t(lang, 'top.weak')
    const admin: User = {
      id: uid(),
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash: await hashPassword(password),
      role: 'admin',
      avatar: null,
      createdAt: new Date().toISOString(),
    }
    persistUsers([admin])
    setSessionId(admin.id)
    save(KEYS.session, admin.id)
    return null
  }

  const logout = () => {
    setSessionId(null)
    localStorage.removeItem(KEYS.session)
  }

  const updateAvatar = (dataUrl: string) => {
    if (!currentUser) return
    persistUsers(users.map((u) => (u.id === currentUser.id ? { ...u, avatar: dataUrl } : u)))
    toast(t(lang, 'top.avatarUpdated'))
  }

  const changeOwnPassword = async (current: string, next: string) => {
    if (!currentUser) return 'err'
    if (next.length < 6) return t(lang, 'top.weak')
    const curHash = await hashPassword(current)
    if (curHash !== currentUser.passwordHash) return t(lang, 'top.wrongCurrent')
    const nextHash = await hashPassword(next)
    persistUsers(users.map((u) => (u.id === currentUser.id ? { ...u, passwordHash: nextHash } : u)))
    toast(t(lang, 'top.passwordChanged'))
    return null
  }

  const canManageOrders = currentUser?.role === 'admin' || currentUser?.role === 'head'
  const canManageCandidates = currentUser?.role === 'admin' || currentUser?.role === 'recruiter'

  const addOrder = (row: Omit<Order, 'id' | 'createdBy'>) => {
    if (!currentUser || !canManageOrders) return
    persistOrdersSyncHires([
      normalizeOrder({
        ...row,
        id: uid(),
        createdBy: currentUser.id,
        closedAt: row.status === 'filled' ? row.closedAt || daysAgo(0) : null,
      }),
      ...orders,
    ])
    toast(t(lang, 'common.created'))
  }
  const updateOrder = (id: string, patch: Partial<Order>) => {
    if (!currentUser || !canManageOrders) return
    persistOrdersSyncHires(
      orders.map((o) => {
        if (o.id !== id) return o
        const next = normalizeOrder({ ...o, ...patch, id: o.id })
        next.closedAt = next.status === 'filled' ? next.closedAt || daysAgo(0) : null
        return next
      }),
    )
    toast(t(lang, 'common.updated'))
  }
  const deleteOrder = (id: string) => {
    if (!currentUser || !canManageOrders) return
    const row = orders.find((o) => o.id === id)
    if (!row) return
    persistOrders(orders.filter((o) => o.id !== id))
    persistDeletedOrders([{ ...row, deletedAt: new Date().toISOString() }, ...deletedOrders])
    toast(t(lang, 'common.deleted'))
  }
  const restoreOrder = (id: string) => {
    if (!currentUser || !canManageOrders) return
    const row = deletedOrders.find((o) => o.id === id)
    if (!row) return
    const { deletedAt: _deletedAt, ...rest } = row
    persistDeletedOrders(deletedOrders.filter((o) => o.id !== id))
    persistOrdersSyncHires([normalizeOrder(rest), ...orders])
    toast(t(lang, 'common.restored'))
  }

  const applyCandidatePatch = (c: Candidate, patch: Partial<Candidate>): Candidate => {
    const prev = normalizeCandidate(c)
    const next = { ...prev, ...patch, id: prev.id }
    const dates: StageDates = { ...prev.stageDates, ...(patch.stageDates || {}) }
    if (patch.date) dates.found = patch.date
    next.hiredDate = isHiredStage(next.stage) ? next.hiredDate || daysAgo(0) : next.hiredDate
    if (patch.stage && patch.stage !== prev.stage) {
      if (isPipelineStage(patch.stage) && !dates[patch.stage]) dates[patch.stage] = daysAgo(0)
      if (patch.stage === 'probation') {
        next.probationResult = null
        next.probationDecidedAt = null
        next.hiredDate = next.hiredDate || daysAgo(0)
        if (!dates.hired) dates.hired = next.hiredDate
        if (!dates.probation) dates.probation = daysAgo(0)
      }
      if (patch.stage === 'hired') {
        next.hiredDate = dates.hired || daysAgo(0)
        dates.hired = next.hiredDate
      }
      if (patch.stage === 'rejected') {
        next.rejectedFrom = isRejectableStage(prev.stage) ? prev.stage : isRejectableStage(prev.rejectedFrom) ? prev.rejectedFrom : 'screening'
        next.rejectedAt = patch.rejectedAt || daysAgo(0)
        next.stage = next.rejectedFrom
      } else if (patch.rejectedFrom === undefined && patch.rejectedAt === undefined) {
        next.rejectedFrom = null
        next.rejectedAt = null
      }
    }
    next.stageDates = dates
    return normalizeCandidate(next)
  }

  const addCandidate = (row: Omit<Candidate, 'id' | 'createdBy'>) => {
    if (!currentUser || !canManageCandidates) return
    persistCandidatesSyncOrders([
      normalizeCandidate({
        ...row,
        hiredDate: isHiredStage(row.stage) ? row.hiredDate || daysAgo(0) : null,
        probationResult: row.probationResult ?? null,
        probationDecidedAt: row.probationDecidedAt ?? null,
        id: uid(),
        createdBy: currentUser.id,
      }),
      ...candidates,
    ])
    toast(t(lang, 'common.created'))
  }
  const updateCandidate = (id: string, patch: Partial<Candidate>) => {
    if (!currentUser || !canManageCandidates) return
    persistCandidatesSyncOrders(
      candidates.map((c) => {
        if (c.id !== id) return c
        return applyCandidatePatch(c, patch)
      }),
    )
    toast(t(lang, 'common.updated'))
  }
  const bulkUpdateStages = (ids: string[], stage: Stage) => {
    if (!currentUser || !canManageCandidates || ids.length === 0) return
    const set = new Set(ids)
    persistCandidatesSyncOrders(candidates.map((c) => (set.has(c.id) ? applyCandidatePatch(c, { stage }) : c)))
    toast(t(lang, 'common.updated'))
  }
  const deleteCandidate = (id: string) => {
    if (!currentUser || !canManageCandidates) return
    const row = candidates.find((c) => c.id === id)
    if (!row) return
    persistCandidatesSyncOrders(candidates.filter((c) => c.id !== id))
    persistDeletedCandidates([{ ...row, deletedAt: new Date().toISOString() }, ...deletedCandidates])
    toast(t(lang, 'common.deleted'))
  }
  const restoreCandidate = (id: string) => {
    if (!currentUser || !canManageCandidates) return
    const row = deletedCandidates.find((c) => c.id === id)
    if (!row) return
    const { deletedAt: _deletedAt, ...rest } = row
    persistDeletedCandidates(deletedCandidates.filter((c) => c.id !== id))
    persistCandidatesSyncOrders([normalizeCandidate(rest), ...candidates])
    toast(t(lang, 'common.restored'))
  }
  const rejectCandidate = (id: string) => {
    if (!currentUser || !canManageCandidates) return
    persistCandidatesSyncOrders(
      candidates.map((c) => {
        if (c.id !== id) return c
        const row = normalizeCandidate(c)
        if (isRejected(row) || !isRejectableStage(row.stage)) return row
        return applyCandidatePatch(row, { rejectedFrom: row.stage, rejectedAt: daysAgo(0) })
      }),
    )
    toast(t(lang, 'candidates.rejected'))
  }
  const unrejectCandidate = (id: string) => {
    if (!currentUser || !canManageCandidates) return
    persistCandidatesSyncOrders(
      candidates.map((c) => (c.id === id ? applyCandidatePatch(c, { rejectedFrom: null, rejectedAt: null }) : c)),
    )
    toast(t(lang, 'common.restored'))
  }
  const decideProbation = (id: string, result: ProbationResult) => {
    if (!currentUser || !canManageCandidates) return
    persistCandidatesSyncOrders(
      candidates.map((c) => {
        if (c.id !== id) return c
        return {
          ...c,
          probationResult: result,
          probationDecidedAt: daysAgo(0),
          stage: result === 'passed' ? 'hired' : 'probation',
        }
      }),
    )
    toast(t(lang, result === 'passed' ? 'probation.passedBtn' : 'probation.failedBtn'))
  }

  const adminCount = users.filter((u) => u.role === 'admin').length

  const addUser = async (input: { name: string; email: string; password: string; role: Role }) => {
    if (users.some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase())) {
      return t(lang, 'users.exists')
    }
    if (input.password.length < 6) return t(lang, 'top.weak')
    const passwordHash = await hashPassword(input.password)
    persistUsers([
      {
        id: uid(),
        name: input.name.trim(),
        email: input.email.trim(),
        passwordHash,
        role: input.role,
        avatar: null,
        createdAt: new Date().toISOString(),
      },
      ...users,
    ])
    toast(t(lang, 'common.created'))
    return null
  }

  const updateUser = (id: string, patch: Partial<Pick<User, 'name' | 'email' | 'role'>>) => {
    const target = users.find((u) => u.id === id)
    if (!target) return 'err'
    if (target.role === 'admin' && patch.role && patch.role !== 'admin' && adminCount <= 1) {
      return t(lang, 'users.lastAdmin')
    }
    if (patch.email && users.some((u) => u.id !== id && u.email.toLowerCase() === patch.email!.toLowerCase())) {
      return t(lang, 'users.exists')
    }
    persistUsers(users.map((u) => (u.id === id ? { ...u, ...patch } : u)))
    toast(t(lang, 'common.updated'))
    return null
  }

  const setUserPassword = async (id: string, password: string) => {
    if (password.length < 6) return t(lang, 'top.weak')
    const passwordHash = await hashPassword(password)
    persistUsers(users.map((u) => (u.id === id ? { ...u, passwordHash } : u)))
    toast(t(lang, 'top.passwordChanged'))
    return null
  }

  const deleteUser = (id: string) => {
    if (currentUser?.id === id) return t(lang, 'users.noSelfDelete')
    const target = users.find((u) => u.id === id)
    if (target?.role === 'admin' && adminCount <= 1) return t(lang, 'users.lastAdmin')
    persistUsers(users.filter((u) => u.id !== id))
    toast(t(lang, 'common.deleted'))
    return null
  }

  const value: Store = {
    ready,
    users,
    orders,
    candidates,
    deletedOrders,
    deletedCandidates,
    currentUser,
    theme,
    lang,
    toasts,
    t: (key) => t(lang, key),
    needsSetup: users.length === 0,
    setTheme,
    setLang,
    login,
    setupAdmin,
    logout,
    toast,
    updateAvatar,
    changeOwnPassword,
    addOrder,
    updateOrder,
    deleteOrder,
    restoreOrder,
    addCandidate,
    updateCandidate,
    bulkUpdateStages,
    deleteCandidate,
    restoreCandidate,
    rejectCandidate,
    unrejectCandidate,
    decideProbation,
    addUser,
    updateUser,
    setUserPassword,
    deleteUser,
    canManageOrders,
    canManageCandidates,
    isAdmin: currentUser?.role === 'admin',
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('Store')
  return ctx
}

