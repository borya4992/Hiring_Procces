import { useState, type FormEvent, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { LANGS } from '../i18n'
import { IconLock, IconMail, IconMoon, IconSun, IconUsers } from '../icons'
import { ADMIN_EMAIL, ADMIN_NAME, useStore } from '../store'

function AuthChrome({ children }: { children: ReactNode }) {
  const { t, lang, setLang, theme, setTheme } = useStore()
  return (
    <div className="login-shell">
      <div className="login-art">
        <div className="brand-mark">
          <div className="logo-badge">
            <img src="/icons/icon-192.png" alt="" />
          </div>
          <div>
            <div className="brand-name">{t('brand')}</div>
            <div className="brand-sub">{t('tagline')}</div>
          </div>
        </div>
        <div className="login-quote">
          <h1>{t('tagline')}</h1>
          <p>{t('auth.subtitle')}</p>
        </div>
        <div className="brand-sub">© 2026 {t('brand')}</div>
      </div>
      <div className="login-form-wrap">
        <div className="login-card">
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
            <div className="seg">
              {LANGS.map((l) => (
                <button type="button" key={l.id} className={lang === l.id ? 'on' : ''} onClick={() => setLang(l.id)}>
                  {l.label}
                </button>
              ))}
            </div>
            <div className="seg">
              <button type="button" className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')}>
                <IconSun width={14} height={14} />
              </button>
              <button type="button" className={theme === 'midnight' ? 'on' : ''} onClick={() => setTheme('midnight')}>
                <IconMoon width={14} height={14} />
              </button>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

export function Login() {
  const { currentUser, ready, needsSetup, supabaseConfigured, login, setupAdmin, t } = useStore()
  const [email, setEmail] = useState(ADMIN_EMAIL)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (!ready) return <div className="gate">{t('brand')}</div>
  if (currentUser) return <Navigate to="/" replace />

  const onLogin = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const ok = await login(email, password)
    setBusy(false)
    setErr(ok ? '' : t('auth.error'))
  }

  const onSetup = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setErr(t('top.mismatch'))
      return
    }
    setBusy(true)
    const fail = await setupAdmin(password)
    setBusy(false)
    setErr(fail || '')
  }

  if (needsSetup) {
    return (
      <AuthChrome>
        <form onSubmit={onSetup}>
          <h2>{t('auth.setupTitle')}</h2>
          <p className="muted">{t('auth.setupSubtitle')}</p>
          {!supabaseConfigured && <div className="auth-error">{t('auth.cloudMissing')}</div>}
          {err && <div className="auth-error">{err}</div>}
          <div className="field">
            <label>{t('auth.name')}</label>
            <div className="search" style={{ minWidth: 0 }}>
              <IconUsers />
              <input value={ADMIN_NAME} readOnly />
            </div>
          </div>
          <div className="field">
            <label>{t('auth.email')}</label>
            <div className="search" style={{ minWidth: 0 }}>
              <IconMail />
              <input type="email" value={ADMIN_EMAIL} readOnly />
            </div>
          </div>
          <div className="field">
            <label>{t('auth.password')}</label>
            <div className="search" style={{ minWidth: 0 }}>
              <IconLock />
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>
          <div className="field">
            <label>{t('top.confirmPassword')}</label>
            <div className="search" style={{ minWidth: 0 }}>
              <IconLock />
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>
          <button className="btn btn-primary" disabled={busy || !supabaseConfigured}>
            {t('auth.setupAction')}
          </button>
        </form>
      </AuthChrome>
    )
  }

  return (
    <AuthChrome>
      <form onSubmit={onLogin}>
        <h2>{t('auth.welcome')}</h2>
        <p className="muted">{t('auth.subtitle')}</p>
        {!supabaseConfigured && <div className="auth-error">{t('auth.cloudMissing')}</div>}
        {err && <div className="auth-error">{err}</div>}
        <div className="field">
          <label>{t('auth.email')}</label>
          <div className="search" style={{ minWidth: 0 }}>
            <IconMail />
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="field">
          <label>{t('auth.password')}</label>
          <div className="search" style={{ minWidth: 0 }}>
            <IconLock />
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>
        <button className="btn btn-primary" disabled={busy || !supabaseConfigured}>
          {t('auth.login')}
        </button>
      </form>
    </AuthChrome>
  )
}
