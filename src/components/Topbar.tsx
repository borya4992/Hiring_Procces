import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LANGS } from '../i18n'
import { IconBell, IconCamera, IconLock, IconLogout, IconMoon, IconSun, IconX } from '../icons'
import {
  daysUntilDeadline,
  formatDate,
  internshipReviewDate,
  isInternshipDue,
  isOrderDeadlineSoon,
  isProbationDue,
  probationReviewDate,
  resizeImage,
  useStore,
} from '../store'

export function Topbar() {
  const {
    currentUser,
    t,
    lang,
    setLang,
    theme,
    setTheme,
    logout,
    updateAvatar,
    changeOwnPassword,
    candidates,
    orders,
  } = useStore()
  const [open, setOpen] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const notesRef = useRef<HTMLDivElement>(null)
  const due = candidates.filter((c) => isProbationDue(c))
  const internshipDue = candidates
    .filter((c) => isInternshipDue(c))
    .slice()
    .sort((a, b) => (internshipReviewDate(a) || '').localeCompare(internshipReviewDate(b) || ''))
  const soonOrders = orders
    .filter((o) => isOrderDeadlineSoon(o))
    .slice()
    .sort((a, b) => a.deadline.localeCompare(b.deadline) || a.position.localeCompare(b.position))
  const noteCount = due.length + soonOrders.length + internshipDue.length

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
      if (notesRef.current && !notesRef.current.contains(e.target as Node)) setNotesOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  if (!currentUser) return null
  const initials = currentUser.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="topbar">
      <div className="drop" ref={notesRef}>
        <button className="bell-btn" onClick={() => setNotesOpen((v) => !v)} title={t('common.notifications')}>
          <IconBell />
          {noteCount > 0 && <span className="nav-badge">{noteCount}</span>}
        </button>
        {notesOpen && (
          <div className="menu notes-menu">
            <div className="notes-head">{t('common.notifications')}</div>
            {noteCount === 0 && <div className="notes-empty">{t('common.empty')}</div>}
            {soonOrders.map((o) => {
              const left = daysUntilDeadline(o.deadline)
              return (
                <Link key={o.id} to="/orders" className="note-item" onClick={() => setNotesOpen(false)}>
                  <b>{o.position}</b>
                  <span>
                    {t('orders.deadline')}: {formatDate(o.deadline)}
                    {left < 0
                      ? ` · ${t('common.overdueDays')}: ${Math.abs(left)}`
                      : ` · ${left} ${t('common.deadlineLeft')}`}
                  </span>
                  <span>{t('common.deadlineSoonNotice')}</span>
                </Link>
              )
            })}
            {internshipDue.map((c) => {
              const dueDate = internshipReviewDate(c)
              const left = dueDate ? daysUntilDeadline(dueDate) : 0
              return (
                <Link key={c.id} to="/candidates" className="note-item" onClick={() => setNotesOpen(false)}>
                  <b>{c.fullName}</b>
                  <span>
                    {t('candidates.internshipDeadline')}: {dueDate ? formatDate(dueDate) : '—'}
                    {left < 0
                      ? ` · ${t('common.overdueDays')}: ${Math.abs(left)}`
                      : ` · ${left} ${t('common.deadlineLeft')}`}
                  </span>
                  <span>{t('candidates.internshipDue')}</span>
                </Link>
              )
            })}
            {due.map((c) => (
              <Link key={c.id} to="/probation" className="note-item" onClick={() => setNotesOpen(false)}>
                <b>{c.fullName}</b>
                <span>
                  {t('probation.reviewDate')}: {formatDate(probationReviewDate(c.hiredDate || c.date))}
                </span>
                <span>{t('probation.dueNotice')}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="seg" title={t('top.language')}>
        {LANGS.map((l) => (
          <button key={l.id} className={lang === l.id ? 'on' : ''} onClick={() => setLang(l.id)}>
            {l.label}
          </button>
        ))}
      </div>
      <div className="seg" title={t('top.theme')}>
        <button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')}>
          <IconSun width={15} height={15} /> {t('top.light')}
        </button>
        <button className={theme === 'midnight' ? 'on' : ''} onClick={() => setTheme('midnight')}>
          <IconMoon width={15} height={15} /> {t('top.midnight')}
        </button>
      </div>
      <div className="drop" ref={wrap}>
        <button className="profile-btn" onClick={() => setOpen((v) => !v)}>
          <span className="avatar">
            {currentUser.avatar ? <img src={currentUser.avatar} alt="" /> : initials}
          </span>
          <span className="profile-meta">
            <b>{currentUser.name}</b>
            <span>{t(`role.${currentUser.role}`)}</span>
          </span>
        </button>
        {open && (
          <div className="menu">
            <button
              onClick={() => {
                setOpen(false)
                setAvatarOpen(true)
              }}
            >
              <IconCamera /> {t('top.uploadAvatar')}
            </button>
            <button
              onClick={() => {
                setOpen(false)
                setPwdOpen(true)
              }}
            >
              <IconLock /> {t('top.changePassword')}
            </button>
            <button onClick={logout}>
              <IconLogout /> {t('top.logout')}
            </button>
          </div>
        )}
      </div>

      {avatarOpen && (
        <AvatarModal
          initials={initials}
          src={currentUser.avatar}
          onClose={() => setAvatarOpen(false)}
          onFile={async (file) => {
            const data = await resizeImage(file)
            updateAvatar(data)
            setAvatarOpen(false)
          }}
        />
      )}
      {pwdOpen && (
        <PasswordModal
          onClose={() => setPwdOpen(false)}
          onSave={async (cur, next, confirm) => {
            if (next !== confirm) return t('top.mismatch')
            return changeOwnPassword(cur, next)
          }}
        />
      )}
    </header>
  )
}

function AvatarModal({
  initials,
  src,
  onClose,
  onFile,
}: {
  initials: string
  src: string | null
  onClose: () => void
  onFile: (file: File) => void
}) {
  const { t } = useStore()
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t('top.uploadAvatar')}</h3>
        <div className="avatar-lg">{src ? <img src={src} alt="" /> : initials}</div>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFile(f)
          }}
        />
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            <IconX width={16} height={16} /> {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

function PasswordModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (cur: string, next: string, confirm: string) => Promise<string | null>
}) {
  const { t } = useStore()
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState('')
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t('top.changePassword')}</h3>
        {err && <div className="auth-error">{err}</div>}
        <div className="field">
          <label>{t('top.currentPassword')}</label>
          <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} />
        </div>
        <div className="field">
          <label>{t('top.newPassword')}</label>
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div className="field">
          <label>{t('top.confirmPassword')}</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            className="btn btn-primary"
            style={{ width: 'auto' }}
            onClick={async () => {
              const msg = await onSave(cur, next, confirm)
              if (msg) setErr(msg)
              else onClose()
            }}
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
