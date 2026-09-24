import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { isInternshipDue, isOrderDeadlineSoon, isProbationDue, todayIso, useStore } from '../store'

export function Layout() {
  const { currentUser, ready, toasts, t, candidates, orders, toast } = useStore()

  useEffect(() => {
    if (!ready || !currentUser) return
    const due = candidates.filter((c) => isProbationDue(c))
    const soon = orders.filter((o) => isOrderDeadlineSoon(o))
    const intern = candidates.filter((c) => isInternshipDue(c))
    if (!due.length && !soon.length && !intern.length) return
    const key = `hp.dueToast.${currentUser.id}.${todayIso()}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    const parts: string[] = []
    if (soon.length) {
      parts.push(`${t('orders.deadlineBanner')}: ${soon.map((o) => o.position).join(', ')}`)
    }
    if (intern.length) {
      parts.push(`${t('candidates.internshipDueBanner')}: ${intern.map((c) => c.fullName).join(', ')}`)
    }
    if (due.length) {
      parts.push(`${t('probation.dueBanner')}: ${due.map((c) => c.fullName).join(', ')}`)
    }
    toast(parts.join(' · '))
  }, [ready, currentUser, candidates, orders, t, toast])

  if (!ready) return <div className="gate">{t('brand')}</div>
  if (!currentUser) return <Navigate to="/login" replace />
  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <Topbar />
        <div className="content">
          <Outlet />
        </div>
      </div>
      <div className="toasts">
        {toasts.map((x) => (
          <div key={x.id} className={`toast ${x.kind}`}>
            {x.message}
          </div>
        ))}
      </div>
    </div>
  )
}
