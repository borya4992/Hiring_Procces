import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { IconBack, IconEdit, IconKey, IconPlus, IconTrash } from '../icons'
import { useStore } from '../store'
import { ROLES, type Role, type User } from '../types'

const empty = { name: '', email: '', password: '', role: 'recruiter' as Role }

export function Users() {
  const { t, users, isAdmin, currentUser, addUser, updateUser, setUserPassword, deleteUser } = useStore()
  const [mode, setMode] = useState<'list' | 'form'>('list')
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(empty)
  const [err, setErr] = useState('')
  const [pwdFor, setPwdFor] = useState<User | null>(null)
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [pwdErr, setPwdErr] = useState('')

  if (!isAdmin) return <Navigate to="/" replace />

  const openForm = (row?: User) => {
    setErr('')
    if (row) {
      setEditId(row.id)
      setForm({ name: row.name, email: row.email, password: '', role: row.role })
    } else {
      setEditId(null)
      setForm(empty)
    }
    setMode('form')
  }

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setErr(t('common.required'))
      return
    }
    if (editId) {
      const msg = updateUser(editId, { name: form.name.trim(), email: form.email.trim(), role: form.role })
      if (msg) setErr(msg)
      else setMode('list')
    } else {
      const msg = await addUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      })
      if (msg) setErr(msg)
      else setMode('list')
    }
  }

  if (mode === 'form') {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>{editId ? t('common.edit') : t('users.add')}</h1>
            <p>{t('users.subtitle')}</p>
          </div>
          <button className="btn btn-ghost" onClick={() => setMode('list')}>
            <IconBack /> {t('common.back')}
          </button>
        </div>
        <div className="form-card">
          {err && <div className="auth-error">{err}</div>}
          <div className="form-grid">
            <div className="field">
              <label>{t('users.name')}</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>{t('auth.email')}</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label>{t('users.role')}</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`role.${r}`)}
                  </option>
                ))}
              </select>
            </div>
            {!editId && (
              <div className="field">
                <label>{t('users.password')}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            )}
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setMode('list')}>
              <IconBack /> {t('common.back')}
            </button>
            <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => void save()}>
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
          <h1>{t('users.title')}</h1>
          <p>
            {t('users.subtitle')} · {t('common.total')}: {users.length}
          </p>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => openForm()}>
          <IconPlus /> {t('users.add')}
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="num">{t('common.n')}</th>
              <th>{t('users.name')}</th>
              <th>{t('auth.email')}</th>
              <th>{t('users.role')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id}>
                <td className="num">{i + 1}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                      {u.avatar ? <img src={u.avatar} alt="" /> : u.name.slice(0, 1)}
                    </span>
                    {u.name}
                    {u.id === currentUser?.id ? <span className="pill pill-blue">you</span> : null}
                  </div>
                </td>
                <td>{u.email}</td>
                <td>
                  <span className={u.role === 'admin' ? 'pill pill-pink' : 'pill pill-muted'}>{t(`role.${u.role}`)}</span>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="btn btn-sm btn-blue" onClick={() => openForm(u)}>
                      <IconEdit width={14} height={14} />
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={() => { setPwdFor(u); setPwd(''); setPwd2(''); setPwdErr('') }}>
                      <IconKey width={14} height={14} />
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => {
                        if (!confirm(t('common.confirmDelete'))) return
                        const msg = deleteUser(u.id)
                        if (msg) alert(msg)
                      }}
                    >
                      <IconTrash width={14} height={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pwdFor && (
        <div className="modal-back" onClick={() => setPwdFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {t('users.setPassword')} — {pwdFor.name}
            </h3>
            {pwdErr && <div className="auth-error">{pwdErr}</div>}
            <div className="field">
              <label>{t('top.newPassword')}</label>
              <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
            </div>
            <div className="field">
              <label>{t('top.confirmPassword')}</label>
              <input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
            </div>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setPwdFor(null)}>
                {t('common.cancel')}
              </button>
              <button
                className="btn btn-primary"
                style={{ width: 'auto' }}
                onClick={async () => {
                  if (pwd !== pwd2) {
                    setPwdErr(t('top.mismatch'))
                    return
                  }
                  const msg = await setUserPassword(pwdFor.id, pwd)
                  if (msg) setPwdErr(msg)
                  else setPwdFor(null)
                }}
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
