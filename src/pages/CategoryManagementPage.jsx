import { useEffect, useState } from 'react'
import RowActions from '../components/RowActions'
import { Link } from 'react-router-dom'
import { categoriesApi } from '../api/admin'
import { apiOrigin } from '../api/axios'
import { useToast } from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'

const emptyForm = { code: '', name: '' }

export default function CategoryManagementPage() {
  const { notify } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null) // null | { mode: 'create'|'edit', data }
  const [form, setForm] = useState(emptyForm)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteFor, setDeleteFor] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const load = () => {
    setLoading(true); setError(null)
    categoriesApi.list()
      .then(r => setItems(r.data || []))
      .catch(err => setError(err?.response?.data?.message || err.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = q ? items.filter(c => (c.name || '').toLowerCase().includes(q.toLowerCase())) : items

  const open = (mode, data = null) => {
    setModal({ mode, data })
    setForm(data ? { code: data.code || '', name: data.name } : emptyForm)
    setCoverFile(null)
    setCoverPreview(data?.cover_image_path ? `${apiOrigin}/storage/${data.cover_image_path}` : null)
  }
  const close = () => { setModal(null); setForm(emptyForm); setCoverFile(null); setCoverPreview(null) }

  const pickCoverFile = (file) => {
    setCoverFile(file)
    setCoverPreview(file ? URL.createObjectURL(file) : null)
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { code: form.code.trim().toUpperCase(), name: form.name.trim() }
      let category
      if (modal.mode === 'create') {
        category = (await categoriesApi.create(payload)).data
      } else {
        category = (await categoriesApi.update(modal.data.id, payload)).data
      }
      if (coverFile) {
        await categoriesApi.uploadCoverImage(category.id, coverFile)
      }
      close(); load()
      notify(modal.mode === 'create' ? 'Category created.' : 'Category updated.', 'success')
    } catch (err) {
      const errs = err?.response?.data?.errors
      notify(errs ? Object.values(errs).flat().join(' ') :
                    (err?.response?.data?.message || 'Save failed.'), 'error')
    } finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteFor) return
    setDeleteBusy(true)
    try {
      await categoriesApi.remove(deleteFor.id)
      load()
      notify(`Category "${deleteFor.name}" deleted.`, 'success')
    } catch (err) {
      notify(err?.response?.data?.message || 'Delete failed. Categories with items cannot be deleted.', 'error')
    } finally {
      setDeleteBusy(false)
      setDeleteFor(null)
    }
  }

  const totalItems = items.reduce((s, c) => s + (c.theses_count || 0), 0)

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
          <div className="stat-value">{items.length}</div>
          <div className="stat-label">Total Categories</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green"><i className="fas fa-file-alt"></i></div>
          <div className="stat-value">{totalItems.toLocaleString()}</div>
          <div className="stat-label">Total Items</div>
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
                <th>Cover</th>
                <th>Code</th>
                <th>Name</th>
                <th>Total Items</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="6" className="text-muted" style={{ padding: 30, textAlign: 'center' }}>Loading…</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan="6" className="text-muted" style={{ padding: 30, textAlign: 'center' }}>No categories found.</td></tr>
              )}
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    {c.cover_image_path ? (
                      <img src={`${apiOrigin}/storage/${c.cover_image_path}`} alt=""
                           style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <i className="fas fa-image"></i>
                      </div>
                    )}
                  </td>
                  <td><span className="badge badge-info">{c.code || '—'}</span></td>
                  <td><b>{c.name}</b></td>
                  <td>{c.theses_count ?? '—'}</td>
                  <td>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                  <td>
                    {/* Only two actions, so the menu costs an extra click —
                        but one of them permanently deletes a collection, and a
                        labelled item behind a divider is far harder to hit by
                        accident than a small red icon sitting beside Edit.
                        Consistency matters too: one pattern to learn across
                        the management tables rather than three. */}
                    <RowActions items={[
                      {
                        // "Category", matching this page's own heading and its
                        // toasts ("Category created", "Category updated") —
                        // not "Collection", which is what the public-facing
                        // landing page calls them.
                        icon: 'fa-edit', label: 'Edit Category',
                        onClick: () => open('edit', c),
                      },
                      { divider: true },
                      {
                        icon: 'fa-trash', label: 'Delete Category', danger: true,
                        onClick: () => setDeleteFor(c),
                      },
                    ]} />
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
                {/* The short code is typed, never derived. The app used to guess
                    it from the name (first four letters), which duplicated
                    acronyms ("CAST — CAST"), produced stubs ("INST"), and — worst
                    — collided: CABM-B and CABM-H both became "CABM". */}
                <div className="form-group">
                  <label className="form-label">Code <span className="req">*</span></label>
                  <p className="text-muted" style={{ fontSize: 11.5, marginBottom: 8 }}>
                    The short label shown on item tags and breadcrumbs. Must be unique.
                  </p>
                  <input type="text" className="form-control" required maxLength={16}
                         pattern="[A-Za-z0-9\-]+"
                         title="Letters, numbers and hyphens only"
                         value={form.code}
                         onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                         placeholder="e.g. COE, CABM-B, IP"
                         style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Name <span className="req">*</span></label>
                  <input type="text" className="form-control" required
                         value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                         placeholder="e.g. College of Engineering" />
                </div>
                <div className="form-group">
                  <label className="form-label">Cover Image</label>
                  <p className="text-muted" style={{ fontSize: 11.5, marginBottom: 8 }}>
                    Shown on the browse and landing pages for this department.
                  </p>
                  <label className="file-drop" style={{ display: 'block', padding: coverPreview ? 0 : 20, overflow: 'hidden' }}>
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                           onChange={e => pickCoverFile(e.target.files?.[0] || null)} />
                    {coverPreview ? (
                      <img src={coverPreview} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <>
                        <i className="fas fa-image"></i>
                        <p>Click to upload a cover image</p>
                        <p className="file-hint">JPG/PNG · Max 2 MB</p>
                      </>
                    )}
                  </label>
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

      <ConfirmModal
        open={!!deleteFor}
        icon="fa-trash-alt"
        confirmStyle="danger"
        title="Delete this category?"
        message={deleteFor && `Delete category "${deleteFor.name}"? This cannot be undone. Categories with items cannot be deleted.`}
        confirmLabel={deleteBusy ? 'Deleting…' : 'Delete Category'}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteFor(null)}
      />
    </main>
  )
}
