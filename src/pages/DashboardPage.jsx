import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { Loader, ErrorMessage } from '../components/Loader'
import { thesesApi } from '../api/theses'
import { favoritesApi, categoriesApi, usersApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { timeAgo } from '../utils/timeAgo'
import { boldQuoted } from '../utils/boldQuoted'

const DEPT_ICONS = {
  'CAST': 'fa-flask', 'CCJ': 'fa-balance-scale', 'COE': 'fa-microchip',
  'CON': 'fa-heartbeat', 'CABM-B': 'fa-chart-line', 'CABM-H': 'fa-hotel',
  'GS': 'fa-graduation-cap', 'SPC': 'fa-star',
}

// "New" window for the dashboard tile. Kept next to the tile's label so the
// number and the words can't drift apart.
const NEW_WINDOW_DAYS = 30

const GRADIENTS = [
  'linear-gradient(135deg,#345FCF,#5A79E5)',
  'linear-gradient(135deg,#7E57C2,#B388FF)',
  'linear-gradient(135deg,#2BB673,#6BD9A4)',
  'linear-gradient(135deg,#F5A623,#FFC766)',
  'linear-gradient(135deg,#3498DB,#5DADE2)',
]

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [readingHistory, setReadingHistory] = useState([])
  const [recentSearches, setRecentSearches] = useState([])
  const [favorites, setFavorites] = useState([])
  const [categories, setCategories] = useState([])
  const [totalItems, setTotalItems] = useState(null)
  const [newCount, setNewCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true); setError(null)
    Promise.allSettled([
      thesesApi.list({ per_page: 1 }),
      favoritesApi.list(),
      categoriesApi.list(),
      usersApi.profile(),
      thesesApi.list({ per_page: 1, added_within_days: NEW_WINDOW_DAYS }),
    ]).then(([tRes, fRes, cRes, pRes, nRes]) => {
      if (!mounted) return
      if (tRes.status === 'fulfilled') {
        // Laravel's paginate() response includes a top-level `total` — that's
        // the real "Total Items" count; per_page:1 since we only need it.
        const payload = tRes.value.data
        if (typeof payload?.total === 'number') setTotalItems(payload.total)
      }
      if (nRes.status === 'fulfilled') {
        // Same trick, filtered to the recent window — the count therefore obeys
        // the exact visibility rules the browse list uses.
        const payload = nRes.value.data
        if (typeof payload?.total === 'number') setNewCount(payload.total)
      }
      if (fRes.status === 'fulfilled') {
        setFavorites(fRes.value.data?.data || fRes.value.data || [])
      }
      if (cRes.status === 'fulfilled') {
        setCategories(cRes.value.data?.data || cRes.value.data || [])
      }
      if (pRes.status === 'fulfilled') {
        // This user's own reading_history rows (most recent first), each
        // time they opened a thesis — unique per account, empty for a
        // brand-new one. Not shared/global like the old "recent uploads"
        // fallback this section used to show.
        setReadingHistory(pRes.value.data?.history || [])
        setRecentSearches(pRes.value.data?.recent_searches || [])
      }
      if (tRes.status === 'rejected' && fRes.status === 'rejected') {
        setError(tRes.reason)
      }
    }).finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  // A thesis viewed multiple times shows up once, at its most recent view —
  // "Continue Reading" means "things you've started," not a raw click log.
  const continueReading = []
  const seenThesisIds = new Set()
  for (const h of readingHistory) {
    const t = h.thesis
    if (!t || seenThesisIds.has(t.id)) continue
    seenThesisIds.add(t.id)
    continueReading.push({ ...t, viewed_at: h.viewed_at })
    if (continueReading.length === 3) break
  }

  const firstName = user?.name?.split(' ')[0] || 'there'

  // Count only what this reader can actually open. `theses_count` includes
  // archived theses, which are hidden from everyone — using it here made the
  // tiles disagree with Browse (and with the "Total Items" tile beside them).
  // A logged-in user sees active + restricted, matching ThesisController::index.
  const visibleIn = (c) => (c.active_theses_count ?? 0) + (c.restricted_theses_count ?? 0)

  // Departments worth opening. Counting every category advertised 11 when 6 of
  // them are empty, so a third of the "departments" led to a blank page.
  const departmentsWithContent = categories.filter(c => visibleIn(c) > 0).length

  // Real activity feed: this user's own bookmarks, views, and searches,
  // merged and sorted by actual timestamp — no placeholders. Empty for a
  // brand-new account until they do something.
  const activityItems = [
    ...favorites.map(f => {
      const t = f.thesis || f
      return { type: 'bookmark', title: `Bookmarked "${t.title}"`, at: f.created_at }
    }),
    ...readingHistory.map(h => ({
      type: 'view',
      title: `Viewed "${h.thesis?.title || 'a thesis'}"`,
      at: h.viewed_at,
    })),
    ...recentSearches.map(s => ({
      type: 'search',
      title: `Searched "${s.query}"`,
      at: s.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 4)

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

      {/* Four tiles, each answering a question a reader actually has: what can
          I read, where do I look, what's new, what's mine. The old "GS" and
          "College" tiles were an org-chart split — and were counting archived
          theses nobody can open, so they summed to 23 while "Total Items" next
          to them said 19. */}
      <div className="simple-stat-grid">
        <div className="simple-stat"><div className="v">{totalItems ?? '—'}</div><div className="l">Available to Read</div></div>
        <div className="simple-stat"><div className="v">{departmentsWithContent || '—'}</div><div className="l">Departments</div></div>
        <div className="simple-stat"><div className="v">{newCount ?? '—'}</div><div className="l">New in {NEW_WINDOW_DAYS} Days</div></div>
        <div className="simple-stat"><div className="v">{favorites.length}</div><div className="l">My Bookmarks</div></div>
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
            {loading ? <Loader /> : continueReading.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <i className="fas fa-book" style={{ fontSize: 32, marginBottom: 8, display: 'block' }}></i>
                You haven't opened anything yet. <Link to="/browse" style={{ color: 'var(--primary-blue)' }}>Browse collections</Link>
              </div>
            ) : continueReading.map((t, i) => (
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
                  <div className="cr-progress-label"><i className="fas fa-clock"></i> Last opened {new Date(t.viewed_at).toLocaleDateString()}</div>
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
                      <div className="activity-title">{boldQuoted(a.title)}</div>
                      <div className="activity-time">{timeAgo(a.at)}</div>
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
                {c.name} ({visibleIn(c)})
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}