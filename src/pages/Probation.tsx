import { useMemo } from 'react'
import {
  daysBetween,
  formatDate,
  isOnProbation,
  isProbationDue,
  probationReviewDate,
  todayIso,
  useStore,
} from '../store'

export function Probation() {
  const { t, candidates, decideProbation, canManageCandidates } = useStore()
  const today = todayIso()

  const rows = useMemo(() => {
    return candidates
      .filter(isOnProbation)
      .slice()
      .sort((a, b) => {
        const ha = a.hiredDate || a.date
        const hb = b.hiredDate || b.date
        return ha.localeCompare(hb)
      })
  }, [candidates])

  const due = rows.filter((c) => isProbationDue(c, today))

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t('probation.title')}</h1>
          <p>
            {t('probation.list')} · {t('common.total')}: {rows.length}
          </p>
        </div>
      </div>

      {due.length > 0 && (
        <div className="alert-banner">
          <strong>{t('probation.dueBanner')}</strong>
          <span>
            {due.map((c) => c.fullName).join(', ')} — {t('probation.dueNotice')}
          </span>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="num">{t('common.n')}</th>
              <th>{t('candidates.fullName')}</th>
              <th>{t('common.position')}</th>
              <th>{t('probation.hiredDate')}</th>
              <th>{t('probation.reviewDate')}</th>
              <th>{t('probation.daysOn')}</th>
              <th>{t('probation.daysLeft')}</th>
              <th>{t('common.status')}</th>
              {canManageCandidates && <th className="sticky-actions">{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={canManageCandidates ? 9 : 8} className="empty">
                  {t('common.empty')}
                </td>
              </tr>
            )}
            {rows.map((c, i) => {
              const hired = c.hiredDate || c.date
              const review = probationReviewDate(hired)
              const onDays = daysBetween(hired, today)
              const left = daysBetween(today, review)
              const dueNow = isProbationDue(c, today)
              return (
                <tr key={c.id} className={dueNow ? 'row-due' : undefined}>
                  <td className="num">{i + 1}</td>
                  <td>{c.fullName}</td>
                  <td>
                    {c.position}
                    {c.keyPosition && <span className="pill pill-pink" style={{ marginLeft: 6 }}>{t('orders.keyYes')}</span>}
                  </td>
                  <td>{formatDate(hired)}</td>
                  <td>{formatDate(review)}</td>
                  <td>
                    {onDays} {t('dash.daysUnit')}
                  </td>
                  <td>
                    {dueNow ? (
                      <span className="pill pill-amber">
                        {t('common.overdueDays')}: {Math.abs(left)}
                      </span>
                    ) : (
                      `${left} ${t('dash.daysUnit')}`
                    )}
                  </td>
                  <td>
                    <span className={dueNow ? 'pill pill-amber' : 'pill pill-blue'}>
                      {dueNow ? t('probation.dueBanner') : t('probation.pending')}
                    </span>
                  </td>
                  {canManageCandidates && (
                    <td className="sticky-actions">
                      <div className="row-actions">
                        <button className="btn btn-sm btn-ok" onClick={() => decideProbation(c.id, 'passed')}>
                          {t('probation.passedBtn')}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => decideProbation(c.id, 'failed')}>
                          {t('probation.failedBtn')}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
