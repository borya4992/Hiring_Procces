import { t } from './i18n'
import { daysUntilDeadline, isHiredStage, isInternshipDue, isOrderDeadlineSoon, isRejected, orderQty, todayIso } from './store'
import type { Candidate, Lang, Order } from './types'

function fill(lang: Lang, key: string, vars: Record<string, string | number>): string {
  return t(lang, key).replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''))
}

export function buildAiSummary(
  lang: Lang,
  periodOrders: Order[],
  candidates: Candidate[],
  from: string,
  to: string,
): string[] {
  const lines: string[] = []
  const n = periodOrders.length
  const qty = periodOrders.reduce((s, o) => s + orderQty(o), 0)
  const closed = periodOrders.filter((o) => o.status === 'filled')
  const open = periodOrders.filter((o) => o.status === 'open')
  const cancelled = periodOrders.filter((o) => o.status === 'cancelled')
  const closedQty = closed.reduce((s, o) => s + orderQty(o), 0)
  const openQty = open.reduce((s, o) => s + orderQty(o), 0)

  lines.push(fill(lang, 'reports.aiPeriodLine', { from, to }))

  if (n === 0) {
    lines.push(t(lang, 'reports.aiEmpty'))
    return lines
  }

  lines.push(
    fill(lang, 'reports.aiOrdersLine', {
      n,
      qty,
      closed: closed.length,
      closedQty,
      open: open.length,
      openQty,
      cancel: cancelled.length,
    }),
  )

  const hard: { pos: string; why: string; score: number }[] = []
  const seen = new Set<string>()
  for (const o of open) {
    if (seen.has(o.position)) continue
    seen.add(o.position)
    const people = candidates.filter((c) => c.position === o.position)
    const active = people.filter((c) => !isRejected(c))
    const hired = active.filter((c) => isHiredStage(c.stage)).length
    const need = orderQty(o)
    const leftover = Math.max(0, need - hired)
    const reasons: string[] = []
    let score = 0
    if (o.keyPosition) {
      reasons.push(t(lang, 'orders.keyPosition'))
      score += 4
    }
    if (daysUntilDeadline(o.deadline) < 0) {
      reasons.push(t(lang, 'reports.aiOverdue'))
      score += 5
    } else if (isOrderDeadlineSoon(o)) {
      reasons.push(t(lang, 'common.deadlineSoon'))
      score += 3
    }
    if (active.length === 0) {
      reasons.push(t(lang, 'reports.aiNoCandidates'))
      score += 6
    } else if (leftover > 0 && active.length < leftover) {
      reasons.push(fill(lang, 'reports.aiFewCandidates', { n: active.length, qty: leftover }))
      score += 4
    } else if (leftover > 0 && hired === 0) {
      reasons.push(t(lang, 'reports.aiNotHired'))
      score += 2
    }
    const rejected = people.filter((c) => isRejected(c)).length
    if (people.length >= 3 && rejected / people.length >= 0.4) {
      reasons.push(t(lang, 'reports.aiManyRejected'))
      score += 2
    }
    if (score >= 4 && reasons.length) {
      hard.push({ pos: o.position, why: reasons.join(', '), score })
    }
  }
  hard.sort((a, b) => b.score - a.score)
  if (hard.length) {
    lines.push(t(lang, 'reports.aiHardTitle'))
    for (const row of hard.slice(0, 5)) {
      lines.push(fill(lang, 'reports.aiHardItem', { pos: row.pos, why: row.why }))
    }
  } else {
    lines.push(t(lang, 'reports.aiNoHard'))
  }

  const focus: string[] = []
  const overdueN = open.filter((o) => daysUntilDeadline(o.deadline) < 0).length
  const soonN = open.filter((o) => isOrderDeadlineSoon(o) && daysUntilDeadline(o.deadline) >= 0).length
  const keyOpen = open.filter((o) => o.keyPosition)
  const noOwner = open.filter((o) => !o.responsibleId)
  const internDue = candidates.filter((c) => isInternshipDue(c, todayIso())).length
  if (overdueN) focus.push(fill(lang, 'reports.aiFocusOverdue', { n: overdueN }))
  if (soonN) focus.push(fill(lang, 'reports.aiFocusSoon', { n: soonN }))
  if (keyOpen.length) {
    focus.push(fill(lang, 'reports.aiFocusKey', { list: [...new Set(keyOpen.map((o) => o.position))].join(', ') }))
  }
  if (noOwner.length) focus.push(fill(lang, 'reports.aiFocusOwner', { n: noOwner.length }))
  if (internDue) focus.push(fill(lang, 'reports.aiFocusIntern', { n: internDue }))
  if (openQty && closedQty / Math.max(1, closedQty + openQty) < 0.35 && open.length >= 3) {
    focus.push(t(lang, 'reports.aiFocusCloseRate'))
  }
  if (focus.length) {
    lines.push(t(lang, 'reports.aiFocusTitle'))
    for (const item of focus) lines.push(`• ${item}`)
  }

  return lines
}
