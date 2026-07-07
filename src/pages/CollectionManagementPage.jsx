import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { thesesApi, categoriesApi } from '../api/admin'

export default function CollectionManagementPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [year, setYear] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('recent')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(new Set())

  useEffect(() => {
    categoriesApi.list().then(r => setCategories(r.data || [])).catch(() => {})
  }, [])

  const load = () => {
    setLoading(true); setError(null)
    thesesApi.list({
      category_id: categoryId || undefined,
      year_published: year || undefined,
      author: query || undefined,
      page,
    })
      .then(res => {
        const d = res.data
        // Filter status/sort client-side since backend index() only supports category/year/author
        let list = d.data || []
        if (status) list = list.filter(t => t.status === status)
        if (sort === 'viewed')  list = [...list].sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
        if (sort === 'az')      list = [...list].sort((a, b) => (a.title || '').localeCompare(b.title || ''))
        if (sort === 'oldest')  list = [...list].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        setItems(list)
        setMeta({
          current_page: d.current_page || 1,
          last_page:    d.last_page || 1,
          total:        d.total ?? list.length,
        })
      })
      .catch(err => setError(err?.response?.data?.message || err.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [categoryId, year, query, page, status, sort]) // eslint-disable-line

  const toggleOne = (id) => {
    setSelected(s => {
      const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
    })
  }
  const toggleAll = () => {
    setSelected(s => s.size === items.length ? new Set() : new Set(items.map(x => x.id)))
  }

  const archiveOne = async (id) => {
    if (!confirm('Archive this item?')) return
    try { await thesesApi.archive(id); load() }
    catch (e) { alert(e?.response?.data?.message || 'Archive failed') }
  }
  const deleteOne = async (id) => {
    if (!confirm('Permanently delete this item? This cannot be undone.')) return
    try { await thesesApi.remove(id); load() }
    catch (e) { alert(e?.response?.data?.message || 'Delete failed (super_admin only)') }
  }
  const archiveSelected = async () => {
    if (selected.size === 0) return
    if (!confirm(`Archive ${selected.size} selected item(s)?`)) return
    for (const id of selected) { try { await thesesApi.archive(id) } catch {} }
    setSelected(new Set()); load()
  }

  const years = useMemo(() => {
    const cy = new Date().getFullYear(); const out = []
    for (let y = cy; y >= cy - 8; y--) out.push(y); return out
  }, [])

  return (
    <main className="content">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/admin">Dashboard</Link> <span>›</span> Collection Management
          </div>
          <div className="page-title">Collection Management</div>
          <div className="page-subtitle">View, edit, archive, or delete collection records.</div>
        </div>
        <Link to="/admin/upload" className="btn btn-primary">
          <i className="fas fa-plus"></i> Upload New Item
        </Link>
      </div>

      {/* Filter bar */}
      <div className="search-bar">
        <div className="search-row">
          <div className="search-input-wrap">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search by author name…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (setQuery(searchInput), setPage(1))}
            />
          </div>
          <button className="btn btn-primary" onClick={() => { setQuery(searchInput); setPage(1) }}>
            <i className="fas fa-search"></i> Search
          </button>
        </div>
        <div className="filter-row">
          <select className="form-control" value={categoryId}
                  onChange={e => { setCategoryId(e.target.value); setPage(1) }}>
            <option value="">All Departments</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="form-control" value={year}
                  onChange={e => { setYear(e.target.value); setPage(1) }}>
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="form-control" value={status}
                  onChange={e => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <select className="form-control" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="recent">Sort: Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="viewed">Most Viewed</option>
            <option value="az">Title A–Z</option>
          </select>
        </div>
      </div>

      {/* Bulk actions bar */}
      <div className="flex-between mb-2">
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          <b>{meta.total.toLocaleString()}</b> items · <b>{selected.size}</b> selected
        </div>
        <div className="flex gap-2" style={{ gap: 8 }}>
          <button className="btn btn-sm btn-secondary" disabled={selected.size === 0} onClick={archiveSelected}>
            <i className="fas fa-archive"></i> Archive Selected
          </button>
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
                <th>
                  <input type="checkbox"
                         checked={items.length > 0 && selected.size === items.length}
                         onChange={toggleAll} />
                </th>
                <th>Title / Author</th>
                <th>Department</th>
                <th>Year</th>
                <th>Pages</th>
                <th>Views</th>
                <th>Status</th>
                <th>Date Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="9" className="text-muted" style={{ padding: 30, textAlign: 'center' }}>Loading…</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan="9" className="text-muted" style={{ padding: 30, textAlign: 'center' }}>No items match your filters.</td></tr>
              )}
              {items.map(t => (
                <tr key={t.id}>
                  <td>
                    <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleOne(t.id)} />
                  </td>
                  <td>
                    <b>{t.title}</b><br />
                    <small className="text-muted">
                      {t.authors}{t.adviser ? ` · Adv: ${t.adviser}` : ''}
                    </small>
                  </td>
                  <td><span className="badge badge-info">{t.category?.name || '—'}</span></td>
                  <td>{t.year_published}</td>
                  <td>{t.pages || '—'}</td>
                  <td>{t.views_count || 0}</td>
                  <td>
                    <span className={`badge ${t.status === 'active' ? 'badge-active' : 'badge-archived'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
                  <td>
                    <button className="btn-icon" title="View" onClick={() => navigate(`/theses/${t.id}`)}>
                      <i className="fas fa-eye"></i>
                    </button>
                    <button className="btn-icon" title="Archive" onClick={() => archiveOne(t.id)}>
                      <i className="fas fa-archive"></i>
                    </button>
                    <button className="btn-icon" title="Delete (super_admin only)"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => deleteOne(t.id)}>
                      <i className="fas fa-trash"></i>
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
              Page <b>{meta.current_page}</b> of <b>{meta.last_page}</b> · <b>{meta.total.toLocaleString()}</b> items total
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
    </main>
  )
}
