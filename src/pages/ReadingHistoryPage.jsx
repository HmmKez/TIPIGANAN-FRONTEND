import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { Loader, EmptyState, ErrorMessage } from '../components/Loader'
import { usersApi } from '../api'

// TODO(backend): /profile's `history` field is hardcoded to the 10 most
// recent items with no pagination, search, filter, or delete route behind
// it (see HistoryController_DRAFT.php). Once a real /history endpoint
// exists, swap the fetch below and re-enable search/filter/delete —
// everything is left in place but disabled/hidden rather than removed, so
// the upgrade is a small patch, not a rewrite.
const HISTORY_LIMIT = 10

export default function ReadingHistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = () => {
    setLoading(true); setError(null)
    usersApi.profile()
      .then(res => setHistory(res.data?.history || []))
      .catch(err => setError(err))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const stats = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)
    const thisWeek = history.filter(h => new Date(h.viewed_at) >= weekAgo).length
    return { total: history.length, thisWeek }
  }, [history])

  if (loading) return <Loader />
  if (error) return <ErrorMessage error={error} onRetry={load} />

  return (
    <>
      <PageHeader
        breadcrumb={<><Link to="/dashboard">Dashboard</Link> <span>›</span> Reading History</>}
        title="Reading History"
        subtitle="Items you have recently opened."
      />

      <div className="notice-banner" style={{ marginBottom: 20 }}>
        <i className="fas fa-info-circle"></i>
        <span>
          Showing your {HISTORY_LIMIT} most recent items. Search, filtering, and full history
          aren't available yet — this page will expand once a dedicated history endpoint is added.
        </span>
      </div>

      <div className="stats-grid-mini" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="stat-mini" style={{ background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary-blue)' }}>{stats.total}{stats.total === HISTORY_LIMIT ? '+' : ''}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Recent Items</div>
        </div>
        <div className="stat-mini" style={{ background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary-blue)' }}>{stats.thisWeek}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Viewed This Week</div>
        </div>
        {/* "Hours Spent Reading" and "Completed Items" from the mockup
            dropped entirely — no time-tracking or progress columns exist
            anywhere in the schema to compute them from. */}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Recently Viewed</div>
        </div>

        {history.length === 0 ? (
          <div className="panel-body">
            <EmptyState
              icon="fa-history"
              title="No reading history yet"
              message="Start exploring collections and your reading history will appear here."
            />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Department</th>
                  <th>Year</th>
                  <th>Last Viewed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => {
                  const t = h.thesis || {}
                  return (
                    <tr key={h.id}>
                      <td>
                        <b>{t.title}</b><br />
                        <small className="text-muted">{t.authors}</small>
                      </td>
                      <td><span className="badge badge-info">{t.category?.name || '—'}</span></td>
                      <td>{t.year_published || '—'}</td>
                      <td><small>{new Date(h.viewed_at).toLocaleString()}</small></td>
                      <td>
                        <Link to={`/theses/${t.id}`} className="btn btn-sm btn-primary">
                          <i className="fas fa-book-open"></i> Open
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}