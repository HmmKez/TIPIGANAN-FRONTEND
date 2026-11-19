import { useEffect, useRef, useState } from 'react'
import RowActions from '../components/RowActions'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { categoriesApi, collectionsApi } from '../api/admin'
import { apiOrigin } from '../api/axios'
import { useToast } from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'

// Two levels: a COLLECTION ("Thesis", "Special Collections") groups CATEGORIES
// ("CAST", "SBC"), and every item belongs to a category. Exactly two levels:
// a category cannot contain another category.

const emptyForm = { code: '', name: '', main_category_id: '' }

const WORD = { collection: 'Collection', category: 'Category' }

function Cover({ path, size = 44 }) {
  return path ? (
    <img src={`${apiOrigin}/storage/${path}`} alt=""
         style={{ width: size, height: size, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: 8, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
      <i className="fas fa-image"></i>
    </div>
  )
}

export default function CategoryManagementPage() {
  const { notify } = useToast()
  const navigate = useNavigate()
  const [collections, setCollections] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  // null | { kind: 'collection'|'category', mode: 'create'|'edit', data }
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteFor, setDeleteFor] = useState(null) // { kind, data }
  const [deleteBusy, setDeleteBusy] = useState(false)

  // The collections give the structure; the categories list gives the item
  // counts. Both are small, so both are loaded whole.
  const load = () => {
    setLoading(true); setError(null)
    Promise.all([collectionsApi.list(), categoriesApi.list()])
      .then(([cols, cats]) => { setCollections(cols.data || []); setCategories(cats.data || []) })
      .catch(err => setError(err?.response?.data?.message || err.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const needle = q.trim().toLowerCase()
  const matches = (x) => !needle || `${x.code || ''} ${x.name || ''}`.toLowerCase().includes(needle)

  // A collection shows when it matches, or when any of its categories does
  // (then only the matching categories are listed under it).
  const groups = collections.map(col => {
    const own = categories.filter(c => c.main_category_id === col.id)
    const shown = matches(col) ? own : own.filter(matches)
    const items = own.reduce((s, c) => s + (c.theses_count || 0), 0)
    return { col, own, shown, items, visible: matches(col) || shown.length > 0 }
  }).filter(g => g.visible)

  const totalItems = categories.reduce((s, c) => s + (c.theses_count || 0), 0)

  // --- Carousel ------------------------------------------------------------
  // One collection is chosen at a time; its categories show below. When the
  // chosen one is hidden by a search or deleted, the first visible one takes over.
  // Kept in the address (?collection=), so going to View Items and pressing
  // Back returns to the same collection instead of the first one.
  const [params, setParams] = useSearchParams()
  const selectedId = Number(params.get('collection')) || null
  const setSelectedId = (id) => setParams(id ? { collection: String(id) } : {}, { replace: true })
  const selected = groups.find(g => g.col.id === selectedId) || groups[0] || null

  // "Move all categories to…": empties a collection in one step.
  const [moveAllFor, setMoveAllFor] = useState(null) // the collection being emptied
  const [moveTarget, setMoveTarget] = useState('')
  const [moveBusy, setMoveBusy] = useState(false)
  const confirmMoveAll = async (e) => {
    e.preventDefault()
    setMoveBusy(true)
    try {
      const { data } = await collectionsApi.moveCategories(moveAllFor.id, Number(moveTarget))
      notify(data.message, 'success')
      setSelectedId(Number(moveTarget))
      setMoveAllFor(null); setMoveTarget('')
      load()
    } catch (err) {
      const errs = err?.response?.data?.errors
      notify(errs ? Object.values(errs).flat().join(' ') : (err?.response?.data?.message || 'Move failed.'), 'error')
    } finally { setMoveBusy(false) }
  }

  const scrollerRef = useRef(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  // Arrows only appear when there is more to scroll to in that direction.
  const updateArrows = () => {
    const el = scrollerRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }
  useEffect(() => {
    updateArrows()
    window.addEventListener('resize', updateArrows)
    return () => window.removeEventListener('resize', updateArrows)
  }, [collections, categories, q])

  const scrollByPage = (dir) => {
    const el = scrollerRef.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  // Left/Right move the selection along the row and bring the card into view.
  const onCarouselKey = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const i = groups.findIndex(g => g.col.id === selected?.col.id)
    const next = groups[Math.min(groups.length - 1, Math.max(0, i + (e.key === 'ArrowRight' ? 1 : -1)))]
    if (!next) return
    setSelectedId(next.col.id)
    scrollerRef.current?.querySelector(`[data-col="${next.col.id}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }

  const open = (kind, mode, data = null, preset = {}) => {
    setModal({ kind, mode, data })
    setForm(data
      ? { code: data.code || '', name: data.name || '', main_category_id: data.main_category_id ?? '' }
      : { ...emptyForm, ...preset })
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
    const { kind, mode, data } = modal
    const api = kind === 'collection' ? collectionsApi : categoriesApi
    setSaving(true)
    try {
      const payload = { code: form.code.trim().toUpperCase(), name: form.name.trim() }
      if (kind === 'category') payload.main_category_id = Number(form.main_category_id)
      const saved = mode === 'create'
        ? (await api.create(payload)).data
        : (await api.update(data.id, payload)).data
      if (coverFile) await api.uploadCoverImage(saved.id, coverFile)
      // A new collection is chosen straight away, so its Add Category is at hand.
      if (kind === 'collection' && mode === 'create') setSelectedId(saved.id)
      close(); load()
      notify(`${WORD[kind]} ${mode === 'create' ? 'created' : 'updated'}.`, 'success')
    } catch (err) {
      const errs = err?.response?.data?.errors
      notify(errs ? Object.values(errs).flat().join(' ') :
                    (err?.response?.data?.message || 'Save failed.'), 'error')
    } finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteFor) return
    const { kind, data } = deleteFor
    setDeleteBusy(true)
    try {
      await (kind === 'collection' ? collectionsApi : categoriesApi).remove(data.id)
      load()
      notify(`${WORD[kind]} "${data.name}" deleted.`, 'success')
    } catch (err) {
      notify(err?.response?.data?.message || 'Delete failed.', 'error')
    } finally {
      setDeleteBusy(false)
      setDeleteFor(null)
    }
  }

  const deleteMessage = deleteFor && (deleteFor.kind === 'collection'
    ? `Delete collection "${deleteFor.data.name}"? This cannot be undone. A collection that still has categories cannot be deleted; move or delete its categories first.`
    : `Delete category "${deleteFor.data.name}"? This cannot be undone. A category that still has items cannot be deleted.`)

  const isCollectionModal = modal?.kind === 'collection'

  return (
    <main className="content">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/admin">Dashboard</Link> <span>›</span> Collections &amp; Categories
          </div>
          <div className="page-title">Collections &amp; Categories</div>
          <div className="page-subtitle">
            Collections group the categories inside them. For example, the Thesis collection holds one category per department.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => open('category', 'create')}
                  disabled={collections.length === 0}
                  title={collections.length === 0 ? 'Create a collection first' : undefined}>
            <i className="fas fa-plus"></i> New Category
          </button>
          <button className="btn btn-primary" onClick={() => open('collection', 'create')}>
            <i className="fas fa-plus"></i> New Collection
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon purple"><i className="fas fa-layer-group"></i></div>
          <div className="stat-value">{collections.length}</div>
          <div className="stat-label">Total Collections</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon blue"><i className="fas fa-sitemap"></i></div>
          <div className="stat-value">{categories.length}</div>
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

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <div className="panel-title">
            All Collections{collections.length > 0 && <span className="text-muted" style={{ fontWeight: 400 }}> · {collections.length}</span>}
          </div>
          <div className="search-input-wrap" style={{ maxWidth: 260 }}>
            <i className="fas fa-search"></i>
            <input type="text" placeholder="Search collection or category…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
        </div>
        {loading && collections.length === 0 && <div className="cc-empty">Loading…</div>}
        {!loading && collections.length === 0 && (
          <div className="cc-empty">
            No collections yet. Start with one such as <b>Thesis</b>, then add its categories.
          </div>
        )}
        {!loading && collections.length > 0 && groups.length === 0 && (
          <div className="cc-empty">Nothing matches your search.</div>
        )}
      </div>

      {/* Option B: the collections as a carousel; the chosen one's categories as
          cards below. Kept on screen while a save or delete reloads the lists,
          so the page does not collapse to "Loading…" and jump. Swipe on phones;
          arrow buttons, or the arrow keys once the row has focus, on desktop. */}
      {groups.length > 0 && (
        <div className="cc-carousel-wrap">
          {canLeft && (
            <button type="button" className="cc-arrow left" aria-label="Previous collections" onClick={() => scrollByPage(-1)}>
              <i className="fas fa-chevron-left"></i>
            </button>
          )}
          <div className="cc-carousel" ref={scrollerRef} onScroll={updateArrows} tabIndex={0}
               role="listbox" aria-label="Collections" onKeyDown={onCarouselKey}>
            {groups.map(({ col, own, items }) => {
              const isSel = selected?.col.id === col.id
              return (
                <button type="button" key={col.id} data-col={col.id} role="option" aria-selected={isSel}
                        className={'cc-col-card' + (isSel ? ' selected' : '')}
                        onClick={() => setSelectedId(col.id)}>
                  <div className="cc-col-cover"
                       style={col.cover_image_path ? { backgroundImage: `url('${apiOrigin}/storage/${col.cover_image_path}')` } : undefined}>
                    {isSel && <span className="cc-col-check"><i className="fas fa-check"></i></span>}
                  </div>
                  <div className="cc-col-body">
                    <span className="badge badge-info">{col.code}</span>
                    <div className="cc-col-name">{col.name}</div>
                    <div className="cc-col-meta">
                      {own.length} {own.length === 1 ? 'category' : 'categories'} · {items.toLocaleString()} {items === 1 ? 'item' : 'items'}
                    </div>
                  </div>
                </button>
              )
            })}
            {!needle && (
              <button type="button" className="cc-col-new" onClick={() => open('collection', 'create')}>
                <i className="fas fa-plus" style={{ fontSize: 18 }}></i> New Collection
              </button>
            )}
          </div>
          {canRight && (
            <button type="button" className="cc-arrow right" aria-label="Next collections" onClick={() => scrollByPage(1)}>
              <i className="fas fa-chevron-right"></i>
            </button>
          )}
        </div>
      )}

      {selected && (
        <div className="panel">
          <div className="panel-header" style={{ gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <Cover path={selected.col.cover_image_path} size={48} />
              <div style={{ minWidth: 0 }}>
                <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge badge-info">{selected.col.code}</span> {selected.col.name}
                </div>
                <div className="text-muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                  Collection · {selected.own.length} {selected.own.length === 1 ? 'category' : 'categories'} · {selected.items.toLocaleString()} {selected.items === 1 ? 'item' : 'items'}
                  {needle && selected.shown.length !== selected.own.length && ` · ${selected.shown.length} shown by your search`}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn btn-secondary btn-sm"
                      onClick={() => open('category', 'create', null, { main_category_id: selected.col.id })}>
                <i className="fas fa-plus"></i> Add Category
              </button>
              <RowActions align="right" items={[
                { icon: 'fa-edit', label: 'Edit Collection', onClick: () => open('collection', 'edit', selected.col) },
                {
                  icon: 'fa-right-left', label: 'Move All Categories…',
                  disabled: selected.own.length === 0 || collections.length < 2,
                  title: selected.own.length === 0 ? 'This collection has no categories' : (collections.length < 2 ? 'Create another collection first' : undefined),
                  onClick: () => { setMoveAllFor(selected.col); setMoveTarget('') },
                },
                { divider: true },
                { icon: 'fa-trash', label: 'Delete Collection', danger: true, onClick: () => setDeleteFor({ kind: 'collection', data: selected.col }) },
              ]} />
            </div>
          </div>
          {selected.shown.length === 0 ? (
            <div className="cc-empty">No categories in this collection yet. Items can only be filed under a category.</div>
          ) : (
            <div className="cc-cat-grid">
              {selected.shown.map(c => (
                <div className="cc-cat-card" key={c.id}>
                  <div className="cc-cat-top">
                    <Cover path={c.cover_image_path} size={48} />
                    <span className="badge badge-info">{c.code || '—'}</span>
                  </div>
                  <div>
                    <div className="cc-cat-name">{c.name}</div>
                    {c.created_at && (
                      <div className="cc-cat-count" style={{ marginTop: 3 }}>Added {new Date(c.created_at).toLocaleDateString()}</div>
                    )}
                  </div>
                  <div className="cc-cat-foot">
                    <span className="cc-cat-count">
                      <i className="fas fa-file-alt" style={{ marginRight: 5 }}></i>
                      {(c.theses_count ?? 0).toLocaleString()} {c.theses_count === 1 ? 'item' : 'items'}
                    </span>
                    <RowActions align="right" items={[
                      // Editing includes moving: the Collection field.
                      // Opens Item Management already filtered to this category.
                      { icon: 'fa-folder-open', label: 'View Items', onClick: () => navigate(`/admin/collections?category_id=${c.id}`) },
                      { icon: 'fa-edit', label: 'Edit or Move Category', onClick: () => open('category', 'edit', c) },
                      { divider: true },
                      { icon: 'fa-trash', label: 'Delete Category', danger: true, onClick: () => setDeleteFor({ kind: 'category', data: c }) },
                    ]} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modal && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className={`fas ${modal.mode === 'create' ? 'fa-plus' : 'fa-edit'}`}
                   style={{ color: 'var(--primary-blue)', marginRight: 8 }}></i>
                {modal.mode === 'create' ? 'New' : 'Edit'} {WORD[modal.kind]}
              </h3>
              <button className="btn-icon" onClick={close}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                {!isCollectionModal && (
                  <div className="form-group">
                    <label className="form-label">Collection <span className="req">*</span></label>
                    <p className="text-muted" style={{ fontSize: 11.5, marginBottom: 8 }}>
                      {modal.mode === 'edit'
                        ? 'Choosing another collection moves this category there, together with all of its items.'
                        : 'The collection this category belongs to.'}
                    </p>
                    <select className="form-control" required value={form.main_category_id}
                            onChange={e => setForm({ ...form, main_category_id: e.target.value })}>
                      <option value="">— Select Collection —</option>
                      {collections.map(col => (
                        <option key={col.id} value={col.id}>{col.code} — {col.name}</option>
                      ))}
                    </select>
                  </div>
                )}
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
                         placeholder={isCollectionModal ? 'e.g. THESIS, FR' : 'e.g. COE, CABM-B, SBC'}
                         style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Name <span className="req">*</span></label>
                  <input type="text" className="form-control" required
                         value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                         placeholder={isCollectionModal ? 'e.g. Thesis, Faculty Research' : 'e.g. College of Education'} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cover Image</label>
                  <p className="text-muted" style={{ fontSize: 11.5, marginBottom: 8 }}>
                    {isCollectionModal
                      ? 'Shown on this collection\'s card on the landing page.'
                      : 'Shown on the Browse cards of items in this category.'}
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
                  {saving ? ' Saving…' : (modal.mode === 'create' ? ` Create ${WORD[modal.kind]}` : ' Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {moveAllFor && (
        <div className="modal-backdrop" onClick={() => !moveBusy && setMoveAllFor(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-right-left" style={{ color: 'var(--primary-blue)', marginRight: 8 }}></i>
                Move All Categories
              </h3>
              <button className="btn-icon" onClick={() => setMoveAllFor(null)} disabled={moveBusy}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={confirmMoveAll}>
              <div className="modal-body">
                <p style={{ marginBottom: 14, fontSize: 13.5, lineHeight: 1.5 }}>
                  Every category in <b>{moveAllFor.name}</b>
                  {' '}({categories.filter(c => c.main_category_id === moveAllFor.id).length}), with all of their items,
                  will move to the collection you choose. Nothing is deleted, and {moveAllFor.name} will be left empty.
                </p>
                <div className="form-group">
                  <label className="form-label">Move to <span className="req">*</span></label>
                  <select className="form-control" required value={moveTarget} onChange={e => setMoveTarget(e.target.value)}>
                    <option value="">— Select Collection —</option>
                    {collections.filter(col => col.id !== moveAllFor.id).map(col => (
                      <option key={col.id} value={col.id}>{col.code} — {col.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setMoveAllFor(null)} disabled={moveBusy}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={moveBusy || !moveTarget}>
                  <i className={`fas ${moveBusy ? 'fa-spinner fa-spin' : 'fa-right-left'}`}></i>
                  {moveBusy ? ' Moving…' : ' Move Categories'}
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
        title={deleteFor ? `Delete this ${deleteFor.kind}?` : ''}
        message={deleteMessage}
        confirmLabel={deleteBusy ? 'Deleting…' : `Delete ${deleteFor ? WORD[deleteFor.kind] : ''}`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteFor(null)}
      />
    </main>
  )
}
