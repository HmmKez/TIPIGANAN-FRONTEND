import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { auditApi } from '../api/admin'
import { useToast } from '../components/Toast'

const ACTION_ICONS = {
  login: 'fa-sign-in-alt', logout: 'fa-sign-out-alt', register: 'fa-user-plus',
  view_thesis: 'fa-eye', search: 'fa-search',
  upload_thesis: 'fa-upload', update_thesis: 'fa-edit', delete_thesis: 'fa-trash',
  archive_thesis: 'fa-archive',
  create_user: 'fa-user-plus', update_user: 'fa-user-edit', delete_user: 'fa-user-times',
  activate_user: 'fa-user-check', deactivate_user: 'fa-user-slash',
  reset_password: 'fa-key', grant_permission: 'fa-shield-alt', revoke_permission: 'fa-shield-alt',
  create_category: 'fa-plus', update_category: 'fa-edit', delete_category: 'fa-trash',
  citation_copy: 'fa-quote-right',
}
const iconFor = (a) => ACTION_ICONS[a] || 'fa-circle-info'
const classFor = (a) => {
  if (a?.startsWith('delete')) return 'red'
  if (a?.startsWith('update') || a === 'reset_password') return 'orange'
  if (a?.startsWith('create') || a === 'upload_thesis' || a === 'activate_user') return 'green'
  return ''
}

export default function AuditLogsPage() {
  const { notify } = useToast()
  const [logs, setLogs] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState(null)
  const [exporting, setExporting] = useState(false)

  const tabAction = {
    all: undefined, login: 'login', view: 'view_thesis',
    upload: 'upload_thesis', edit: 'update_thesis', delete: 'delete_thesis', search: 'search',
  }

  const load = () => {
    setLoading(true); setError(null)
    const params = {
      page,
      action: tabAction[tab],
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }
    auditApi.list(params)
      .then(r => {
        const d = r.data
        let list = d.data || []
        if (q) {
          const s = q.toLowerCase()
          list = list.filter(l =>
            (l.description || '').toLowerCase().includes(s) ||
            (l.user?.name || '').toLowerCase().includes(s) ||
            (l.ip_address || '').toLowerCase().includes(s) ||
            (l.action || '').toLowerCase().includes(s)
          )
        }
        setLogs(list)
        setMeta({
          current_page: d.current_page || 1,
          last_page:    d.last_page || 1,
          total:        d.total ?? list.length,
        })
      })
      .catch(err => setError(err?.response?.data?.message || err.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [tab, q, dateFrom, dateTo, page]) // eslint-disable-line

  const setPreset = (preset) => {
    const today = new Date()
    const fmt = (d) => d.toISOString().slice(0, 10)
    if (preset === 'today') { setDateFrom(fmt(today)); setDateTo(fmt(today)) }
    else if (preset === 'week') {
      const w = new Date(today); w.setDate(today.getDate() - 7)
      setDateFrom(fmt(w)); setDateTo(fmt(today))
    } else if (preset === 'month') {
      const m = new Date(today); m.setMonth(today.getMonth() - 1)
      setDateFrom(fmt(m)); setDateTo(fmt(today))
    } else if (preset === 'clear') { setDateFrom(''); setDateTo('') }
    setPage(1)
  }

  // The backend only applies date_from/date_to when period='custom' is
  // explicitly sent (otherwise it silently defaults to "last month",
  // ignoring whatever's on screen) — so export always sends period=custom
  // with the exact range currently shown here, defaulting to "everything
  // up to today" when no range is set, so the PDF matches the visible list.
  const exportLogs = async () => {
    const from = dateFrom || '2000-01-01'
    const to = dateTo || new Date().toISOString().slice(0, 10)
    setExporting(true)
    try {
      const res = await auditApi.exportPdf({
        period: 'custom',
        date_from: from,
        date_to: to,
        action: tabAction[tab],
      })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'audit-log-export.pdf'
      a.click()
      URL.revokeObjectURL(url)
      notify(`Audit log PDF downloaded (${from} to ${to}).`, 'success')
    } catch (err) {
      notify(err?.response?.data?.message || 'Export failed — requires the export_reports permission.', 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <main className="content">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/admin">Dashboard</Link> <span>›</span> Audit Logs
          </div>
          <div className="page-title">Audit Logs</div>
          <div className="page-subtitle">System activity tracking and security audit trail.</div>
        </div>
        <button className="btn btn-primary" onClick={exportLogs} disabled={exporting}
                title="Exports Timestamp, User, Action, and Description columns for the date range and activity type currently selected below.">
          <i className={`fas ${exporting ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
          {exporting ? ' Exporting…' : ' Export PDF'}
        </button>
      </div>

      <div className="notice-banner" style={{ marginBottom: 16 }}>
        <i className="fas fa-info-circle"></i>
        <span>
          Export PDF includes <b>Timestamp, User, Action, and Description</b> for the date range and
          activity type currently selected below — set the range and tab first, then export.
        </span>
      </div>

      {/* Date Range Presets */}
      <div className="flex-between mb-2" style={{ marginBottom: 16 }}>
        <div className="flex gap-2" style={{ gap: 8 }}>
          <span className="date-preset" style={presetStyle} onClick={() => setPreset('today')}>Today</span>
          <span className="date-preset" style={presetStyle} onClick={() => setPreset('week')}>Last 7 Days</span>
          <span className="date-preset" style={presetStyle} onClick={() => setPreset('month')}>Last 30 Days</span>
          <span className="date-preset" style={presetStyle} onClick={() => setPreset('clear')}>Clear</span>
        </div>
        <div className="text-muted" style={{ fontSize: 12 }}>
          <i className="fas fa-database"></i> {meta.total.toLocaleString()} entries
        </div>
      </div>

      {/* Activity Type Tabs */}
      <div className="tabs">
        {[
          ['all', 'All Activity'], ['login', 'Logins'], ['view', 'Views'],
          ['upload', 'Uploads'], ['edit', 'Edits'], ['delete', 'Deletions'], ['search', 'Searches'],
        ].map(([id, label]) => (
          <div key={id} className={`tab ${tab === id ? 'active' : ''}`}
               onClick={() => { setTab(id); setPage(1) }}>{label}</div>
        ))}
      </div>

      {/* Search bar + date filters */}
      <div className="search-bar">
        <div className="search-row">
          <div className="search-input-wrap">
            <i className="fas fa-search"></i>
            <input type="text" placeholder="Search by user, action, IP, or description…"
                   value={q} onChange={e => setQ(e.target.value)} />
          </div>
        </div>
        <div className="filter-row">
          <input type="date" className="form-control" value={dateFrom}
                 onChange={e => { setDateFrom(e.target.value); setPage(1) }} placeholder="From" />
          <input type="date" className="form-control" value={dateTo}
                 onChange={e => { setDateTo(e.target.value); setPage(1) }} placeholder="To" />
        </div>
      </div>

      {error && (
        <div className="notice-banner warning" style={{ marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle"></i> <span>{error}</span>
        </div>
      )}

      <div className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Description</th>
                <th>IP</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="6" className="text-muted" style={{ padding: 30, textAlign: 'center' }}>Loading…</td></tr>}
              {!loading && logs.length === 0 && (
                <tr><td colSpan="6" className="text-muted" style={{ padding: 30, textAlign: 'center' }}>No logs match your filters.</td></tr>
              )}
              {logs.map(l => (
                <tr key={l.id}>
                  <td>{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                  <td>
                    {l.user
                      ? <><b>{l.user.name}</b><br /><small className="text-muted">{l.user.email}</small></>
                      : <span className="text-muted">System</span>}
                  </td>
                  <td>
                    <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <i className={`fas ${iconFor(l.action)}`}></i> {l.action}
                    </span>
                  </td>
                  <td className="text-muted" style={{ maxWidth: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {l.description}
                  </td>
                  <td><code style={{ fontSize: 11 }}>{l.ip_address || '—'}</code></td>
                  <td>
                    <button className="btn-icon" title="View details" onClick={() => setDetail(l)}>
                      <i className="fas fa-info-circle"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta.last_page > 1 && (
          <div className="pagination">
            <div className="pagination-info">
              Page <b>{meta.current_page}</b> of <b>{meta.last_page}</b>
            </div>
            <div className="pagination-nav">
              <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <i className="fas fa-chevron-left"></i>
              </button>
              <button className="page-btn active">{meta.current_page}</button>
              <button className="page-btn" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className={`fas ${iconFor(detail.action)}`} style={{ color: 'var(--primary-blue)', marginRight: 8 }}></i>
                Log #{detail.id}
              </h3>
              <button className="btn-icon" onClick={() => setDetail(null)}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body">
              <div className="detail-meta">
                <div className="row"><b>Timestamp:</b> <span>{new Date(detail.created_at).toLocaleString()}</span></div>
                <div className="row"><b>User:</b> <span>{detail.user?.name || 'System'} ({detail.user?.email || '—'})</span></div>
                <div className="row"><b>Action:</b> <span>{detail.action}</span></div>
                <div className="row"><b>Target Type:</b> <span>{detail.target_type || '—'}</span></div>
                <div className="row"><b>Target ID:</b> <span>{detail.target_id ?? '—'}</span></div>
                <div className="row"><b>IP Address:</b> <span><code>{detail.ip_address || '—'}</code></span></div>
                <div className="row" style={{ display: 'block' }}>
                  <b>Description:</b>
                  <div style={{ marginTop: 6, padding: 12, background: 'var(--bg-hover)', borderRadius: 6 }}>
                    {detail.description}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

const presetStyle = {
  padding: '6px 12px', background: 'var(--bg-hover)', borderRadius: 8,
  cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)',
}
