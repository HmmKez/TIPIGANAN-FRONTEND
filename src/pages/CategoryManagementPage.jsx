import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { categoriesApi } from '../api/admin'

const emptyForm = { name: '', parent_id: '' }

export default function CategoryManagementPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null) // null | { mode: 'create'|'edit', data }
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true); setError(null)
    categoriesApi.list()
      .then(r => setItems(r.data || []))
      .catch(err => setError(err?.response?.data?.message || err.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  // Flatten so children show inline with parent info
  const flat = items.flatMap(c => [
    { ...c, level: 0 },
    ...(c.children || []).map(ch => ({ ...ch, level: 1, parent_name: c.name })),
  ])
  const filtered = q ? flat.filter(c => (c.name || '').toLowerCase().includes(q.toLowerCase())) : flat

  const open = (mode, data = null) => {
    setModal({ mode, data })
    setForm(data ? { name: data.name, parent_id: data.parent_id || '' } : emptyForm)
  }
  const close = () => { setModal(null); setForm(emptyForm) }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { name: form.name, parent_id: form.parent_id || null }
      if (modal.mode === 'create') await categoriesApi.create(payload)
      else await categoriesApi.update(modal.data.id, payload)
      close(); load()
    } catch (err) {
      const errs = err?.response?.data?.errors
      alert(errs ? Object.values(errs).flat().join(' ') :
                   (err?.response?.data?.message || 'Save failed.'))
    } finally { setSaving(false) }
  }

  const remove = async (c) => {
    if (!confirm(`Delete category "${c.name}"? This cannot be undone.`)) return
    try { await categoriesApi.remove(c.id); load() }
    catch (err) { alert(err?.response?.data?.message || 'Delete failed. Categories with items cannot be deleted.') }
  }

  const totalItems = flat.reduce((s, c) => s + (c.theses_count || 0), 0)

  return (
    <main className="content">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/admin">Dashboard</Link> <span>›</span> Category Management
          </div>
          <div className="page-title">Category Management</div>
          <div className="page-subtitle">Manage academic departments, special collections, and research categories.</div>
        </div>
        <button className="btn btn-primary" onClick={() => open('create')}>
          <i className="fas fa-plus"></i> New Category
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon blue"><i className="fas fa-sitemap"></i></div>
          <div className="stat-value">{flat.length}</div>
          <div className="stat-label">Total Categories</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green"><i className="fas fa-file-alt"></i></div>
          <div className="stat-value">{totalItems.toLocaleString()}</div>
          <div className="stat-label">Total Items</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon purple"><i className="fas fa-layer-group"></i></div>
          <div className="stat-value">{items.length}</div>
          <div className="stat-label">Top-Level Categories</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon orange"><i className="fas fa-project-diagram"></i></div>
          <div className="stat-value">{flat.filter(c => c.level > 0).length}</div>
          <div className="stat-label">Sub-Categories</div>
        </div>
      </div>

      {error && (
        <div className="notice-banner warning" style={{ marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle"></i> <span>{error}</span>
        </div>
      )}

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">All Categories</div>
          <div className="search-input-wrap" style={{ maxWidth: 240 }}>
            <i className="fas fa-search"></i>
            <input type="text" placeholder="Search category…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Parent</th>
                <th>Total Items</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="5" className="text-muted" style={{ padding: 30, textAlign: 'center' }}>Loading…</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan="5" className="text-muted" style={{ padding: 30, textAlign: 'center' }}>No categories found.</td></tr>
              )}
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <b style={{ paddingLeft: c.level * 16 }}>
                      {c.level > 0 && <i className="fas fa-level-up-alt fa-rotate-90" style={{ marginRight: 6, color: 'var(--text-muted)' }}></i>}
                      {c.name}
                    </b>
                  </td>
                  <td className="text-muted">{c.parent_name || '—'}</td>
                  <td>{c.theses_count ?? '—'}</td>
                  <td>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                  <td>
                    <button className="btn-icon" title="Edit" onClick={() => open('edit', c)}>
                      <i className="fas fa-edit"></i>
                    </button>
                    <button className="btn-icon" title="Delete" style={{ color: 'var(--danger)' }} onClick={() => remove(c)}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className={`fas ${modal.mode === 'create' ? 'fa-plus' : 'fa-edit'}`}
                   style={{ color: 'var(--primary-blue)', marginRight: 8 }}></i>
                {modal.mode === 'create' ? 'New Category' : 'Edit Category'}
              </h3>
              <button className="btn-icon" onClick={close}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name <span className="req">*</span></label>
                  <input type="text" className="form-control" required
                         value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                         placeholder="e.g. College of Engineering" />
                </div>
                <div className="form-group">
                  <label className="form-label">Parent Category</label>
                  <select className="form-control" value={form.parent_id}
                          onChange={e => setForm({ ...form, parent_id: e.target.value })}>
                    <option value="">— None (top level) —</option>
                    {items.filter(c => !modal.data || c.id !== modal.data.id).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={close}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
                  {saving ? ' Saving…' : (modal.mode === 'create' ? ' Create Category' : ' Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
