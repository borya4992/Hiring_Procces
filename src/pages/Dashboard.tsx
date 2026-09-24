import { useMemo, useState, type ReactNode } from 'react'
import { AreaTrend, Bars } from '../charts'
import { DateField } from '../DateField'
import { IconX } from '../icons'
import { daysBetween, eachDay, formatDate, inRange, lastNDays, orderQty, rejectedFromOf, timeToHireByPosition, todayIso, isOnProbation, isRejected, useStore, userName } from '../store'
import type { Candidate, Order, Stage, User } from '../types'
import { REJECTABLE_STAGES, STAGES } from '../types'

function today() {
  return todayIso()
}

type ModalId =
  | 'cands'
  | 'openOrders'
  | 'interviews'
  | 'hired'
  | 'passed'
  | 'rejected'
  | 'funnel'
  | 'hireTime'
  | 'trend'
  | 'byType'
  | 'bySource'

function ClickCard({ children, onClick, tone }: { children: ReactNode; onClick: () => void; tone?: string }) {
  return (
    <div
      className={`card hover-blue clickable${tone ? ` tone-${tone}` : ''}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {children}
    </div>
  )
}

export function Dashboard() {
  const { t, candidates, orders, users } = useStore()
  const [from, setFrom] = useState(() => lastNDays(30)[0])
  const [to, setTo] = useState(() => today())
  const [modal, setModal] = useState<ModalId | null>(null)

  const periodCands = candidates.filter((c) => inRange(c.date, from, to))
  const periodOrders = orders.filter((o) => inRange(o.orderDate, from, to))
  const openOrders = periodOrders
    .filter((o) => o.status === 'open')
    .slice()
    .sort((a, b) => a.deadline.localeCompare(b.deadline) || a.position.localeCompare(b.position))
  const openQty = openOrders.reduce((n, o) => n + orderQty(o), 0)
  const periodQty = periodOrders.reduce((n, o) => n + orderQty(o), 0)
  const interviewRows = periodCands.filter((c) => c.stage === 'interview' && !isRejected(c))
  const hiredRows = periodCands.filter((c) => (c.stage === 'hired' || c.stage === 'probation') && !isRejected(c))
  const passedRows = candidates.filter(
    (c) => c.probationResult === 'passed' && c.probationDecidedAt && inRange(c.probationDecidedAt, from, to),
  )
  const rejectedRows = candidates
    .filter((c) => {
      if (!isRejected(c)) return false
      const fromStage = rejectedFromOf(c)
      if (!fromStage || !REJECTABLE_STAGES.includes(fromStage)) return false
      return inRange(c.rejectedAt || c.date, from, to)
    })
    .slice()
    .sort((a, b) => (b.rejectedAt || b.date).localeCompare(a.rejectedAt || a.date) || a.fullName.localeCompare(b.fullName))
  const overdue = orders.filter((o) => o.status === 'open' && o.deadline < today()).length

  const funnel = useMemo(
    () =>
      STAGES.map((s) => ({
        key: s,
        n: candidates.filter((c) => !isRejected(c) && (s === 'probation' ? isOnProbation(c) : c.stage === s)).length,
      })),
    [candidates],
  )
  const funnelMax = Math.max(1, ...funnel.map((f) => f.n))

  const days = eachDay(from, to)
  const trend = days.map((d) => ({
    label: formatDate(d).slice(0, 5),
    iso: d,
    a: candidates.filter((c) => c.date === d).length,
    b: orders.filter((o) => o.orderDate === d).length,
  }))

  const typeBars = useMemo(
    () => [
      { label: t('type.staff'), value: periodOrders.filter((o) => o.type === 'staff').length, color: '#2ec5ff' },
      { label: t('type.gpd'), value: periodOrders.filter((o) => o.type === 'gpd').length, color: '#ff2e97' },
    ],
    [periodOrders, t],
  )
  const sourceBars = useMemo(
    () => [
      { label: t('source.internal'), value: periodOrders.filter((o) => o.source === 'internal').length, color: '#9b7dff' },
      { label: t('source.external'), value: periodOrders.filter((o) => o.source === 'external').length, color: '#3ee0a0' },
    ],
    [periodOrders, t],
  )

  const hireTimes = useMemo(() => timeToHireByPosition(orders, candidates, from, to), [orders, candidates, from, to])
  const hireBars = hireTimes.map((row) => ({
    label: row.position,
    value: row.avg,
    color: '#2ec5ff',
  }))
  const hireDetails = useMemo(() => {
    return candidates
      .filter((c) => c.stage === 'hired' || c.stage === 'probation')
      .map((c) => {
        const hiredDate = c.hiredDate || c.date
        if (!inRange(hiredDate, from, to)) return null
        const order =
          orders.find((o) => o.position === c.position && o.status === 'filled') ??
          orders.find((o) => o.position === c.position && o.status !== 'cancelled')
        if (!order) return null
        const daysN = daysBetween(order.orderDate, hiredDate)
        if (daysN < 0) return null
        return { c, order, hiredDate, daysN }
      })
      .filter(Boolean) as { c: Candidate; order: Order; hiredDate: string; daysN: number }[]
  }, [candidates, orders, from, to])

  const funnelTotal = candidates.length
  const stats = [
    { id: 'cands' as const, k: t('dash.newCandidates'), v: periodCands.length, s: t('dash.period'), tone: 'orange' },
    { id: 'openOrders' as const, k: t('dash.openOrders'), v: openQty, s: `${t('common.total')}: ${periodQty}`, tone: 'pink' },
    { id: 'interviews' as const, k: t('dash.interviews'), v: interviewRows.length, s: t('stage.interview'), tone: 'blue' },
    { id: 'hired' as const, k: t('dash.hired'), v: hiredRows.length, s: `${t('dash.overdue')}: ${overdue}`, tone: 'mint' },
    { id: 'passed' as const, k: t('dash.passed'), v: passedRows.length, s: t('dash.period'), tone: 'green' },
    { id: 'rejected' as const, k: t('dash.rejected'), v: rejectedRows.length, s: t('dash.rejectedHint'), tone: 'red' },
  ]

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t('dash.title')}</h1>
          <p>{t('dash.subtitle')}</p>
        </div>
        <div className="period-range">
          <div className="today-chip">
            {t('dash.todayDate')}: <b>{formatDate(today())}</b>
          </div>
          <label>
            {t('common.from')}
            <DateField value={from} max={to} onChange={setFrom} />
          </label>
          <label>
            {t('common.to')}
            <DateField value={to} min={from} onChange={setTo} />
          </label>
        </div>
      </div>

      <div className="grid stats six">
        {stats.map((s) => (
          <ClickCard key={s.id} tone={s.tone} onClick={() => setModal(s.id)}>
            <div className="stat-kicker">{s.k}</div>
            <div className="stat-value">{s.v}</div>
            <div className="stat-sub">{s.s}</div>
          </ClickCard>
        ))}
      </div>

      <div className="grid" style={{ marginTop: 14 }}>
        <ClickCard onClick={() => setModal('funnel')}>
          <div className="funnel-head">
            <h3>{t('dash.funnel')}</h3>
            <div className="funnel-total">
              {t('dash.funnelTotal')}: <b>{funnelTotal}</b>
            </div>
          </div>
          <div className="funnel">
            {funnel.map((f) => {
              const share = funnelTotal ? Math.round((f.n / funnelTotal) * 100) : 0
              return (
                <div className="funnel-step" key={f.key}>
                  <div className="n">{f.n}</div>
                  <div className="l">{t(`stage.${f.key}`)}</div>
                  <div className="funnel-bar">
                    <span style={{ width: `${(f.n / funnelMax) * 100}%` }} />
                  </div>
                  <div className="funnel-conv">{share}%</div>
                </div>
              )
            })}
          </div>
        </ClickCard>
      </div>

      <div className="grid" style={{ marginTop: 14 }}>
        <ClickCard onClick={() => setModal('hireTime')}>
          <h3>{t('dash.timeToHire')}</h3>
          <p className="stat-sub" style={{ marginBottom: 12 }}>
            {t('dash.timeToHireHint')}
          </p>
          {hireTimes.length === 0 ? (
            <div className="empty">{t('common.empty')}</div>
          ) : (
            <>
              <Bars items={hireBars} />
              <div className="table-wrap" style={{ marginTop: 14, border: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>{t('common.n')}</th>
                      <th>{t('common.position')}</th>
                      <th>{t('dash.closedCount')}</th>
                      <th>{t('dash.avgDays')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hireTimes.map((row, i) => (
                      <tr key={row.position}>
                        <td>{i + 1}</td>
                        <td>{row.position}</td>
                        <td>{row.count}</td>
                        <td>
                          {row.avg} {t('dash.daysUnit')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </ClickCard>
      </div>

      <div className="grid" style={{ marginTop: 14 }}>
        <ClickCard onClick={() => setModal('trend')}>
          <h3>{t('dash.trend')}</h3>
          <AreaTrend data={trend} aLabel={t('dash.candidatesLine')} bLabel={t('dash.ordersLine')} />
        </ClickCard>
      </div>
      <div className="grid two" style={{ marginTop: 14 }}>
        <ClickCard onClick={() => setModal('byType')}>
          <h3>
            {t('dash.orderCounts')} · {t('dash.byType')}
          </h3>
          <Bars items={typeBars} />
        </ClickCard>
        <ClickCard onClick={() => setModal('bySource')}>
          <h3>
            {t('dash.orderCounts')} · {t('dash.bySource')}
          </h3>
          <Bars items={sourceBars} />
        </ClickCard>
      </div>

      {modal && (
        <DashModal title={modalTitle(modal, t)} onClose={() => setModal(null)}>
          {modal === 'cands' && <CandidateTable rows={periodCands} t={t} />}
          {modal === 'interviews' && <CandidateTable rows={interviewRows} t={t} />}
          {modal === 'hired' && <CandidateTable rows={hiredRows} t={t} />}
          {modal === 'passed' && <CandidateTable rows={passedRows} t={t} extra />}
          {modal === 'rejected' && <CandidateTable rows={rejectedRows} t={t} rejected />}
          {modal === 'openOrders' && <OrderTable rows={openOrders} t={t} users={users} />}
          {modal === 'byType' && <OrderTable rows={periodOrders} t={t} users={users} />}
          {modal === 'bySource' && <OrderTable rows={periodOrders} t={t} users={users} />}
          {modal === 'funnel' && <FunnelTable candidates={candidates} t={t} />}
          {modal === 'hireTime' && <HireTable rows={hireDetails} t={t} />}
          {modal === 'trend' && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('common.n')}</th>
                    <th>{t('common.date')}</th>
                    <th>{t('dash.candidatesLine')}</th>
                    <th>{t('dash.ordersLine')}</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.map((row, i) => (
                    <tr key={row.iso}>
                      <td>{i + 1}</td>
                      <td>{formatDate(row.iso)}</td>
                      <td>{row.a}</td>
                      <td>{row.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashModal>
      )}
    </>
  )
}

function modalTitle(id: ModalId, t: (k: string) => string) {
  const map: Record<ModalId, string> = {
    cands: t('dash.newCandidates'),
    openOrders: t('dash.openOrders'),
    interviews: t('dash.interviews'),
    hired: t('dash.hired'),
    passed: t('dash.passed'),
    rejected: t('dash.rejected'),
    funnel: t('dash.funnel'),
    hireTime: t('dash.timeToHire'),
    trend: t('dash.trend'),
    byType: `${t('dash.orderCounts')} · ${t('dash.byType')}`,
    bySource: `${t('dash.orderCounts')} · ${t('dash.bySource')}`,
  }
  return map[id]
}

function DashModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { t } = useStore()
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <IconX width={16} height={16} /> {t('common.close')}
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function CandidateTable({
  rows,
  t,
  extra,
  rejected,
}: {
  rows: Candidate[]
  t: (k: string) => string
  extra?: boolean
  rejected?: boolean
}) {
  if (!rows.length) return <div className="empty">{t('common.empty')}</div>
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="num">{t('common.n')}</th>
            <th>{t('candidates.fullName')}</th>
            <th>{t('common.position')}</th>
            <th>{t('common.source')}</th>
            <th>{t('common.date')}</th>
            <th>{rejected ? t('dash.rejectedFrom') : t('candidates.stage')}</th>
            {extra && <th>{t('probation.result')}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((c, i) => (
            <tr key={c.id}>
              <td className="num">{i + 1}</td>
              <td>{c.fullName}</td>
              <td>
                {c.position}
                {c.keyPosition && <span className="pill pill-pink" style={{ marginLeft: 6 }}>{t('orders.keyYes')}</span>}
              </td>
              <td>{t(`source.${c.source}`)}</td>
              <td>{formatDate(c.rejectedAt || c.probationDecidedAt || c.hiredDate || c.date)}</td>
              <td>{t(`stage.${rejected ? rejectedFromOf(c) || 'rejected' : c.stage}`)}</td>
              {extra && <td>{c.probationResult === 'passed' ? t('dash.passed') : c.probationResult === 'failed' ? t('dash.failed') : '—'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OrderTable({ rows, t, users }: { rows: Order[]; t: (k: string) => string; users: User[] }) {
  if (!rows.length) return <div className="empty">{t('common.empty')}</div>
  return (
    <div className="table-wrap">
      <table>
        <thead>
            <tr>
              <th className="num">{t('common.n')}</th>
              <th>{t('common.position')}</th>
              <th>{t('orders.department')}</th>
              <th>{t('common.type')}</th>
              <th>{t('common.source')}</th>
              <th>{t('orders.qty')}</th>
              <th>{t('orders.urgency')}</th>
              <th>{t('orders.orderDate')}</th>
              <th>{t('orders.deadline')}</th>
              <th>{t('common.status')}</th>
              <th>{t('orders.responsible')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o, i) => (
              <tr key={o.id}>
                <td className="num">{i + 1}</td>
                <td>
                  {o.position}
                  {o.keyPosition && <span className="pill pill-pink" style={{ marginLeft: 6 }}>{t('orders.keyYes')}</span>}
                </td>
                <td>{o.department}</td>
                <td>{t(`type.${o.type}`)}</td>
                <td>{t(`source.${o.source}`)}</td>
                <td>{o.qty}</td>
                <td>{t(`urgency.${o.urgency}`)}</td>
              <td>{formatDate(o.orderDate)}</td>
              <td>{formatDate(o.deadline)}</td>
              <td>{t(`status.${o.status}`)}</td>
              <td>{userName(users, o.responsibleId, t('orders.unassigned'))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FunnelTable({ candidates, t }: { candidates: Candidate[]; t: (k: string) => string }) {
  return (
    <>
      {STAGES.map((stage: Stage) => {
        const rows =
          stage === 'probation'
            ? candidates.filter((c) => isOnProbation(c) && !isRejected(c))
            : candidates.filter((c) => c.stage === stage && !isRejected(c))
        return (
          <div key={stage} style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>
              {t(`stage.${stage}`)} · {rows.length}
            </h3>
            <CandidateTable rows={rows} t={t} />
          </div>
        )
      })}
    </>
  )
}

function HireTable({
  rows,
  t,
}: {
  rows: { c: Candidate; order: Order; hiredDate: string; daysN: number }[]
  t: (k: string) => string
}) {
  if (!rows.length) return <div className="empty">{t('common.empty')}</div>
  return (
    <div className="table-wrap">
      <table>
        <thead>
            <tr>
              <th className="num">{t('common.n')}</th>
              <th>{t('candidates.fullName')}</th>
              <th>{t('common.position')}</th>
              <th>{t('orders.orderDate')}</th>
              <th>{t('stage.hired')}</th>
              <th>{t('dash.avgDays')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.c.id}>
                <td className="num">{i + 1}</td>
                <td>{row.c.fullName}</td>
              <td>
                {row.c.position}
                {row.c.keyPosition && <span className="pill pill-pink" style={{ marginLeft: 6 }}>{t('orders.keyYes')}</span>}
              </td>
              <td>{formatDate(row.order.orderDate)}</td>
              <td>{formatDate(row.hiredDate)}</td>
              <td>
                {row.daysN} {t('dash.daysUnit')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
