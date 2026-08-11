import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usersApi } from '../api'
import { timeAgo } from '../utils/timeAgo'
import { avatarUrl } from '../utils/avatar'
import { boldQuoted } from '../utils/boldQuoted'
import ConfirmModal from './ConfirmModal'
import ActiveTermBadge from './ActiveTermBadge'
import { MDC_LOGO } from '../config/branding'

function getMenu(isAdmin, isGuest) {
  if (isGuest) {
    return [
      // No separate "Search" tab: Browse is the single entry point and already
      // carries the search box, quick tags, filters, and pagination.
      { section: 'REPOSITORY', items: [
        { to: '/browse', icon: 'fa-folder-open', label: 'Browse' },
      ] },
    ]
  }

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
      { to: '/admin/users',           icon: 'fa-users-cog',      label: 'User Management' },
      { to: '/admin/reported-items',  icon: 'fa-flag',           label: 'Reported Items' },
      { to: '/admin/audit-logs',      icon: 'fa-clipboard-list', label: 'Audit Logs' },
      { to: '/admin/reports',         icon: 'fa-chart-bar',      label: 'Reports & Analytics' },
    ] })
  }

  // Bookmarking is available to every signed-in role — the blueprint has
  // Admin/Staff explicitly inheriting all Student/Teacher privileges,
  // bookmarking included.
  //
  // Labelled "Bookmarks", not "Favorites". The feature is called a bookmark
  // everywhere else a user meets it — the button on a thesis says Bookmark,
  // the page is headed My Bookmarks, the dashboard tile says My Bookmarks —
  // so this nav item was the only place using a second name for one feature.
  menu.push({ section: 'ACCOUNT', items: [
    { to: '/bookmarks', icon: 'fa-bookmark', label: 'Bookmarks' },
    { to: '/profile', icon: 'fa-user-circle', label: 'My Profile' },
  ] })

  return menu
}

// Accepts whatever display_name resolves to, which for an account with no name
// yet is the 5-digit ID number — splitting that on spaces yields one token, so
// the avatar shows its first two digits rather than a lone letter.
function initials(label) {
  if (!label) return 'U'
  const parts = String(label).trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return parts.map(s => s[0]).slice(0, 2).join('').toUpperCase()
}

// 768px matches the .sidebar mobile breakpoint in styles.css — on phone-width
// screens the sidebar should start closed (it's a full-screen overlay
// there), on desktop it should start open (it pushes content over instead).
const MOBILE_BREAKPOINT = 768

export default function Layout({ children }) {
  const navigate = useNavigate()
  const { user, isAdmin, logout } = useAuth()
  const isGuest = !user
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === 'undefined' || window.innerWidth > MOBILE_BREAKPOINT
  )
  // On mobile the sidebar is a drawer over the page — picking a destination
  // should close it, same as any other mobile nav drawer. On desktop it
  // stays open (it doesn't cover anything).
  const closeSidebarOnMobile = () => {
    if (window.innerWidth <= MOBILE_BREAKPOINT) setSidebarOpen(false)
  }
  const [notifOpen, setNotifOpen] = useState(false)
  const [activity, setActivity] = useState(null) // null = not fetched yet
  const [activityLoading, setActivityLoading] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const roleLabel = user?.role === 'super_admin' ? 'Super Administrator'
                   : user?.role === 'staff'       ? 'Staff'
                   : user?.role === 'teacher'      ? 'Teacher'
                   : 'Student'

  const menu = getMenu(isAdmin, isGuest)

  const handleLogout = async () => {
    setLogoutConfirmOpen(false)
    await logout()
    navigate('/login')
  }

  // Loads real recent activity (own bookmarks + reading history, same data
  // as the Profile page's Activity tab) the first time the bell is opened,
  // rather than fetching it on every page load.
  const toggleNotif = () => {
    const opening = !notifOpen
    setNotifOpen(opening)
    if (opening && activity === null) {
      setActivityLoading(true)
      usersApi.profile()
        .then(res => {
          const { favorites = [], history = [] } = res.data
          const items = [
            ...favorites.slice(0, 3).map(f => ({
              icon: 'fa-bookmark', color: 'green',
              title: `Bookmarked "${f.thesis?.title}"`, time: f.created_at,
            })),
            ...history.slice(0, 3).map(h => ({
              icon: 'fa-eye', color: '',
              title: `Viewed "${h.thesis?.title}"`, time: h.viewed_at,
            })),
          ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5)
          setActivity(items)
        })
        .catch(() => setActivity([]))
        .finally(() => setActivityLoading(false))
    }
  }

  return (
    <div className="app-container">
      {/* Closes the drawer on mobile when tapping outside it — not rendered
          (and irrelevant) on desktop, where the sidebar pushes content
          instead of covering it. */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)}></div>
      )}

      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        {/* The brand is a link home, the way it is on essentially every site.
            Signed in, there was previously NO route back to the landing page at
            all — you had to edit the URL by hand, which also made the Super
            Admin's landing-page editor unreachable from inside the app. */}
        <Link to="/" className="sidebar-brand" onClick={closeSidebarOnMobile} title="Go to the landing page">
          <img src={MDC_LOGO} alt="MDC" className="sidebar-mdc-logo" />
          <div className="brand-text">
            <div className="brand-name">TIPIGANAN</div>
            <div className="brand-sub">MDC Repository</div>
          </div>
        </Link>

        {menu.map(group => (
          <div key={group.section}>
            <div className="sidebar-section">{group.section}</div>
            <ul className="sidebar-menu">
              {group.items.map(item => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.exact} onClick={closeSidebarOnMobile}
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

      <div className={`main-wrap${sidebarOpen ? ' sidebar-open' : ''}`}>
        <header className="topbar">
          <div className="topbar-left">
            <i className="fas fa-bars menu-toggle" title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
               onClick={() => setSidebarOpen(v => !v)}></i>
            <ActiveTermBadge />
          </div>
          <div className="topbar-right">
            {/* Shown to guests as well as signed-in users — inside the app shell
                neither had any way back to the landing page. */}
            <Link to="/" className="topbar-home" title="Back to the landing page">
              <i className="fas fa-arrow-left"></i>
              <span>Home</span>
            </Link>

            {isGuest ? (
              <>
                <Link to="/login" className="btn btn-secondary btn-sm">
                  <i className="fas fa-sign-in-alt"></i> Sign In
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  <i className="fas fa-user-plus"></i> Register
                </Link>
              </>
            ) : (
              <>
                <div style={{ position: 'relative' }}>
                  <button className="topbar-icon" title="Recent Activity" onClick={toggleNotif}>
                    <i className="fas fa-history"></i>
                  </button>
                  {notifOpen && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 60 }} onClick={() => setNotifOpen(false)}></div>
                      <div style={{
                        position: 'absolute', right: 0, top: 44, width: 300, background: 'var(--bg-white)',
                        border: '1px solid var(--border-light)', borderRadius: 10,
                        boxShadow: 'var(--shadow-md, 0 8px 24px rgba(0,0,0,.12))', zIndex: 61, padding: '10px 0',
                      }}>
                        <div style={{ padding: '4px 16px 10px', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Recent Activity</span>
                          <Link to="/profile" style={{ fontSize: 11, color: 'var(--primary-blue)', fontWeight: 500 }} onClick={() => setNotifOpen(false)}>
                            View all
                          </Link>
                        </div>
                        {activityLoading ? (
                          <div style={{ padding: '18px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
                            <i className="fas fa-spinner fa-spin"></i>
                          </div>
                        ) : !activity || activity.length === 0 ? (
                          <div style={{ padding: '18px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
                            <i className="fas fa-inbox" style={{ display: 'block', fontSize: 20, marginBottom: 8 }}></i>
                            No recent activity yet
                          </div>
                        ) : (
                          <ul style={{ listStyle: 'none', margin: 0, padding: '4px 0', maxHeight: 280, overflowY: 'auto' }}>
                            {activity.map((a, i) => (
                              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 16px' }}>
                                <div className={`activity-icon ${a.color}`} style={{ flexShrink: 0 }}>
                                  <i className={`fas ${a.icon}`}></i>
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                    {boldQuoted(a.title)}
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{timeAgo(a.time)}</div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <Link to="/profile" className="user-chip">
                  {avatarUrl(user) ? (
                    <img src={avatarUrl(user)} alt="" className="user-avatar user-avatar-img" />
                  ) : (
                    <div className="user-avatar">{initials(user?.display_name || user?.name)}</div>
                  )}
                  <div>
                    <div className="user-name">{user?.display_name || user?.name || 'User'}</div>
                    <div className="user-role">{roleLabel}</div>
                  </div>
                </Link>
                <button className="topbar-icon" title="Logout" onClick={() => setLogoutConfirmOpen(true)}>
                  <i className="fas fa-sign-out-alt"></i>
                </button>
              </>
            )}
          </div>
        </header>

        <main className="content">{children}</main>

        <footer className="footer">© 2026 Mater Dei College — TIPIGANAN</footer>
      </div>

      <ConfirmModal
        open={logoutConfirmOpen}
        icon="fa-sign-out-alt"
        confirmStyle="primary"
        title="Log out?"
        message="You'll need to sign in again to access your account."
        confirmLabel="Log Out"
        onConfirm={handleLogout}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </div>
  )
}