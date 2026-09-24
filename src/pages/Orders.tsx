import { useMemo, useState } from 'react'
import { DateField } from '../DateField'
import { IconBack, IconEdit, IconPlus, IconSearch, IconTrash } from '../icons'
import { formatDate, useStore, userName } from '../store'
import { TableScroll } from '../TableScroll'
import type { ContractType, Order, OrderStatus, Source, Urgency } from '../types'
import { URGENCIES } from '../types'

type Sort = 'newest' | 'oldest' | 'az' | 'za' | 'deadline'

const empty = {
  position: '',
  department: '',
  source: 'external' as Source,
  type: 'staff' as ContractType,
  orderDate: new Date().toISOString().slice(0, 10),
  deadline: '',
  comment: '',
  status: 'open' as OrderStatus,
  qty: 1,
  urgency: 'medium' as Urgency,
  responsibleId: '',
  keyPosition: false,
  closedAt: null as string | null,
}

export function Orders() {
  const { t, orders, users, addOrder, updateOrder, deleteOrder, canManageOrders, currentUser } = useStore()
  const [mode, setMode] = useState<'list' | 'form'>('list')
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(empty)
  const [q, setQ] = useState('')
  const [type, setType] = useState<'all' | ContractType>('all')
  const [source, setSource] = useState<'all' | Source>('all')
  const [status, setStatus] = useState<'all' | OrderStatus>('all')
  const [sort, setSort] = useState<Sort>('newest')

  const openForm = (row?: Order) => {
    if (!canManageOrders) return
    if (row) {
      setEditId(row.id)
      setForm({
        position: row.position,
        department: row.department,
        source: row.source,
        type: row.type,
        orderDate: row.orderDate,
        deadline: row.deadline,
        comment: row.comment,
        status: row.status,
        qty: row.qty ?? 1,
        urgency: row.urgency ?? 'medium',
        responsibleId: row.responsibleId || '',
        keyPosition: Boolean(row.keyPosition),
        closedAt: row.closedAt,
      })
    } else {
      setEditId(null)
      setForm({ ...empty, orderDate: new Date().toISOString().slice(0, 10), responsibleId: currentUser?.id || '' })
    }
    setMode('form')
  }

  const save = () => {
    if (!form.position.trim() || !form.department.trim() || !form.orderDate || !form.deadline) return
    if (editId) updateOrder(editId, form)
    else addOrder(form)
    setMode('list')
  }

  const rows = useMemo(() => {
    let list = orders.filter((o) => {
      const who = userName(users, o.responsibleId)
      const text = `${o.position} ${o.department} ${o.comment} ${who}`.toLowerCase()
      if (q && !text.includes(q.toLowerCase())) return false
      if (type !== 'all' && o.type !== type) return false
      if (source !== 'all' && o.source !== source) return false
      if (status !== 'all' && o.status !== status) return false
      return true
    })
    list = [...list].sort((a, b) => {
      if (sort === 'newest') return b.orderDate.localeCompare(a.orderDate)
      if (sort === 'oldest') return a.orderDate.localeCompare(b.orderDate)
      if (sort === 'az') return a.position.localeCompare(b.position)
      if (sort === 'za') return b.position.localeCompare(a.position)
      return a.deadline.localeCompare(b.deadline)
    })
    return list
  }, [orders, users, q, type, source, status, sort])

  if (mode === 'form') {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>{editId ? t('orders.editTitle') : t('orders.newTitle')}</h1>
            <p>{t('orders.subtitle')}</p>
          </div>
          <button className="btn btn-ghost" onClick={() => setMode('list')}>
            <IconBack /> {t('common.back')}
          </button>
        </div>
        <div className="form-card">
          <div className="form-grid">
            <div className="field">
              <label>{t('common.position')}</label>
              <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </div>
            <div className="field">
              <label>{t('orders.department')}</label>
              <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <div className="field">
              <label>{t('common.source')}</label>
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as Source })}>
                <option value="internal">{t('source.internal')}</option>
                <option value="external">{t('source.external')}</option>
              </select>
            </div>
            <div className="field">
              <label>{t('common.type')}</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ContractType })}>
                <option value="staff">{t('type.staff')}</option>
                <option value="gpd">{t('type.gpd')}</option>
              </select>
            </div>
            <div className="field">
              <label>{t('orders.orderDate')}</label>
              <DateField value={form.orderDate} onChange={(iso) => setForm({ ...form, orderDate: iso })} />
            </div>
            <div className="field">
              <label>{t('orders.deadline')}</label>
              <DateField value={form.deadline} onChange={(iso) => setForm({ ...form, deadline: iso })} />
            </div>
            <div className="field">
              <label>{t('orders.qty')}</label>
              <input
                type="number"
                min={1}
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: Math.max(1, Number(e.target.value) || 1) })}
              />
            </div>
            <div className="field">
              <label>{t('orders.urgency')}</label>
              <select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value as Urgency })}>
                {URGENCIES.map((u) => (
                  <option key={u} value={u}>
                    {t(`urgency.${u}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t('orders.responsible')}</label>
              <select
                value={form.responsibleId}
                onChange={(e) => setForm({ ...form, responsibleId: e.target.value })}
              >
                <option value="">{t('orders.unassigned')}</option>
                {users
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} · {t(`role.${u.role}`)}
                    </option>
                  ))}
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
            {editId && (
              <div className="field">
                <label>{t('common.status')}</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as OrderStatus })}>
                  <option value="open">{t('status.open')}</option>
                  <option value="filled">{t('status.filled')}</option>
                  <option value="cancelled">{t('status.cancelled')}</option>
                </select>
              </div>
            )}
            <div className="field span2">
              <label>{t('common.comment')}</label>
              <textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setMode('list')}>
              <IconBack /> {t('common.back')}
            </button>
            <button className="btn btn-primary" style={{ width: 'auto' }} onClick={save} disabled={!canManageOrders}>
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
          <h1>{t('orders.title')}</h1>
          <p>
            {t('orders.list')} · {t('orders.total')}: {orders.length}
          </p>
        </div>
        {canManageOrders && (
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => openForm()}>
            <IconPlus /> {t('orders.add')}
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
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">{t('common.status')}: {t('common.all')}</option>
          <option value="open">{t('status.open')}</option>
          <option value="filled">{t('status.filled')}</option>
          <option value="cancelled">{t('status.cancelled')}</option>
        </select>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="newest">{t('common.sort')}: {t('common.newest')}</option>
          <option value="oldest">{t('common.oldest')}</option>
          <option value="az">{t('common.az')}</option>
          <option value="za">{t('common.za')}</option>
          <option value="deadline">{t('common.deadlineSoon')}</option>
        </select>
      </div>
      <TableScroll>
        <table>
          <thead>
            <tr>
              <th className="num">{t('common.n')}</th>
              <th>{t('common.position')}</th>
              <th>{t('orders.department')}</th>
              <th>{t('common.source')}</th>
              <th>{t('common.type')}</th>
              <th>{t('orders.qty')}</th>
              <th>{t('orders.urgency')}</th>
              <th>{t('orders.orderDate')}</th>
              <th>{t('orders.deadline')}</th>
              <th>{t('common.status')}</th>
              <th>{t('common.comment')}</th>
              <th>{t('orders.responsible')}</th>
              {canManageOrders && <th>{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={canManageOrders ? 13 : 12} className="empty">
                  {t('common.empty')}
                </td>
              </tr>
            )}
            {rows.map((o, i) => (
              <tr key={o.id}>
                <td className="num">{i + 1}</td>
                <td>
                  {o.position}
                  {o.keyPosition && <span className="pill pill-pink" style={{ marginLeft: 6 }}>{t('orders.keyYes')}</span>}
                </td>
                <td>{o.department}</td>
                <td>
                  <span className={o.source === 'internal' ? 'pill pill-pink' : 'pill pill-blue'}>
                    {t(`source.${o.source}`)}
                  </span>
                </td>
                <td>
                  <span className="pill pill-muted">{t(`type.${o.type}`)}</span>
                </td>
                <td>{o.qty}</td>
                <td>
                  <span
                    className={`pill ${
                      o.urgency === 'urgent' ? 'pill-red' : o.urgency === 'reserve' ? 'pill-blue' : 'pill-amber'
                    }`}
                  >
                    {t(`urgency.${o.urgency}`)}
                    </span>
                </td>
                <td>{formatDate(o.orderDate)}</td>
                <td>{formatDate(o.deadline)}</td>
                <td>
                  <span className={`pill ${o.status === 'open' ? 'pill-amber' : o.status === 'filled' ? 'pill-green' : 'pill-muted'}`}>
                    {t(`status.${o.status}`)}
                  </span>
                </td>
                <td className="comment">{o.comment || '—'}</td>
                <td>{userName(users, o.responsibleId, t('orders.unassigned'))}</td>
                {canManageOrders && (
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-sm btn-blue" onClick={() => openForm(o)}>
                        <IconEdit width={14} height={14} />
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          if (confirm(t('common.confirmDelete'))) deleteOrder(o.id)
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
