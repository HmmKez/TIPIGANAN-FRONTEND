import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { reportsApi } from '../api/admin'
import { useToast } from '../components/Toast'

const REPORT_TYPES = [
  { value: 'dashboard',      label: 'Dashboard Summary' },
  { value: 'most-cited',     label: 'Most Cited Theses' },
  { value: 'by-department',  label: 'Collections by Department' },
  { value: 'by-year',        label: 'Collections by Year' },
  { value: 'most-searched',  label: 'Most Searched Keywords' },
  { value: 'most-active',    label: 'Most Active Users' },
  { value: 'peak-hours',     label: 'Peak Usage Hours' },
]

export default function ReportsPage() {
  const { notify } = useToast()
  const [dashboard, setDashboard] = useState(null)
  const [byDept, setByDept] = useState([])
  const [byYear, setByYear] = useState([])
  const [mostSearched, setMostSearched] = useState([])
  const [mostActive, setMostActive] = useState([])
  const [peakHours, setPeakHours] = useState([])
  const [mostCited, setMostCited] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [exportingType, setExportingType] = useState(null)

  useEffect(() => {
    setLoading(true); setError(null)
    Promise.all([
      reportsApi.dashboard(),
      reportsApi.byDepartment(),
      reportsApi.byYear(),
      reportsApi.mostSearched(),
      reportsApi.mostActive(),
      reportsApi.peakHours(),
      reportsApi.mostCited(),
    ])
      .then(([d, dep, yr, ms, ma, ph, mc]) => {
        setDashboard(d.data)
        setByDept(dep.data || [])
        setByYear(yr.data || [])
        setMostSearched(ms.data || [])
        setMostActive(ma.data || [])
        setPeakHours(ph.data || [])
        setMostCited(mc.data || [])
      })
      .catch(err => setError(err?.response?.data?.message || err.message))
      .finally(() => setLoading(false))
  }, [])

  const maxDept = Math.max(1, ...byDept.map(x => Number(x.total) || 0))
  const maxYear = Math.max(1, ...byYear.map(x => Number(x.total) || 0))
  const maxHour = Math.max(1, ...peakHours.map(x => Number(x.total) || 0))
  const totalActiveHours = mostActive.reduce((s, u) => s + Number(u.active_hours || 0), 0)

  const downloadReport = async (reportType, label) => {
    setExportMenuOpen(false)
    setExportingType(reportType)
    try {
      const res = await reportsApi.exportPdf({ report: reportType })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportType}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      notify(`${label} PDF downloaded.`, 'success')
    } catch (err) {
      notify(err?.response?.data?.message || 'Export failed — requires the export_reports permission.', 'error')
    } finally {
      setExportingType(null)
    }
  }

  return (
    <main className="content">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/admin">Dashboard</Link> <span>›</span> Reports &amp; Analytics
          </div>
          <div className="page-title">Reports &amp; Analytics</div>
          <div className="page-subtitle">Generate insights from the special collections repository.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button className="btn btn-primary" onClick={() => setExportMenuOpen(v => !v)} disabled={!!exportingType}>
              <i className={`fas ${exportingType ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
              {exportingType ? ' Exporting…' : ' Save as PDF'} <i className="fas fa-caret-down" style={{ marginLeft: 4 }}></i>
            </button>
            {exportMenuOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 60 }} onClick={() => setExportMenuOpen(false)}></div>
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4, minWidth: 220,
                  background: '#fff', border: '1px solid var(--border-light)', borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,.14)', zIndex: 61, overflow: 'hidden',
                }}>
                  {REPORT_TYPES.map(rt => (
                    <button key={rt.value} type="button" onClick={() => downloadReport(rt.value, rt.label)}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      {rt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <i className="fas fa-print"></i> Print
          </button>
        </div>
      </div>

      {error && (
        <div className="notice-banner warning" style={{ marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle"></i> <span>{error}</span>
        </div>
      )}

      {/* KPI Row */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon blue"><i className="fas fa-file-alt"></i></div>
          <div className="stat-value">{loading ? '…' : (dashboard?.total_theses ?? 0).toLocaleString()}</div>
          <div className="stat-label">Total Collections</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green"><i className="fas fa-users"></i></div>
          <div className="stat-value">{loading ? '…' : (dashboard?.total_users ?? 0).toLocaleString()}</div>
          <div className="stat-label">Registered Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon purple"><i className="fas fa-quote-right"></i></div>
          <div className="stat-value">{loading ? '…' : (dashboard?.total_citations ?? 0).toLocaleString()}</div>
          <div className="stat-label">Citations Logged</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon orange"><i className="fas fa-clock"></i></div>
          <div className="stat-value">{loading ? '…' : totalActiveHours.toLocaleString()}</div>
          <div className="stat-label">Top 10 Hours Active</div>
        </div>
      </div>

      <div className="panel-grid-2">
        {/* By Department */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <i className="fas fa-chart-bar" style={{ color: 'var(--primary-blue)', marginRight: 6 }}></i>
              Collections by Department
            </div>
          </div>
          <div className="panel-body">
            {byDept.length === 0 && !loading && <div className="text-muted" style={{ padding: 20 }}>No data.</div>}
            <div className="bar-chart">
              {byDept.map(item => (
                <div className="bar-col" key={item.category_id}>
                  <div className="bar" style={{ height: `${Math.max(6, (Number(item.total) / maxDept) * 100)}%` }}>
                    <span className="bar-value">{item.total}</span>
                  </div>
                  <span className="bar-label">{item.category?.name || `#${item.category_id}`}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* By Year */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <i className="fas fa-chart-line" style={{ color: 'var(--primary-blue)', marginRight: 6 }}></i>
              Collections by Year
            </div>
          </div>
          <div className="panel-body">
            {byYear.length === 0 && !loading && <div className="text-muted" style={{ padding: 20 }}>No data.</div>}
            <div className="bar-chart">
              {byYear.map(item => (
                <div className="bar-col" key={item.year_published}>
                  <div className="bar" style={{ height: `${Math.max(6, (Number(item.total) / maxYear) * 100)}%` }}>
                    <span className="bar-value">{item.total}</span>
                  </div>
                  <span className="bar-label">{item.year_published}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel-grid-2">
        {/* Most Cited */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <i className="fas fa-fire" style={{ color: 'var(--danger)', marginRight: 6 }}></i>
              Most Cited Theses
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Title</th><th>Authors</th><th>Citations</th></tr>
              </thead>
              <tbody>
                {mostCited.map((row, i) => (
                  <tr key={row.thesis_id}>
                    <td><b>{i + 1}</b></td>
                    <td>{row.thesis?.title || `Thesis #${row.thesis_id}`}</td>
                    <td>{row.thesis?.authors || '—'}</td>
                    <td><b>{row.citation_count}</b></td>
                  </tr>
                ))}
                {!loading && mostCited.length === 0 && (
                  <tr><td colSpan="4" className="text-muted" style={{ padding: 20 }}>No citation logs yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Most Searched */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <i className="fas fa-search" style={{ color: 'var(--primary-blue)', marginRight: 6 }}></i>
              Most Searched Keywords
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Keyword</th><th>Count</th></tr>
              </thead>
              <tbody>
                {mostSearched.map((row, i) => (
                  <tr key={i}>
                    <td><b>{i + 1}</b></td>
                    <td>{row.keyword}</td>
                    <td><b>{row.count}</b></td>
                  </tr>
                ))}
                {!loading && mostSearched.length === 0 && (
                  <tr><td colSpan="3" className="text-muted" style={{ padding: 20 }}>No search logs yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="panel-grid-2">
        {/* Most Active Users */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <i className="fas fa-users" style={{ color: 'var(--primary-blue)', marginRight: 6 }}></i>
              Most Active Users
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>User</th><th>Role</th><th>Hours Active</th></tr>
              </thead>
              <tbody>
                {mostActive.map((row, i) => (
                  <tr key={row.user_id}>
                    <td><b>{i + 1}</b></td>
                    <td>
                      {row.user
                        ? <><b>{row.user.name}</b><br /><small className="text-muted">{row.user.email}</small></>
                        : `User #${row.user_id}`}
                    </td>
                    <td>
                      <span className="badge badge-info">{row.user?.role || '—'}</span>
                    </td>
                    <td><b>{row.active_hours}</b></td>
                  </tr>
                ))}
                {!loading && mostActive.length === 0 && (
                  <tr><td colSpan="4" className="text-muted" style={{ padding: 20 }}>No activity yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Peak Hours */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <i className="fas fa-clock" style={{ color: 'var(--primary-blue)', marginRight: 6 }}></i>
              Peak Usage Hours
            </div>
          </div>
          <div className="panel-body">
            {peakHours.length === 0 && !loading && <div className="text-muted" style={{ padding: 20 }}>No data.</div>}
            <div className="bar-chart">
              {peakHours.map(item => (
                <div className="bar-col" key={item.hour}>
                  <div className="bar" style={{ height: `${Math.max(6, (Number(item.total) / maxHour) * 100)}%` }}>
                    <span className="bar-value">{item.total}</span>
                  </div>
                  <span className="bar-label">{String(item.hour).padStart(2, '0')}h</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
