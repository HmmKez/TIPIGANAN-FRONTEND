import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { reportsApi } from '../api/admin'
import { categoryCode, categoryName } from '../utils/category'

export default function AdminDashboardPage() {
  const [data, setData] = useState(null)
  const [byDept, setByDept] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([reportsApi.dashboard(), reportsApi.byDepartment()])
      .then(([d, bd]) => { setData(d.data); setByDept(bd.data || []) })
      .catch(err => setError(err?.response?.data?.message || err.message))
      .finally(() => setLoading(false))
  }, [])

  const maxDept = Math.max(1, ...byDept.map(x => Number(x.total) || 0))

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Admin Dashboard</div>
          <div className="page-subtitle">Special collections overview and management at a glance.</div>
        </div>
        <div className="flex gap-2" style={{ gap: 10 }}>
          <Link to="/admin/upload" className="btn btn-primary">
            <i className="fas fa-upload"></i> Upload Item
          </Link>
        </div>
      </div>

      {error && (
        <div className="notice-banner warning" style={{ marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle"></i> <span>{error}</span>
        </div>
      )}

      {/* Stat Cards — real numbers from /reports/dashboard */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon blue"><i className="fas fa-file-alt"></i></div>
          <div className="stat-value">{loading ? '…' : (data?.total_theses ?? 0).toLocaleString()}</div>
          <div className="stat-label">Total Collections</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green"><i className="fas fa-users"></i></div>
          <div className="stat-value">{loading ? '…' : (data?.total_users ?? 0).toLocaleString()}</div>
          <div className="stat-label">Registered Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon purple"><i className="fas fa-sitemap"></i></div>
          <div className="stat-value">{loading ? '…' : (data?.total_categories ?? 0).toLocaleString()}</div>
          <div className="stat-label">Categories</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon orange"><i className="fas fa-quote-right"></i></div>
          <div className="stat-value">{loading ? '…' : (data?.total_citations ?? 0).toLocaleString()}</div>
          <div className="stat-label">Total Citations</div>
        </div>
      </div>

      <div className="panel-grid-2">
        {/* Was "Collections by Department" — the categories stopped being only
            departments (Faculty Research, Institutional Publications, Special
            Boholano Creations), the same reason the landing page's grid was
            renamed. This counts items per collection, so say that. */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <i className="fas fa-chart-bar" style={{ color: 'var(--primary-blue)', marginRight: 6 }}></i>
              Items by Collection
            </div>
          </div>
          <div className="panel-body">
            {byDept.length === 0 && !loading && (
              <div className="text-muted" style={{ padding: 20 }}>No data yet.</div>
            )}
            <div className="bar-chart">
              {byDept.map(item => (
                <div className="bar-col" key={item.category_id}>
                  <div
                    className="bar"
                    style={{ height: `${Math.max(6, (Number(item.total) / maxDept) * 100)}%` }}
                  >
                    <span className="bar-value">{item.total}</span>
                  </div>
                  {/* The code, not the name: no bar is wide enough for "College
                      of Business and Management - Hospitality", and a name that
                      wrapped used to lift its own bar off the baseline. */}
                  <span className="bar-label" title={categoryName(item.category)}>
                    {categoryCode(item.category) || `Cat ${item.category_id}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Most Cited */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <i className="fas fa-fire" style={{ color: 'var(--danger)', marginRight: 6 }}></i>
              Most Cited
            </div>
            <Link to="/admin/reports" className="btn btn-sm btn-secondary">View Report</Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Title</th><th>Citations</th></tr>
              </thead>
              <tbody>
                {(data?.most_cited || []).map((row, i) => (
                  <tr key={row.thesis_id}>
                    <td><b>{i + 1}</b></td>
                    <td>{row.thesis?.title || `Thesis #${row.thesis_id}`}</td>
                    <td><b>{row.citation_count}</b></td>
                  </tr>
                ))}
                {!loading && (data?.most_cited || []).length === 0 && (
                  <tr><td colSpan="3" className="text-muted" style={{ padding: 20 }}>No citations logged yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Uploads */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <i className="fas fa-clock" style={{ color: 'var(--primary-blue)', marginRight: 6 }}></i>
            Recently Uploaded
          </div>
          <Link to="/admin/collections" className="btn btn-sm btn-secondary">Manage Items</Link>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th><th>Author</th><th>Department</th>
                <th>Year</th><th>Uploaded By</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent_uploads || []).map(t => (
                <tr key={t.id}>
                  <td><b>{t.title}</b></td>
                  <td>{t.authors}</td>
                  <td><span className="badge badge-info">{t.category?.name || '—'}</span></td>
                  <td>{t.year_published}</td>
                  <td>{t.uploader?.name || '—'}</td>
                  <td><span className="badge badge-active">{t.status}</span></td>
                </tr>
              ))}
              {!loading && (data?.recent_uploads || []).length === 0 && (
                <tr><td colSpan="6" className="text-muted" style={{ padding: 20 }}>No uploads yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
