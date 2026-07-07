// AdminLayout — sidebar + topbar wrapper for all admin pages.
// Matches the mockup's initLayout('admin', ...) output from js/common.js.
// If you already have a shared Layout component from the auth pages, USE THAT
// and just make sure the admin menu items below are present.

import { Link, NavLink, useNavigate } from 'react-router-dom'

const MENU = [
  { section: 'MAIN', items: [
    { to: '/admin', icon: 'fa-th-large', label: 'Dashboard', exact: true },
  ] },
  { section: 'REPOSITORY', items: [
    { to: '/admin/collections', icon: 'fa-folder-open', label: 'Collection Management' },
    { to: '/admin/upload',      icon: 'fa-upload',      label: 'Upload Item' },
    { to: '/admin/categories',  icon: 'fa-sitemap',     label: 'Category Management' },
  ] },
  { section: 'ADMINISTRATION', items: [
    { to: '/admin/users',      icon: 'fa-users-cog',      label: 'User Management' },
    { to: '/admin/audit-logs', icon: 'fa-clipboard-list', label: 'Audit Logs' },
    { to: '/admin/reports',    icon: 'fa-chart-bar',      label: 'Reports & Analytics' },
  ] },
  { section: 'ACCOUNT', items: [
    { to: '/profile', icon: 'fa-user-circle', label: 'My Profile' },
  ] },
]

function initials(name) {
  if (!name) return 'AU'
  return name.split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase()
}

export default function AdminLayout({ children }) {
  const navigate = useNavigate()
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('tipiganan_user') || 'null') } catch { return null }
  })()
  const roleLabel = user?.role === 'super_admin' ? 'Super Administrator'
                  : user?.role === 'staff' ? 'Staff'
                  : 'Administrator'

  const logout = () => {
    localStorage.removeItem('tipiganan_token')
    localStorage.removeItem('tipiganan_user')
    navigate('/login')
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="https://sis.materdeicollege.com/img/MDC-Logo-clipped.png" alt="MDC" className="sidebar-mdc-logo" />
          <div className="brand-text">
            <div className="brand-name">TIPIGANAN</div>
            <div className="brand-sub">MDC Repository</div>
          </div>
        </div>
        {MENU.map(group => (
          <div key={group.section}>
            <div className="sidebar-section">{group.section}</div>
            <ul className="sidebar-menu">
              {group.items.map(item => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.exact}
                           className={({ isActive }) => isActive ? 'active' : ''}>
                    <i className={`fas ${item.icon}`}></i>{item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="sidebar-footer">© 2026 Mater Dei College<br />TIPIGANAN v1.0.0</div>
      </aside>

      {/* Main */}
      <div className="main-wrap">
        <header className="topbar">
          <div className="topbar-left">
            <i className="fas fa-bars" style={{ cursor: 'pointer', color: 'var(--text-muted)' }}></i>
            <span><b style={{ color: 'var(--text-primary)' }}>Active Term:</b></span>
            <span className="term-badge">1st Semester AY 2026-2027</span>
          </div>
          <div className="topbar-right">
            <button className="topbar-icon" title="Notifications">
              <i className="fas fa-bell"></i>
              <span className="notif-dot"></span>
            </button>
            <Link to="/profile" className="user-chip">
              <div className="user-avatar">{initials(user?.name)}</div>
              <div>
                <div className="user-name">{user?.name || 'Admin User'}</div>
                <div className="user-role">{roleLabel}</div>
              </div>
            </Link>
            <button className="topbar-icon" title="Logout" onClick={logout}>
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </header>

        {children}

        <footer className="footer">© 2026 Mater Dei College — TIPIGANAN</footer>
      </div>
    </div>
  )
}
