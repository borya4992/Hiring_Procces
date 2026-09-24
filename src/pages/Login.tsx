import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { LANGS } from '../i18n'
import { IconLock, IconMail, IconMoon, IconSun } from '../icons'
import { useStore } from '../store'

export function Login() {
  const { currentUser, ready, login, t, lang, setLang, theme, setTheme } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!ready) return <div className="gate">{t('brand')}</div>
  if (currentUser) return <Navigate to="/" replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const ok = await login(email, password)
    setBusy(false)
    setErr(!ok)
  }

  return (
    <div className="login-shell">
      <div className="login-art">
        <div className="brand-mark">
          <div className="logo-badge">HP</div>
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
        <form className="login-card" onSubmit={onSubmit}>
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
          <h2>{t('auth.welcome')}</h2>
          <p className="muted">{t('auth.subtitle')}</p>
          {err && <div className="auth-error">{t('auth.error')}</div>}
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
          <button className="btn btn-primary" disabled={busy}>
            {t('auth.login')}
          </button>
        </form>
      </div>
    </div>
  )
}
