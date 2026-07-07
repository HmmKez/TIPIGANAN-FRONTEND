import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function getMenu(isAdmin) {
  const menu = [
    { section: 'MAIN', items: [
      { to: isAdmin ? '/admin' : '/dashboard', icon: 'fa-th-large', label: 'Dashboard', exact: true },
    ] },
    { section: 'REPOSITORY', items: [
     { to: '/browse', icon: 'fa-folder-open', label: 'Browse' },
      ...(isAdmin ? [
        { to: '/admin/collections', icon: 'fa-folder',    label: 'Collection Management' },
        { to: '/admin/upload',      icon: 'fa-upload',     label: 'Upload Item' },
        { to: '/admin/categories',  icon: 'fa-sitemap',    label: 'Category Management' },
      ] : []),
    ] },
  ]

  if (isAdmin) {
    menu.push({ section: 'ADMINISTRATION', items: [
      { to: '/admin/users',      icon: 'fa-users-cog',      label: 'User Management' },
      { to: '/admin/audit-logs', icon: 'fa-clipboard-list', label: 'Audit Logs' },
      { to: '/admin/reports',    icon: 'fa-chart-bar',      label: 'Reports & Analytics' },
    ] })
  }

  menu.push({ section: 'ACCOUNT', items: [
    ...(!isAdmin ? [{ to: '/bookmarks', icon: 'fa-bookmark', label: 'Favorites' }] : []),
    { to: '/profile', icon: 'fa-user-circle', label: 'My Profile' },
  ] })

  return menu
}

function initials(name) {
  if (!name) return 'U'
  return name.split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase()
}

export default function Layout({ children }) {
  const navigate = useNavigate()
  const { user, isAdmin, logout } = useAuth()

  const roleLabel = user?.role === 'super_admin' ? 'Super Administrator'
                   : user?.role === 'staff'       ? 'Staff'
                   : user?.role === 'teacher'      ? 'Teacher'
                   : 'Student'

  const menu = getMenu(isAdmin)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="https://sis.materdeicollege.com/img/MDC-Logo-clipped.png" alt="MDC" className="sidebar-mdc-logo" />
          <div className="brand-text">
            <div className="brand-name">TIPIGANAN</div>
            <div className="brand-sub">MDC Repository</div>
          </div>
        </div>

        {menu.map(group => (
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
                <div className="user-name">{user?.name || 'User'}</div>
                <div className="user-role">{roleLabel}</div>
              </div>
            </Link>
            <button className="topbar-icon" title="Logout" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </header>

        <main className="content">{children}</main>

        <footer className="footer">© 2026 Mater Dei College — TIPIGANAN</footer>
      </div>
    </div>
  )
}