import { useEffect, useMemo, useState } from 'react'
import RowActions from '../components/RowActions'
import { Link, useNavigate } from 'react-router-dom'
import { thesesApi, categoriesApi } from '../api/admin'
import ConfirmModal from '../components/ConfirmModal'
import { useAuth } from '../contexts/AuthContext'

export default function CollectionManagementPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canDeleteDocs = hasPermission('delete_documents')
  const [items, setItems]         = useState([])
  const [meta, setMeta]           = useState({ current_page: 1, last_page: 1, total: 0 })
  const [categories, setCategories] = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [notice, setNotice]       = useState(null)

  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery]         = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [year, setYear]           = useState('')
  const [status, setStatus]       = useState('')
  const [sort, setSort]           = useState('recent')
  const [page, setPage]           = useState(1)
  const [selected, setSelected]   = useState(new Set())

  // Confirmation modal state
  const [modal, setModal] = useState({ open: false, title: '', message: '', confirmLabel: '', confirmStyle: 'danger', onConfirm: null })
  const closeModal = () => setModal(m => ({ ...m, open: false }))
  const openModal = (opts) => setModal({ open: true, ...opts })

  useEffect(() => {
    categoriesApi.list().then(r => setCategories(r.data || [])).catch(() => {})
  }, [])

  const load = () => {
    setLoading(true); setError(null)
    thesesApi.list({
      category_id:    categoryId || undefined,
      year:           year || undefined,
      q:              query || undefined,
      status:         status || undefined,
      page,
    })
      .then(res => {
        const d = res.data
        let list = d.data || []
        if (sort === 'viewed')  list = [...list].sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
        if (sort === 'az')      list = [...list].sort((a, b) => (a.title || '').localeCompare(b.title || ''))
        if (sort === 'oldest')  list = [...list].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        setItems(list)
        setMeta({ current_page: d.current_page || 1, last_page: d.last_page || 1, total: d.total ?? list.length })
      })
      .catch(err => setError(err?.response?.data?.message || err.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [categoryId, year, query, page, status, sort]) // eslint-disable-line

  // A changed page or filter shows different rows, so the old ticks would point
  // at items no longer on screen — and a bulk action would change those
  // without anyone seeing them. Start from nothing selected instead.
  useEffect(() => { setSelected(new Set()); setNotice(null) }, [categoryId, year, query, page, status])

  const toggleOne = (id) => {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const toggleAll = () => {
    setSelected(s => s.size === items.length ? new Set() : new Set(items.map(x => x.id)))
  }

  const archiveOne = (id, title) => {
    openModal({
      title: 'Archive this item?',
      message: `"${title}" will be moved to archived status and hidden from public browsing. You can restore it later by editing its status.`,
      confirmLabel: 'Archive',
      confirmStyle: 'warning',
      onConfirm: async () => {
        closeModal()
        try { await thesesApi.archive(id); load() }
        catch (e) { setError(e?.response?.data?.message || 'Archive failed') }
      },
    })
  }

  const deleteOne = (id, title) => {
    openModal({
      title: 'Permanently delete this item?',
      message: `"${title}" will be permanently removed from the repository. This action cannot be undone.`,
      confirmLabel: 'Delete permanently',
      confirmStyle: 'danger',
      onConfirm: async () => {
        closeModal()
        try { await thesesApi.remove(id); load() }
        catch (e) { setError(e?.response?.data?.message || 'Delete failed — requires the delete_documents permission') }
      },
    })
  }

  // Handles all three non-delete status transitions: unarchive/unrestrict
  // (both go back to 'active'), and restrict.
  const changeStatus = (id, newStatus, opts) => {
    openModal({
      ...opts,
      onConfirm: async () => {
        closeModal()
        try { await thesesApi.updateStatus(id, newStatus); load() }
        catch (e) { setError(e?.response?.data?.message || 'Status update failed') }
      },
    })
  }

  const restrictOne = (id, title) => changeStatus(id, 'restricted', {
    title: 'Restrict this item?',
    message: `"${title}" will only be visible to logged-in users — guests won't see it in browse, search, or its detail page.`,
    confirmLabel: 'Restrict',
    confirmStyle: 'warning',
  })

  const unrestrictOne = (id, title) => changeStatus(id, 'active', {
    title: 'Remove restriction?',
    message: `"${title}" will become visible to everyone again, including guests.`,
    confirmLabel: 'Remove Restriction',
    confirmStyle: 'primary',
  })

  const unarchiveOne = (id, title) => changeStatus(id, 'active', {
    title: 'Restore this item?',
    message: `"${title}" will be set back to active and become visible in public browsing again.`,
    confirmLabel: 'Restore',
    confirmStyle: 'primary',
  })

  // Bulk actions: every status change, plus delete for those allowed. Each
  // runs one item at a time through the same endpoint as the per-row action,
  // so the rules, audit entries and search-index updates are identical. Items
  // already in the target status are skipped (no pointless audit entries), and
  // failures are reported instead of swallowed — the old "Archive Selected"
  // caught every error and said nothing.
  const BULK = {
    active: {
      verb: 'set to Active', done: 'set to Active', label: 'Set Active', style: 'primary',
      message: (p) => `${p.They} will be visible to everyone, including guests.`,
    },
    restricted: {
      verb: 'restricted', done: 'restricted', label: 'Restrict', style: 'warning',
      message: (p) => `Only signed-in students, teachers and staff will be able to find and read ${p.them}. Guests will not see ${p.them} at all.`,
    },
    archived: {
      verb: 'archived', done: 'archived', label: 'Archive', style: 'warning',
      message: (p) => `Students, teachers and guests will no longer be able to find or open ${p.them}; only staff can. Nothing is deleted, and readers keep their bookmarks — change the status back to bring ${p.them} back.`,
    },
  }

  const runBulk = async (ids, action) => {
    let ok = 0
    const failed = []
    for (const id of ids) {
      try { await action(id); ok++ }
      catch (e) { failed.push(e?.response?.data?.message || 'request failed') }
    }
    return { ok, failed }
  }

  const reportBulk = ({ ok, failed }, doneText, skipped) => {
    // Reload FIRST: load() clears the error banner as it starts, so setting
    // the failure message before it would wipe the message straight away.
    setSelected(new Set()); load()
    const parts = []
    if (ok) parts.push(`${ok} item${ok > 1 ? 's' : ''} ${doneText}.`)
    if (skipped) parts.push(`${skipped} already ${skipped > 1 ? 'were' : 'was'} — left as ${skipped > 1 ? 'they were' : 'it was'}.`)
    setNotice(parts.join(' ') || null)
    setError(failed.length
      ? `${failed.length} item${failed.length > 1 ? 's' : ''} could not be changed: ${[...new Set(failed)].join('; ')}`
      : null)
  }

  const statusSelected = (newStatus) => {
    const b = BULK[newStatus]
    const known = new Map(items.map(t => [t.id, t.status]))
    const ids = [...selected].filter(id => known.get(id) !== newStatus)
    const skipped = selected.size - ids.length
    if (ids.length === 0) {
      setError(null)
      setNotice(`All ${selected.size} selected item${selected.size > 1 ? 's are' : ' is'} already ${b.done}.`)
      return
    }
    openModal({
      title: `${b.label} ${ids.length} item${ids.length > 1 ? 's' : ''}?`,
      message: `${ids.length} selected item${ids.length > 1 ? 's' : ''} will be ${b.verb}. ${b.message(ids.length > 1 ? { They: 'They', them: 'them' } : { They: 'It', them: 'it' })}${skipped ? ` (${skipped} selected item${skipped > 1 ? 's are' : ' is'} already ${b.done} and will be left alone.)` : ''}`,
      confirmLabel: `${b.label} ${ids.length}`,
      confirmStyle: b.style,
      onConfirm: async () => {
        closeModal()
        reportBulk(await runBulk(ids, id => thesesApi.updateStatus(id, newStatus)), b.done, skipped)
      },
    })
  }

  const deleteSelected = () => {
    const ids = [...selected]
    openModal({
      title: `Permanently delete ${ids.length} item${ids.length > 1 ? 's' : ''}?`,
      message: `${ids.length} selected item${ids.length > 1 ? 's' : ''} will be permanently removed from the repository. This action cannot be undone. To hide items while keeping them, use Archive instead.`,
      confirmLabel: `Delete ${ids.length} permanently`,
      confirmStyle: 'danger',
      onConfirm: async () => {
        closeModal()
        reportBulk(await runBulk(ids, id => thesesApi.remove(id)), 'deleted', 0)
      },
    })
  }

  const years = useMemo(() => {
    const cy = new Date().getFullYear(); const out = []
    for (let y = cy; y >= cy - 8; y--) out.push(y); return out
  }, [])

  return (
    <main className="content">
      <ConfirmModal
        open={modal.open}
        title={modal.title}
        message={modal.message}
        confirmLabel={modal.confirmLabel}
        confirmStyle={modal.confirmStyle}
        onConfirm={modal.onConfirm}
        onCancel={closeModal}
      />

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
              placeholder="Search by title or author…"
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
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
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
            <option value="restricted">Restricted</option>
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
        <div style={{ display: 'flex', gap: 8 }}>
          {/* One menu for every bulk action, the same component as each row's
              Actions menu. A plain disabled button stands in until something
              is ticked, so the control is visible before it is usable. */}
          {selected.size === 0 ? (
            <button className="row-actions-btn" disabled title="Tick one or more items first">
              With selected <i className="fas fa-chevron-down caret"></i>
            </button>
          ) : (
            <RowActions
              label={`With ${selected.size} selected`}
              align="right"
              items={[
                { icon: 'fa-check-circle', label: 'Set Active', onClick: () => statusSelected('active') },
                { icon: 'fa-user-lock', label: 'Restrict to Members', onClick: () => statusSelected('restricted') },
                { icon: 'fa-archive', label: 'Archive', onClick: () => statusSelected('archived') },
                canDeleteDocs && { divider: true },
                canDeleteDocs && { icon: 'fa-trash', label: 'Delete Permanently', danger: true, onClick: deleteSelected },
              ]}
            />
          )}
        </div>
      </div>

      {notice && (
        <div className="notice-banner success" style={{ marginBottom: 16 }} role="status">
          <i className="fas fa-check-circle"></i>
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="notice-banner warning" style={{ marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle"></i> <span>{error}</span>
        </div>
      )}

      <div className="panel">
        <div className="table-wrap">
          <table className="data-table stack-on-phone">
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
                <th>Status</th>
                <th>Date Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="8" className="text-muted" style={{ padding: 30, textAlign: 'center' }}>Loading…</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan="8" className="text-muted" style={{ padding: 30, textAlign: 'center' }}>No items match your filters.</td></tr>
              )}
              {items.map(t => (
                <tr key={t.id}>
                  <td className="cell-select">
                    <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleOne(t.id)} />
                  </td>
                  <td className="cell-primary">
                    <b>{t.title}</b><br />
                    <small className="text-muted">
                      {t.authors}{t.adviser ? ` · Adv: ${t.adviser}` : ''}
                    </small>
                  </td>
                  <td data-label="Department"><span className="badge badge-info">{t.category?.name || '—'}</span></td>
                  <td data-label="Year">{t.year || '—'}</td>
                  <td data-label="Pages">{t.pages || '—'}</td>
                  <td data-label="Status">
                    <span className={`badge ${t.status === 'active' ? 'badge-active' : t.status === 'restricted' ? 'badge-restricted' : 'badge-archived'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td data-label="Date Added">{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
                  <td className="cell-actions">
                    {/* Named actions instead of six icons. "user-lock" vs
                        "unlock" vs "archive" vs "box-open" was four tooltips
                        to hover through, and restrict/archive are not
                        obviously different concepts from an icon alone. */}
                    <RowActions items={[
                      {
                        icon: 'fa-eye', label: 'View Item',
                        onClick: () => navigate(`/theses/${t.id}`),
                      },
                      {
                        icon: 'fa-edit', label: 'Edit Details',
                        onClick: () => navigate(`/admin/theses/${t.id}/edit`),
                      },
                      t.status === 'active' && {
                        icon: 'fa-user-lock', label: 'Restrict to Members',
                        title: 'Hidden from guests; still visible to anyone signed in',
                        onClick: () => restrictOne(t.id, t.title),
                      },
                      t.status === 'restricted' && {
                        icon: 'fa-unlock', label: 'Remove Restriction',
                        title: 'Make visible to guests again',
                        onClick: () => unrestrictOne(t.id, t.title),
                      },
                      t.status === 'archived'
                        ? {
                            icon: 'fa-box-open', label: 'Restore from Archive',
                            onClick: () => unarchiveOne(t.id, t.title),
                          }
                        : {
                            icon: 'fa-archive', label: 'Archive Item',
                            title: 'Hidden from everyone except staff',
                            onClick: () => archiveOne(t.id, t.title),
                          },
                      canDeleteDocs && { divider: true },
                      canDeleteDocs && {
                        icon: 'fa-trash', label: 'Delete Item', danger: true,
                        onClick: () => deleteOne(t.id, t.title),
                      },
                    ]} />
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