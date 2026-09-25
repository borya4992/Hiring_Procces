import { NavLink } from 'react-router-dom'
import { useStore, isInternshipDue, isOrderDeadlineSoon, isProbationDue } from '../store'
import { IconChart, IconClipboard, IconGrid, IconShield, IconTimer, IconUsers } from '../icons'

const items = [
  { to: '/', key: 'nav.dashboard', icon: IconGrid, end: true },
  { to: '/orders', key: 'nav.orders', icon: IconClipboard },
  { to: '/candidates', key: 'nav.candidates', icon: IconUsers },
  { to: '/probation', key: 'nav.probation', icon: IconTimer },
  { to: '/reports', key: 'nav.reports', icon: IconChart },
  { to: '/users', key: 'nav.users', icon: IconShield, admin: true },
] as const

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { t, isAdmin, candidates, orders } = useStore()
  const dueCount = candidates.filter((c) => isProbationDue(c)).length
  const internCount = candidates.filter((c) => isInternshipDue(c)).length
  const soonCount = orders.filter((o) => isOrderDeadlineSoon(o)).length
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="logo-badge">
          <img src="/icons/icon-192.png" alt="" />
        </div>
        <div>
          <div className="brand-name">{t('brand')}</div>
          <div className="brand-sub">{t('tagline')}</div>
        </div>
      </div>
      <nav className="nav">
        {items
          .filter((item) => !('admin' in item && item.admin) || isAdmin)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={() => onClose?.()}
            >
              <item.icon />
              <span className="nav-label">{t(item.key)}</span>
              {item.to === '/orders' && soonCount > 0 && <span className="nav-badge">{soonCount}</span>}
              {item.to === '/candidates' && internCount > 0 && <span className="nav-badge">{internCount}</span>}
              {item.to === '/probation' && dueCount > 0 && <span className="nav-badge">{dueCount}</span>}
            </NavLink>
          ))}
      </nav>
      <div className="sidebar-foot">{t('brand')} · 2026</div>
    </aside>
  )
}
