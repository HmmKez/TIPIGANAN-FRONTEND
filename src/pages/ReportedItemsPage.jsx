import { useEffect, useState } from 'react'
import { userLabel } from '../utils/userLabel'
import { Link, useNavigate } from 'react-router-dom'
import { thesisReportsApi } from '../api/admin'
import { useToast } from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'

export default function ReportedItemsPage() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const [tab, setTab] = useState('pending')
  const [reports, setReports] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [resolveFor, setResolveFor] = useState(null)
  const [resolving, setResolving] = useState(false)

  const load = () => {
    setLoading(true); setError(null)
    thesisReportsApi.list({ status: tab, page })
      .then(r => {
        const d = r.data
        setReports(d.data || [])
        setMeta({
          current_page: d.current_page || 1,
          last_page:    d.last_page || 1,
          total:        d.total ?? (d.data || []).length,
        })
      })
      .catch(err => setError(err?.response?.data?.message || err.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [tab, page]) // eslint-disable-line

  const confirmResolve = async () => {
    if (!resolveFor) return
    setResolving(true)
    try {
      await thesisReportsApi.resolve(resolveFor.id)
      notify('Report marked as resolved.', 'success')
      load()
    } catch (e) {
      notify(e?.response?.data?.message || 'Failed to resolve report.', 'error')
    } finally {
      setResolving(false)
      setResolveFor(null)
    }
  }

  return (
    <main className="content">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/admin">Dashboard</Link> <span>›</span> Reported Items
          </div>
          <div className="page-title">Reported Items</div>
          <div className="page-subtitle">Collections flagged by users for review — inspect and edit as needed, then mark resolved.</div>
        </div>
      </div>

      <div className="tabs">
        {[['pending', 'Pending'], ['resolved', 'Resolved']].map(([id, label]) => (
          <div key={id} className={`tab ${tab === id ? 'active' : ''}`}
               onClick={() => { setTab(id); setPage(1) }}>{label}</div>
        ))}
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
                <th>Item</th>
                <th>Reported By</th>
                <th>Reason</th>
                <th>Reported On</th>
                {tab === 'resolved' && <th>Resolved By</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={tab === 'resolved' ? 6 : 5} className="text-muted" style={{ padding: 30, textAlign: 'center' }}>Loading…</td></tr>
              )}
              {!loading && reports.length === 0 && (
                <tr><td colSpan={tab === 'resolved' ? 6 : 5} className="text-muted" style={{ padding: 30, textAlign: 'center' }}>
                  {tab === 'pending' ? 'No pending reports — nothing flagged right now.' : 'No resolved reports yet.'}
                </td></tr>
              )}
              {reports.map(r => (
                <tr key={r.id}>
                  <td>
                    <b>{r.thesis?.title || `Thesis #${r.thesis_id}`}</b><br />
                    <span className="badge badge-info">{r.thesis?.category?.name || '—'}</span>{' '}
                    <span className={`badge ${r.thesis?.status === 'active' ? 'badge-active' : r.thesis?.status === 'restricted' ? 'badge-restricted' : 'badge-archived'}`}>
                      {r.thesis?.status || '—'}
                    </span>
                  </td>
                  <td>
                    {r.user
                      ? <><b>{userLabel(r.user)}</b><br /><small className="text-muted">{r.user.email}</small></>
                      : <span className="text-muted">Deleted user</span>}
                  </td>
                  <td className="text-muted" style={{ maxWidth: 260 }}>{r.reason || <i>No reason given</i>}</td>
                  <td>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                  {tab === 'resolved' && <td>{r.resolver?.name || '—'}</td>}
                  <td>
                    <button className="btn-icon" title="View" onClick={() => navigate(`/theses/${r.thesis_id}`)}>
                      <i className="fas fa-eye"></i>
                    </button>
                    <button className="btn-icon" title="Edit Item" onClick={() => navigate(`/admin/theses/${r.thesis_id}/edit`)}>
                      <i className="fas fa-edit"></i>
                    </button>
                    {tab === 'pending' && (
                      <button className="btn-icon" title="Mark Resolved" onClick={() => setResolveFor(r)}>
                        <i className="fas fa-check-circle"></i>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta.last_page > 1 && (
          <div className="pagination">
            <div className="pagination-info">
              Page <b>{meta.current_page}</b> of <b>{meta.last_page}</b> · <b>{meta.total.toLocaleString()}</b> total
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

      <ConfirmModal
        open={!!resolveFor}
        icon="fa-check-circle"
        confirmStyle="primary"
        title="Mark this report as resolved?"
        message={resolveFor && `This marks the report on "${resolveFor.thesis?.title || 'this item'}" as handled. Make sure you've reviewed or edited the item first.`}
        confirmLabel={resolving ? 'Saving…' : 'Mark Resolved'}
        onConfirm={confirmResolve}
        onCancel={() => setResolveFor(null)}
      />
    </main>
  )
}
