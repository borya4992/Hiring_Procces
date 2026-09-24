import { Fragment, useMemo, useState } from 'react'
import { Bars } from '../charts'
import { DateField } from '../DateField'
import { downloadExcel } from '../excel'
import { IconDownload, IconSearch, IconSpark } from '../icons'
import { buildAiSummary } from '../insights'
import {
  eachDay,
  formatDate,
  inRange,
  isHiredStage,
  isOnProbation,
  isRejected,
  lastNDays,
  orderQty,
  rejectedFromOf,
  stageBreakdown,
  todayIso,
  useStore,
  userName,
} from '../store'
import { TableScroll } from '../TableScroll'
import type { OrderStatus, Stage } from '../types'
import { REJECTABLE_STAGES, STAGES } from '../types'

const STAGE_KEYS: Stage[] = [...STAGES, 'rejected']

export function Reports() {
  const { t, lang, candidates, orders, users, deletedOrders, deletedCandidates, restoreOrder, restoreCandidate, canManageOrders, canManageCandidates } = useStore()
  const [from, setFrom] = useState(() => lastNDays(30)[0])
  const [to, setTo] = useState(() => todayIso())
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('all')
  const [pos, setPos] = useState('all')
  const [status, setStatus] = useState<'all' | OrderStatus>('all')
  const [resp, setResp] = useState('all')
  const [openRow, setOpenRow] = useState<string | null>(null)

  const periodCands = candidates.filter((c) => inRange(c.date, from, to))
  const periodOrders = orders.filter((o) => inRange(o.orderDate, from, to))
  const interviews = periodCands.filter((c) => c.stage === 'interview')
  const hired = candidates.filter((c) => {
    const d = c.hiredDate || (c.stage === 'hired' || c.stage === 'probation' ? c.date : '')
    return d && inRange(d, from, to)
  })
  const passed = candidates.filter((c) => c.probationResult === 'passed' && c.probationDecidedAt && inRange(c.probationDecidedAt, from, to))
  const failed = candidates.filter((c) => c.probationResult === 'failed' && c.probationDecidedAt && inRange(c.probationDecidedAt, from, to))

  const funnel = STAGES.map((s) =>
    periodCands.filter((c) => !isRejected(c) && (s === 'probation' ? isOnProbation(c) : c.stage === s)).length,
  )
  const max = Math.max(1, ...funnel)

  const periodRejected = candidates.filter((c) => isRejected(c) && inRange(c.rejectedAt || c.date, from, to))
  const rejectedByStage = REJECTABLE_STAGES.map((s) => ({
    key: s,
    n: periodRejected.filter((c) => rejectedFromOf(c) === s).length,
  }))

  const qtySum = (list: typeof periodOrders) => list.reduce((n, o) => n + orderQty(o), 0)
  const staff = periodCands.filter((c) => c.type === 'staff').length
  const gpd = periodCands.filter((c) => c.type === 'gpd').length
  const internal = periodCands.filter((c) => c.source === 'internal').length
  const external = periodCands.filter((c) => c.source === 'external').length
  const filled = qtySum(periodOrders.filter((o) => o.status === 'filled'))
  const open = qtySum(periodOrders.filter((o) => o.status === 'open'))
  const cancelled = qtySum(periodOrders.filter((o) => o.status === 'cancelled'))
  const ordersCount = qtySum(periodOrders)

  const departments = useMemo(
    () => [...new Set(periodOrders.map((o) => o.department))].sort((a, b) => a.localeCompare(b)),
    [periodOrders],
  )
  const positions = useMemo(
    () => [...new Set(periodOrders.map((o) => o.position))].sort((a, b) => a.localeCompare(b)),
    [periodOrders],
  )

  const filteredOrders = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return periodOrders.filter((o) => {
      if (dept !== 'all' && o.department !== dept) return false
      if (pos !== 'all' && o.position !== pos) return false
      if (status !== 'all' && o.status !== status) return false
      if (resp === 'none' && o.responsibleId) return false
      if (resp !== 'all' && resp !== 'none' && o.responsibleId !== resp) return false
      if (needle) {
        const who = userName(users, o.responsibleId)
        const text = `${o.position} ${o.department} ${o.comment} ${who}`.toLowerCase()
        if (!text.includes(needle)) return false
      }
      return true
    })
  }, [periodOrders, dept, pos, status, resp, q, users])

  const directionRows = useMemo(() => {
    const hiredTotal = new Map<string, number>()
    for (const c of candidates) {
      if (!isRejected(c) && isHiredStage(c.stage)) {
        hiredTotal.set(c.position, (hiredTotal.get(c.position) || 0) + 1)
      }
    }
    const used = new Map<string, number>()
    return filteredOrders
      .slice()
      .sort(
        (a, b) =>
          a.department.localeCompare(b.department) ||
          a.position.localeCompare(b.position) ||
          a.orderDate.localeCompare(b.orderDate),
      )
      .map((o) => {
        const already = used.get(o.position) || 0
        const take = Math.min(orderQty(o), Math.max(0, (hiredTotal.get(o.position) || 0) - already))
        used.set(o.position, already + take)
        const people = candidates
          .filter((c) => c.position === o.position)
          .slice()
          .sort(
            (a, b) =>
              STAGES.indexOf(a.stage === 'rejected' ? 'screening' : a.stage) -
                STAGES.indexOf(b.stage === 'rejected' ? 'screening' : b.stage) ||
              a.fullName.localeCompare(b.fullName),
          )
        return {
          o,
          people,
          stages: stageBreakdown(people),
          candidates: people.length,
          hired: take,
        }
      })
  }, [filteredOrders, candidates])

  const daily = eachDay(from, to).map((d) => ({
    date: d,
    candidates: candidates.filter((c) => c.date === d).length,
    orders: qtySum(orders.filter((o) => o.orderDate === d)),
    hired: candidates.filter((c) => (c.hiredDate || '') === d).length,
    passed: candidates.filter((c) => c.probationDecidedAt === d && c.probationResult === 'passed').length,
    failed: candidates.filter((c) => c.probationDecidedAt === d && c.probationResult === 'failed').length,
  }))

  const kpis = [
    { k: t('reports.candidatesCount'), v: periodCands.length },
    { k: t('reports.ordersCount'), v: ordersCount },
    { k: t('reports.interviewsCount'), v: interviews.length },
    { k: t('reports.hiredCount'), v: hired.length },
    { k: t('reports.passedCount'), v: passed.length },
    { k: t('reports.failedCount'), v: failed.length },
  ]

  const aiLines = useMemo(
    () => buildAiSummary(lang, periodOrders, candidates, formatDate(from), formatDate(to)),
    [lang, periodOrders, candidates, from, to],
  )

  const exportXls = () => {
    downloadExcel(`HP-Hiring-Procces-hisobot-${formatDate(from)}-${formatDate(to)}.xls`, [
      {
        name: t('reports.aiTitle'),
        headers: [t('reports.aiTitle')],
        rows: aiLines.map((line) => [line]),
      },
      {
        name: t('reports.sheetSummary'),
        headers: [t('common.status'), t('common.total')],
        rows: kpis.map((x) => [x.k, x.v]),
      },
      {
        name: t('reports.sheetDirections'),
        headers: [
          t('common.n'),
          t('reports.department'),
          t('common.position'),
          t('orders.keyPosition'),
          t('dash.orderCounts'),
          t('orders.orderDate'),
          t('orders.deadline'),
          t('reports.orderStatus'),
          t('reports.foundCandidates'),
          t('reports.stageBreakdown'),
          t('reports.hiredCount'),
          t('orders.responsible'),
        ],
        rows: directionRows.map((row, i) => [
          i + 1,
          row.o.department,
          row.o.position,
          row.o.keyPosition ? t('common.yes') : t('common.no'),
          orderQty(row.o),
          formatDate(row.o.orderDate),
          formatDate(row.o.deadline),
          t(`status.${row.o.status}`),
          row.candidates,
          STAGE_KEYS.filter((s) => (row.stages[s] || 0) > 0)
            .map((s) => `${t(`stage.${s}`)}: ${row.stages[s]}`)
            .join(' · '),
          row.hired,
          userName(users, row.o.responsibleId, t('orders.unassigned')),
        ]),
      },
      {
        name: t('reports.sheetFunnel'),
        headers: [t('common.n'), t('candidates.stage'), t('common.total')],
        rows: STAGES.map((s, i) => [i + 1, t(`stage.${s}`), funnel[i]]),
      },
      {
        name: t('reports.sheetRejected'),
        headers: [t('common.n'), t('candidates.stage'), t('reports.rejectedCount')],
        rows: rejectedByStage.map((row, i) => [i + 1, t(`stage.${row.key}`), row.n]),
      },
      {
        name: t('reports.sheetDaily'),
        headers: [
          t('common.n'),
          t('common.date'),
          t('reports.candidatesCount'),
          t('reports.ordersCount'),
          t('reports.hiredCount'),
          t('reports.passedCount'),
          t('reports.failedCount'),
        ],
        rows: daily.map((row, i) => [i + 1, formatDate(row.date), row.candidates, row.orders, row.hired, row.passed, row.failed]),
      },
    ])
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t('reports.title')}</h1>
          <p>{t('reports.subtitle')}</p>
        </div>
        <div className="period-range">
          <label>
            {t('common.from')}
            <DateField value={from} max={to} onChange={setFrom} />
          </label>
          <label>
            {t('common.to')}
            <DateField value={to} min={from} onChange={setTo} />
          </label>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={exportXls}>
            <IconDownload /> {t('common.exportExcel')}
          </button>
        </div>
      </div>

      <h3 className="section-title">{t('reports.kpi')} · {t('reports.byPeriod')}</h3>
      <div className="grid stats six" style={{ marginBottom: 14 }}>
        {kpis.map((s) => (
          <div className="card hover-blue" key={s.k}>
            <div className="stat-kicker">{s.k}</div>
            <div className="stat-value">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="card hover-blue" style={{ marginBottom: 14 }}>
        <h3>{t('reports.byDirection')}</h3>
        <div className="toolbar" style={{ marginTop: 10 }}>
          <label className="search">
            <IconSearch />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('reports.filterOrders')} />
          </label>
          <select className="select" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="all">{t('reports.department')}: {t('common.all')}</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select className="select" value={pos} onChange={(e) => setPos(e.target.value)}>
            <option value="all">{t('common.position')}: {t('common.all')}</option>
            {positions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="all">{t('reports.orderStatus')}: {t('common.all')}</option>
            <option value="open">{t('status.open')}</option>
            <option value="filled">{t('status.filled')}</option>
            <option value="cancelled">{t('status.cancelled')}</option>
          </select>
          <select className="select" value={resp} onChange={(e) => setResp(e.target.value)}>
            <option value="all">{t('orders.responsible')}: {t('common.all')}</option>
            <option value="none">{t('orders.unassigned')}</option>
            {users
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </select>
        </div>
        <TableScroll flush>
          <table>
            <thead>
              <tr>
                <th className="num">{t('common.n')}</th>
                <th>{t('reports.department')}</th>
                <th>{t('common.position')}</th>
                <th>{t('dash.orderCounts')}</th>
                <th>{t('orders.orderDate')}</th>
                <th>{t('orders.deadline')}</th>
                <th>{t('reports.orderStatus')}</th>
                <th>{t('reports.foundCandidates')}</th>
                <th>{t('reports.stageBreakdown')}</th>
                <th>{t('reports.hiredCount')}</th>
                <th>{t('orders.responsible')}</th>
              </tr>
            </thead>
            <tbody>
              {directionRows.length === 0 && (
                <tr>
                  <td colSpan={11} className="empty">
                    {t('common.empty')}
                  </td>
                </tr>
              )}
              {directionRows.map((row, i) => (
                <Fragment key={row.o.id}>
                  <tr
                    className={openRow === row.o.id ? 'row-picked' : undefined}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setOpenRow((id) => (id === row.o.id ? null : row.o.id))}
                  >
                    <td className="num">{i + 1}</td>
                    <td>{row.o.department}</td>
                    <td>
                      {row.o.position}
                      {row.o.keyPosition && <span className="pill pill-pink" style={{ marginLeft: 6 }}>{t('orders.keyYes')}</span>}
                    </td>
                    <td>{orderQty(row.o)}</td>
                    <td>{formatDate(row.o.orderDate)}</td>
                    <td>{formatDate(row.o.deadline)}</td>
                    <td>{t(`status.${row.o.status}`)}</td>
                    <td>
                      <b>{row.candidates}</b>
                    </td>
                    <td>
                      <div className="stage-mix">
                        {STAGE_KEYS.filter((s) => (row.stages[s] || 0) > 0).map((s) => (
                          <span key={s} className={`pill ${s === 'rejected' ? 'pill-red' : s === 'hired' || s === 'probation' ? 'pill-green' : 'pill-muted'}`}>
                            {t(`stage.${s}`)} {row.stages[s]}
                          </span>
                        ))}
                        {row.candidates === 0 && '—'}
                      </div>
                    </td>
                    <td>{row.hired}</td>
                    <td>{userName(users, row.o.responsibleId, t('orders.unassigned'))}</td>
                  </tr>
                  {openRow === row.o.id && (
                    <tr className="row-expand">
                      <td colSpan={11}>
                        {row.people.length === 0 ? (
                          <div className="empty">{t('common.empty')}</div>
                        ) : (
                          <div className="mini-cands">
                            {row.people.map((c) => (
                              <div className="mini-cand" key={c.id}>
                                <span>{c.fullName}</span>
                                <span>
                                  {isRejected(c)
                                    ? `${t('candidates.rejected')} · ${t(`stage.${c.rejectedFrom || c.stage}`)}`
                                    : t(`stage.${c.stage}`)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </div>

      <div className="card ai-card hover-blue" style={{ marginBottom: 14 }}>
        <div className="funnel-head">
          <h3>
            <IconSpark width={18} height={18} /> {t('reports.aiTitle')}
          </h3>
          <div className="funnel-total">{t('reports.aiHint')}</div>
        </div>
        <div className="ai-list">
          {aiLines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>

      <div className="grid" style={{ marginBottom: 14 }}>
        <div className="card hover-blue">
          <div className="funnel-head">
            <h3>{t('reports.conversion')}</h3>
            <div className="funnel-total">
              {t('dash.funnelTotal')}: <b>{periodCands.length}</b>
            </div>
          </div>
          <div className="funnel">
            {STAGES.map((s, i) => {
              const n = funnel[i]
              const share = periodCands.length ? Math.round((n / periodCands.length) * 100) : 0
              return (
                <div className="funnel-step" key={s}>
                  <div className="n">{n}</div>
                  <div className="l">{t(`stage.${s}`)}</div>
                  <div className="funnel-bar">
                    <span style={{ width: `${(n / max) * 100}%` }} />
                  </div>
                  <div className="funnel-conv">{share}%</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="card hover-blue" style={{ marginBottom: 14 }}>
        <div className="funnel-head">
          <h3>{t('reports.rejectedByStage')}</h3>
          <div className="funnel-total">
            {t('reports.rejectedCount')}: <b>{periodRejected.length}</b>
          </div>
        </div>
        <Bars
          items={[
            { label: t('stage.screening'), value: rejectedByStage[0].n, color: '#ff2e97' },
            { label: t('stage.interview'), value: rejectedByStage[1].n, color: '#2ec5ff' },
            { label: t('stage.internship'), value: rejectedByStage[2].n, color: '#ffc14d' },
            { label: t('stage.documents'), value: rejectedByStage[3].n, color: '#9b7dff' },
          ]}
        />
        <TableScroll flush>
          <table>
            <thead>
              <tr>
                <th className="num">{t('common.n')}</th>
                <th>{t('candidates.stage')}</th>
                <th>{t('reports.rejectedCount')}</th>
              </tr>
            </thead>
            <tbody>
              {rejectedByStage.map((row, i) => (
                <tr key={row.key}>
                  <td className="num">{i + 1}</td>
                  <td>{t(`stage.${row.key}`)}</td>
                  <td>{row.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </div>

      <div className="grid three">
        <div className="card hover-blue">
          <h3>{t('reports.staffGpd')}</h3>
          <Bars
            items={[
              { label: t('type.staff'), value: staff, color: '#2ec5ff' },
              { label: t('type.gpd'), value: gpd, color: '#ff2e97' },
            ]}
          />
        </div>
        <div className="card hover-blue">
          <h3>{t('reports.intExt')}</h3>
          <Bars
            items={[
              { label: t('source.internal'), value: internal, color: '#9b7dff' },
              { label: t('source.external'), value: external, color: '#3ee0a0' },
            ]}
          />
        </div>
        <div className="card hover-blue">
          <h3>{t('reports.fulfillment')}</h3>
          <Bars
            items={[
              { label: t('status.open'), value: open, color: '#ffc14d' },
              { label: t('status.filled'), value: filled, color: '#3ee0a0' },
              { label: t('status.cancelled'), value: cancelled, color: '#8b97ab' },
            ]}
          />
        </div>
      </div>

      <div className="card hover-blue" style={{ marginTop: 14 }}>
        <h3>{t('reports.deleted')}</h3>
        <h4 className="section-title">{t('reports.deletedOrders')}</h4>
        {deletedOrders.length === 0 ? (
          <div className="empty">{t('common.empty')}</div>
        ) : (
          <TableScroll flush>
            <table>
              <thead>
                <tr>
                  <th className="num">{t('common.n')}</th>
                  <th>{t('common.position')}</th>
                  <th>{t('orders.department')}</th>
                  <th>{t('orders.qty')}</th>
                  <th>{t('orders.urgency')}</th>
                  <th>{t('common.deletedAt')}</th>
                  <th>{t('orders.responsible')}</th>
                  {(canManageOrders) && <th>{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {deletedOrders.map((o, i) => (
                  <tr key={o.id}>
                    <td className="num">{i + 1}</td>
                    <td>
                      {o.position}
                      {o.keyPosition && <span className="pill pill-pink" style={{ marginLeft: 6 }}>{t('orders.keyYes')}</span>}
                    </td>
                    <td>{o.department}</td>
                    <td>{o.qty}</td>
                    <td>{t(`urgency.${o.urgency}`)}</td>
                    <td>{formatDate(o.deletedAt.slice(0, 10))}</td>
                    <td>{userName(users, o.responsibleId, t('orders.unassigned'))}</td>
                    {canManageOrders && (
                      <td>
                        <button className="btn btn-sm btn-ok" onClick={() => restoreOrder(o.id)}>
                          {t('common.restore')}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
        <h4 className="section-title">{t('reports.deletedCandidates')}</h4>
        {deletedCandidates.length === 0 ? (
          <div className="empty">{t('common.empty')}</div>
        ) : (
          <TableScroll flush>
            <table>
              <thead>
                <tr>
                  <th className="num">{t('common.n')}</th>
                  <th>{t('candidates.fullName')}</th>
                  <th>{t('common.position')}</th>
                  <th>{t('candidates.stage')}</th>
                  <th>{t('common.deletedAt')}</th>
                  {canManageCandidates && <th>{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {deletedCandidates.map((c, i) => (
                  <tr key={c.id}>
                    <td className="num">{i + 1}</td>
                    <td>{c.fullName}</td>
                    <td>{c.position}</td>
                    <td>{t(`stage.${c.stage}`)}</td>
                    <td>{formatDate(c.deletedAt.slice(0, 10))}</td>
                    {canManageCandidates && (
                      <td>
                        <button className="btn btn-sm btn-ok" onClick={() => restoreCandidate(c.id)}>
                          {t('common.restore')}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </div>
    </>
  )
}
