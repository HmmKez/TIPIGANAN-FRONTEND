import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { Loader, ErrorMessage } from '../components/Loader'
import { thesesApi } from '../api/theses'
import { favoritesApi, categoriesApi } from '../api'
import { useAuth } from '../contexts/AuthContext'

const DEPT_ICONS = {
  'CAST': 'fa-flask', 'CCJ': 'fa-balance-scale', 'COE': 'fa-microchip',
  'CON': 'fa-heartbeat', 'CABM-B': 'fa-chart-line', 'CABM-H': 'fa-hotel',
  'GS': 'fa-graduation-cap', 'SPC': 'fa-star',
}

const GRADIENTS = [
  'linear-gradient(135deg,#345FCF,#5A79E5)',
  'linear-gradient(135deg,#7E57C2,#B388FF)',
  'linear-gradient(135deg,#2BB673,#6BD9A4)',
  'linear-gradient(135deg,#F5A623,#FFC766)',
  'linear-gradient(135deg,#3498DB,#5DADE2)',
]

// TODO(backend): there is no reading_history read endpoint in routes/api.php
// (the table exists in the schema, but nothing exposes it). "Recently Read"
// count and the per-card "% read" progress are both hardcoded placeholders
// until that endpoint exists.
const RECENTLY_READ_PLACEHOLDER = 37
const READ_PROGRESS_PLACEHOLDER = [68, 32, 15]

// TODO(backend): "Viewed" and "Searched" activity entries have no data
// source available to non-staff users (audit-logs is staff/super_admin
// only, and there's no per-user activity feed endpoint). These two static
// entries are placeholders; only the "Bookmarked" entries below are real.
const ACTIVITY_PLACEHOLDERS = [
  { type: 'view', title: 'Viewed "IoT-Based Smart Classroom"', time: 'Yesterday at 3:24 PM' },
  { type: 'search', title: 'Searched "renewable energy"', time: 'Yesterday at 1:10 PM' },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [theses, setTheses] = useState([])
  const [favorites, setFavorites] = useState([])
  const [categories, setCategories] = useState([])
  const [totalItems, setTotalItems] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true); setError(null)
    Promise.allSettled([
      thesesApi.list({ per_page: 3, sort: 'recent' }),
      favoritesApi.list(),
      categoriesApi.list(),
    ]).then(([tRes, fRes, cRes]) => {
      if (!mounted) return
      if (tRes.status === 'fulfilled') {
        const payload = tRes.value.data
        setTheses(payload?.data || [])
        // Laravel's paginate() response includes a top-level `total` — that's
        // the real "Total Items" count, not the 3 items returned per page.
        if (typeof payload?.total === 'number') setTotalItems(payload.total)
      }
      if (fRes.status === 'fulfilled') {
        setFavorites(fRes.value.data?.data || fRes.value.data || [])
      }
      if (cRes.status === 'fulfilled') {
        setCategories(cRes.value.data?.data || cRes.value.data || [])
      }
      if (tRes.status === 'rejected' && fRes.status === 'rejected') {
        setError(tRes.reason)
      }
    }).finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  const firstName = user?.name?.split(' ')[0] || 'there'

  // Real counts from GET /categories (theses_count), not hardcoded numbers.
  const gsCategory = categories.find(c => /graduate/i.test(c.name || ''))
  const gsCount = gsCategory?.theses_count ?? 0
  const collegeCount = categories.reduce(
    (sum, c) => sum + (c.id === gsCategory?.id ? 0 : (c.theses_count || 0)), 0
  )

  // Real activity: recent bookmarks. Padded with placeholder view/search
  // entries (see TODO above) to match the mockup's 4-item feed.
  const activityItems = [
    ...favorites.slice(0, 2).map(f => {
      const t = f.thesis || f
      return { type: 'bookmark', title: `Bookmarked "${t.title}"`, time: 'Recently' }
    }),
    ...ACTIVITY_PLACEHOLDERS,
  ].slice(0, 4)

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle="Explore academic collections across all MDC departments."
        actions={
          <Link to="/browse" className="btn btn-primary">
            <i className="fas fa-book-open"></i> Browse Collections
          </Link>
        }
      />

      {error && <ErrorMessage error={error} />}

      <div className="simple-stat-grid">
        <div className="simple-stat"><div className="v">{totalItems ?? '—'}</div><div className="l">Total Items</div></div>
        <div className="simple-stat"><div className="v">{gsCount}</div><div className="l">GS</div></div>
        <div className="simple-stat"><div className="v">{collegeCount}</div><div className="l">College</div></div>
        <div className="simple-stat"><div className="v">{categories.length || '—'}</div><div className="l">Departments</div></div>
        <div className="simple-stat"><div className="v">{favorites.length}</div><div className="l">My Bookmarks</div></div>
        <div className="simple-stat"><div className="v">{RECENTLY_READ_PLACEHOLDER}</div><div className="l">Recently Read</div></div>
      </div>

      <div className="panel-grid-2">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <i className="fas fa-history" style={{ color: 'var(--primary-blue)', marginRight: 6 }}></i>
              Continue Reading
            </div>
            <Link to="/history" className="btn btn-sm btn-secondary">View all</Link>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {loading ? <Loader /> : theses.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <i className="fas fa-book" style={{ fontSize: 32, marginBottom: 8, display: 'block' }}></i>
                No items to display yet. <Link to="/browse" style={{ color: 'var(--primary-blue)' }}>Browse collections</Link>
              </div>
            ) : theses.slice(0, 3).map((t, i) => (
              <div key={t.id} className="cr-card" onClick={() => navigate(`/theses/${t.id}`)}>
                <div className="cr-cover" style={{ background: GRADIENTS[i % GRADIENTS.length] }}>
                  <i className={`fas ${DEPT_ICONS[t.department] || 'fa-file-alt'}`}></i>
                </div>
                <div className="cr-body">
                  <div className="cr-title">{t.title}</div>
                  <div className="cr-authors"><i className="fas fa-users"></i> {t.authors || t.author || '—'}</div>
                  <div className="cr-meta">
                    {t.department && <span className="cr-dept">{t.department}</span>}
                    {t.department && <span className="cr-dot"></span>}
                    <span><i className="fas fa-calendar-alt"></i> {t.year_published || t.year || '—'}</span>
                    {t.adviser && (<>
                      <span className="cr-dot"></span>
                      <span><i className="fas fa-user-tie"></i> {t.adviser}</span>
                    </>)}
                  </div>
                  <div className="cr-abstract">{t.abstract || 'No abstract available.'}</div>
                </div>
                <div className="cr-progress">
                  <div className="cr-progress-label"><i className="fas fa-book-reader"></i> {READ_PROGRESS_PLACEHOLDER[i % READ_PROGRESS_PLACEHOLDER.length]}% read</div>
                  <div className="cr-progress-bar"><div style={{ width: `${READ_PROGRESS_PLACEHOLDER[i % READ_PROGRESS_PLACEHOLDER.length]}%` }}></div></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <i className="fas fa-bell" style={{ color: 'var(--primary-blue)', marginRight: 6 }}></i>
              Recent Activity
            </div>
          </div>
          <div className="panel-body" style={{ padding: '14px 22px' }}>
            <ul className="activity-list">
              {activityItems.length === 0 ? (
                <li className="activity-item">
                  <div className="activity-icon"><i className="fas fa-info-circle"></i></div>
                  <div className="activity-content">
                    <div className="activity-title">No recent activity yet.</div>
                    <div className="activity-time">Start exploring the repository</div>
                  </div>
                </li>
              ) : activityItems.map((a, i) => {
                const iconClass = a.type === 'bookmark' ? 'green' : a.type === 'search' ? 'orange' : ''
                const icon = a.type === 'bookmark' ? 'fa-bookmark' : a.type === 'search' ? 'fa-search' : 'fa-eye'
                return (
                  <li key={i} className="activity-item">
                    <div className={`activity-icon ${iconClass}`}><i className={`fas ${icon}`}></i></div>
                    <div className="activity-content">
                      <div className="activity-title" dangerouslySetInnerHTML={{ __html: a.title.replace(/"([^"]+)"/, '"<b>$1</b>"') }} />
                      <div className="activity-time">{a.time}</div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <i className="fas fa-sitemap" style={{ color: 'var(--primary-blue)', marginRight: 6 }}></i>
            Browse by Department
          </div>
        </div>
        <div className="panel-body">
          {categories.length === 0 && !loading && (
            <div className="text-muted" style={{ padding: 20 }}>No departments yet.</div>
          )}
          <div className="page-nav-grid">
            {categories.map(c => (
              <Link key={c.id} to={`/browse?category_id=${c.id}`}>
                <i className={`fas ${DEPT_ICONS[c.name] || 'fa-folder'}`}></i>
                {c.name} ({c.theses_count ?? 0})
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}