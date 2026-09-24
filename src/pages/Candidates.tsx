import { useMemo, useState } from 'react'
import { DateField } from '../DateField'
import { IconBack, IconEdit, IconPlus, IconSearch, IconTrash } from '../icons'
import { daysAtStage, daysInCurrentStage, formatDate, isInternshipDue, isRejectableStage, isRejected, todayIso, useStore } from '../store'
import { TableScroll } from '../TableScroll'
import type { Candidate, ContractType, PipelineStage, Source, Stage, StageDates } from '../types'
import { STAGES } from '../types'

type Sort = 'newest' | 'oldest' | 'az' | 'za'

const empty = {
  fullName: '',
  position: '',
  source: 'external' as Source,
  previousPosition: '',
  type: 'staff' as ContractType,
  date: new Date().toISOString().slice(0, 10),
  comment: '',
  stage: 'found' as Stage,
  hiredDate: null as string | null,
  probationResult: null as Candidate['probationResult'],
  probationDecidedAt: null as string | null,
  rejectedFrom: null as Stage | null,
  rejectedAt: null as string | null,
  stageDates: {} as StageDates,
  keyPosition: false,
}

export function Candidates() {
  const { t, candidates, orders, addCandidate, updateCandidate, bulkUpdateStages, deleteCandidate, rejectCandidate, unrejectCandidate, canManageCandidates } = useStore()
  const [mode, setMode] = useState<'list' | 'form'>('list')
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(empty)
  const [q, setQ] = useState('')
  const [type, setType] = useState<'all' | ContractType>('all')
  const [source, setSource] = useState<'all' | Source>('all')
  const [stage, setStage] = useState<'all' | Stage>('all')
  const [sort, setSort] = useState<Sort>('newest')
  const [picked, setPicked] = useState<string[]>([])
  const [bulkStage, setBulkStage] = useState<Stage>('found')

  const openForm = (row?: Candidate) => {
    if (!canManageCandidates) return
    if (row) {
      setEditId(row.id)
      setForm({
        fullName: row.fullName,
        position: row.position,
        source: row.source,
        previousPosition: row.previousPosition,
        type: row.type,
        date: row.date,
        comment: row.comment,
        stage: row.stage === 'rejected' ? row.rejectedFrom || 'screening' : row.stage,
        hiredDate: row.hiredDate,
        probationResult: row.probationResult,
        probationDecidedAt: row.probationDecidedAt,
        rejectedFrom: row.rejectedFrom,
        rejectedAt: row.rejectedAt,
        stageDates: row.stageDates || {},
        keyPosition: Boolean(row.keyPosition),
      })
    } else {
      setEditId(null)
      setForm({ ...empty, date: new Date().toISOString().slice(0, 10) })
    }
    setMode('form')
  }

  const save = () => {
    if (!form.fullName.trim() || !form.position.trim() || !form.date) return
    const payload = {
      ...form,
      previousPosition: form.source === 'internal' ? form.previousPosition : '',
    }
    if (editId) {
      const current = candidates.find((c) => c.id === editId)
      if (current && isRejected(current) && payload.stage !== current.stage) {
        payload.rejectedFrom = null
        payload.rejectedAt = null
      }
      updateCandidate(editId, payload)
    } else addCandidate(payload)
    setMode('list')
  }

  const rows = useMemo(() => {
    let list = candidates.filter((c) => {
      const text = `${c.fullName} ${c.position} ${c.comment} ${c.previousPosition}`.toLowerCase()
      if (q && !text.includes(q.toLowerCase())) return false
      if (type !== 'all' && c.type !== type) return false
      if (source !== 'all' && c.source !== source) return false
      if (stage === 'rejected') return isRejected(c)
      if (stage !== 'all' && (c.stage !== stage || isRejected(c))) return false
      return true
    })
    list = [...list].sort((a, b) => {
      if (sort === 'newest') return b.date.localeCompare(a.date)
      if (sort === 'oldest') return a.date.localeCompare(b.date)
      if (sort === 'az') return a.fullName.localeCompare(b.fullName)
      return b.fullName.localeCompare(a.fullName)
    })
    return list
  }, [candidates, q, type, source, stage, sort])

  const allIds = rows.map((c) => c.id)
  const allPicked = allIds.length > 0 && allIds.every((id) => picked.includes(id))
  const toggleAll = () => setPicked(allPicked ? [] : allIds)
  const toggleOne = (id: string) => {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  const applyBulk = () => {
    if (!picked.length) return
    bulkUpdateStages(picked, bulkStage)
    setPicked([])
  }

  if (mode === 'form') {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>{editId ? t('candidates.editTitle') : t('candidates.newTitle')}</h1>
            <p>{t('candidates.subtitle')}</p>
          </div>
          <button className="btn btn-ghost" onClick={() => setMode('list')}>
            <IconBack /> {t('common.back')}
          </button>
        </div>
        <div className="form-card">
          <div className="form-grid">
            <div className="field">
              <label>{t('candidates.fullName')}</label>
              <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="field">
              <label>{t('common.position')}</label>
              <input
                value={form.position}
                onChange={(e) => {
                  const position = e.target.value
                  const fromOrder = orders.some(
                    (o) => o.keyPosition && o.position.trim().toLowerCase() === position.trim().toLowerCase(),
                  )
                  setForm({ ...form, position, keyPosition: fromOrder ? true : form.keyPosition })
                }}
              />
            </div>
            <div className="field">
              <label>{t('common.source')}</label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value as Source, previousPosition: '' })}
              >
                <option value="internal">{t('source.internal')}</option>
                <option value="external">{t('source.external')}</option>
              </select>
            </div>
            {form.source === 'internal' && (
              <div className="field">
                <label>{t('candidates.previous')}</label>
                <input
                  value={form.previousPosition}
                  onChange={(e) => setForm({ ...form, previousPosition: e.target.value })}
                />
              </div>
            )}
            <div className="field">
              <label>{t('common.type')}</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ContractType })}>
                <option value="staff">{t('type.staff')}</option>
                <option value="gpd">{t('type.gpd')}</option>
              </select>
            </div>
            <div className="field">
              <label>{t('orders.keyPosition')}</label>
              <select
                value={form.keyPosition ? 'yes' : 'no'}
                onChange={(e) => setForm({ ...form, keyPosition: e.target.value === 'yes' })}
              >
                <option value="no">{t('common.no')}</option>
                <option value="yes">{t('common.yes')}</option>
              </select>
            </div>
            <div className="field">
              <label>{t('common.date')}</label>
              <DateField
                value={form.date}
                onChange={(iso) => setForm({ ...form, date: iso, stageDates: { ...form.stageDates, found: iso } })}
              />
            </div>
            <div className="field">
              <label>{t('candidates.stage')}</label>
              <select
                value={form.stage}
                onChange={(e) => {
                  const stage = e.target.value as Stage
                  const stageDates = { ...form.stageDates }
                  if (stage !== 'rejected' && !stageDates[stage as keyof StageDates]) {
                    stageDates[stage as keyof StageDates] = todayIso()
                  }
                  setForm({ ...form, stage, stageDates })
                }}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {t(`stage.${s}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field span2">
              <label>{t('candidates.stageDates')}</label>
              <div className="stage-dates-grid">
                {STAGES.map((s) => {
                  const days = daysAtStage(form as Candidate, s as PipelineStage)
                  return (
                  <div className="field" key={s}>
                    <label>
                      {t(`stage.${s}`)}
                      {days != null ? ` · ${days} ${t('dash.daysUnit')}` : ''}
                    </label>
                    <DateField
                      value={form.stageDates[s] || ''}
                      onChange={(iso) => {
                        const stageDates = { ...form.stageDates, [s]: iso }
                        setForm({
                          ...form,
                          stageDates,
                          date: s === 'found' ? iso : form.date,
                          hiredDate: s === 'hired' ? iso : form.hiredDate,
                        })
                      }}
                    />
                  </div>
                  )
                })}
              </div>
            </div>
            <div className="field span2">
              <label>{t('common.comment')}</label>
              <textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setMode('list')}>
              <IconBack /> {t('common.back')}
            </button>
            <button className="btn btn-primary" style={{ width: 'auto' }} onClick={save} disabled={!canManageCandidates}>
              {t('common.save')}
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t('candidates.title')}</h1>
          <p>
            {t('candidates.list')} · {t('candidates.total')}: {candidates.length}
          </p>
        </div>
        {canManageCandidates && (
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => openForm()}>
            <IconPlus /> {t('candidates.add')}
          </button>
        )}
      </div>
      <div className="toolbar">
        <label className="search">
          <IconSearch />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common.search')} />
        </label>
        <select className="select" value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
          <option value="all">{t('common.filter')}: {t('common.all')}</option>
          <option value="internal">{t('source.internal')}</option>
          <option value="external">{t('source.external')}</option>
        </select>
        <select className="select" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="all">{t('common.type')}: {t('common.all')}</option>
          <option value="staff">{t('type.staff')}</option>
          <option value="gpd">{t('type.gpd')}</option>
        </select>
        <select className="select" value={stage} onChange={(e) => setStage(e.target.value as typeof stage)}>
          <option value="all">{t('candidates.stage')}: {t('common.all')}</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {t(`stage.${s}`)}
            </option>
          ))}
          <option value="rejected">{t('candidates.rejected')}</option>
        </select>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="newest">{t('common.sort')}: {t('common.newest')}</option>
          <option value="oldest">{t('common.oldest')}</option>
          <option value="az">{t('common.az')}</option>
          <option value="za">{t('common.za')}</option>
        </select>
      </div>
      {canManageCandidates && (
        <div className="bulk-bar">
          <span>
            {t('common.selected')}: {picked.length}
          </span>
          <select className="select" value={bulkStage} onChange={(e) => setBulkStage(e.target.value as Stage)}>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {t(`stage.${s}`)}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" style={{ width: 'auto' }} disabled={!picked.length} onClick={applyBulk}>
            {t('candidates.bulkStage')}
          </button>
        </div>
      )}
      <TableScroll>
        <table>
          <thead>
            <tr>
              {canManageCandidates && (
                <th className="num">
                  <input type="checkbox" checked={allPicked} onChange={toggleAll} title={t('common.selectAll')} />
                </th>
              )}
              <th className="num">{t('common.n')}</th>
              <th>{t('candidates.fullName')}</th>
              <th>{t('common.position')}</th>
              <th>{t('common.source')}</th>
              <th>{t('candidates.previous')}</th>
              <th>{t('common.type')}</th>
              <th>{t('common.date')}</th>
              <th>{t('candidates.stage')}</th>
              <th>{t('candidates.stageDate')}</th>
              <th>{t('candidates.daysInStage')}</th>
              <th>{t('candidates.reject')}</th>
              <th>{t('common.comment')}</th>
              {canManageCandidates && <th>{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={canManageCandidates ? 14 : 12} className="empty">
                  {t('common.empty')}
                </td>
              </tr>
            )}
            {rows.map((c, i) => (
              <tr key={c.id} className={picked.includes(c.id) ? 'row-picked' : undefined}>
                {canManageCandidates && (
                  <td className="num">
                    <input type="checkbox" checked={picked.includes(c.id)} onChange={() => toggleOne(c.id)} />
                  </td>
                )}
                <td className="num">{i + 1}</td>
                <td>{c.fullName}</td>
                <td>
                  {c.position}
                  {c.keyPosition && <span className="pill pill-pink" style={{ marginLeft: 6 }}>{t('orders.keyYes')}</span>}
                </td>
                <td>
                  <span className={c.source === 'internal' ? 'pill pill-pink' : 'pill pill-blue'}>
                    {t(`source.${c.source}`)}
                  </span>
                </td>
                <td>{c.source === 'internal' ? c.previousPosition || '—' : '—'}</td>
                <td>
                  <span className="pill pill-muted">{t(`type.${c.type}`)}</span>
                </td>
                <td>{formatDate(c.date)}</td>
                <td>
                  {isRejected(c) || !canManageCandidates ? (
                    t(`stage.${c.stage}`)
                  ) : (
                    <select
                      className="select"
                      value={c.stage}
                      onChange={(e) => updateCandidate(c.id, { stage: e.target.value as Stage })}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {t(`stage.${s}`)}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td>
                  {canManageCandidates && c.stage !== 'rejected' ? (
                    <DateField
                      value={c.stageDates?.[c.stage as keyof StageDates] || c.date}
                      onChange={(iso) =>
                        updateCandidate(c.id, {
                          stageDates: { ...c.stageDates, [c.stage]: iso },
                          date: c.stage === 'found' ? iso : c.date,
                          hiredDate: c.stage === 'hired' ? iso : c.hiredDate,
                        })
                      }
                    />
                  ) : (
                    formatDate(c.stageDates?.[c.stage as keyof StageDates] || c.date)
                  )}
                </td>
                <td>
                  {daysInCurrentStage(c)} {t('dash.daysUnit')}
                  {isInternshipDue(c) && (
                    <div>
                      <span className="pill pill-red">{t('candidates.internshipDue')}</span>
                    </div>
                  )}
                </td>
                <td>
                  {isRejected(c) ? (
                    <div className="row-actions">
                      <span className="pill pill-red">{t('candidates.rejected')}</span>
                      {canManageCandidates && (
                        <button className="btn btn-sm btn-ghost" onClick={() => unrejectCandidate(c.id)}>
                          {t('candidates.unreject')}
                        </button>
                      )}
                    </div>
                  ) : canManageCandidates && isRejectableStage(c.stage) ? (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => {
                        if (confirm(t('candidates.confirmReject'))) rejectCandidate(c.id)
                      }}
                    >
                      {t('candidates.reject')}
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="comment">{c.comment || '—'}</td>
                {canManageCandidates && (
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-sm btn-blue" onClick={() => openForm(c)}>
                        <IconEdit width={14} height={14} />
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          if (confirm(t('common.confirmDelete'))) deleteCandidate(c.id)
                        }}
                      >
                        <IconTrash width={14} height={14} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </>
  )
}
