import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { Loader, EmptyState, ErrorMessage } from '../components/Loader'
import { favoritesApi } from '../api'
import { apiOrigin } from '../api/axios'

const DEPT_ICONS = {
  'CAST': 'fa-flask', 'CCJ': 'fa-balance-scale', 'COE': 'fa-microchip',
  'CON': 'fa-heartbeat', 'CABM-B': 'fa-chart-line', 'CABM-H': 'fa-hotel',
  'GS': 'fa-graduation-cap', 'SPC': 'fa-star',
}

const GRADIENTS = [
  'linear-gradient(135deg,#345FCF,#5A79E5)',
  'linear-gradient(135deg,#7E57C2,#B388FF)',
  'linear-gradient(135deg,#2BB673,#6BD9A4)',
  'linear-gradient(135deg,#F5A623,#FFC766)',
  'linear-gradient(135deg,#3498DB,#5DADE2)',
  'linear-gradient(135deg,#E74C3C,#FF8071)',
]

function getBookmarkProgress(thesisId) {
  if (!thesisId) return 0
  const stored = localStorage.getItem(`tipiganan_read_progress_${thesisId}`)
  const value = Number(stored)
  return Number.isFinite(value) && value >= 0 ? Math.min(100, value) : 0
}

// TODO(backend): "Recently Opened Items" in the mockup comes from reading
// history, which has no endpoint. Omitted entirely rather than faking a
// list of fictional titles — add this section back once /history exists.

const pageStyles = `
  .bm-action-bar {
    background: #fff; border: 1px solid var(--border-light); border-radius: 12px;
    padding: 12px 20px; margin-bottom: 20px; display: flex; align-items: center;
    justify-content: space-between; flex-wrap: wrap; gap: 16px;
  }
  .bm-selection-info { display: flex; align-items: center; gap: 12px; font-size: 13px; color: var(--text-muted); }
  .bm-action-buttons { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .bm-action-btn {
    display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 8px;
    font-size: 12.5px; font-weight: 500; cursor: pointer; transition: all .15s;
    border: 1px solid var(--border-medium); background: #fff; color: var(--text-secondary); font-family: inherit;
  }
  .bm-action-btn:hover { background: var(--bg-hover); }
  .bm-action-btn.primary { background: var(--primary-blue); border-color: var(--primary-blue); color: #fff; }
  .bm-action-btn.primary:hover { background: var(--primary-blue-dark); }
  .bm-action-btn.danger { border-color: #FFCDD2; background: #FFEBEE; color: #C62828; }
  .bm-action-btn.danger:hover { background: #FFCDD2; }
  .bm-action-btn.warning { border-color: #FFE0B2; background: #FFF3E0; color: #E65100; }
  .bm-action-btn.warning:hover { background: #FFE0B2; }
  .bm-search-wrap { position: relative; flex: 1; max-width: 320px; }
  .bm-search-wrap i { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 13px; }
  .bm-search-wrap input {
    width: 100%; padding: 8px 12px 8px 36px; border: 1px solid var(--border-medium);
    border-radius: 10px; font-size: 13px; outline: none; font-family: inherit;
  }
  .bm-search-wrap input:focus { border-color: var(--primary-blue); box-shadow: 0 0 0 3px rgba(52,95,207,.1); }
  .bm-reading-progress { height: 3px; background: var(--border-light); border-radius: 2px; overflow: hidden; margin-top: 8px; }
  .bm-reading-progress-bar { height: 100%; background: var(--primary-blue); border-radius: 2px; }
  .bm-card-actions { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
  .bm-card-actions input[type=checkbox] { accent-color: var(--primary-blue); }
  @media (max-width: 768px) {
    .bm-action-bar { flex-direction: column; align-items: stretch; }
    .bm-search-wrap { max-width: 100%; }
  }
`

export default function BookmarksPage() {
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterDept, setFilterDept] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [showRemoveAllModal, setShowRemoveAllModal] = useState(false)
  const [busy, setBusy] = useState(false)

  // A favorite whose thesis was deleted keeps showing up here — it's only
  // removed once the user actually tries to open it (ThesisDetail's 404
  // handler cleans it up then). Don't auto-delete it on load.
  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await favoritesApi.list()
      setFavorites(res.data?.data || res.data || [])
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Departments derived from actual data, not hardcoded — mockup hardcodes
  // COE/CAST/CON/CABM-B, but real category names vary per install.
  const deptCounts = useMemo(() => {
    const counts = {}
    favorites.forEach(f => {
      const code = f.thesis?.category?.name || 'Uncategorized'
      counts[code] = (counts[code] || 0) + 1
    })
    return counts
  }, [favorites])

  const filtered = useMemo(() => {
    let list = [...favorites]
    if (filterDept !== 'all') {
      list = list.filter(f => (f.thesis?.category?.name || 'Uncategorized') === filterDept)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(f =>
        f.thesis?.title?.toLowerCase().includes(q) ||
        f.thesis?.authors?.toLowerCase().includes(q)
      )
    }
    return list
  }, [favorites, filterDept, search])

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(filtered.map(f => f.id)))
  const deselectAll = () => setSelected(new Set())

  const removeOne = async (thesisId, favoriteId) => {
    setBusy(true)
    try {
      await favoritesApi.remove(thesisId)
      setFavorites(prev => prev.filter(f => f.id !== favoriteId))
      setSelected(prev => { const n = new Set(prev); n.delete(favoriteId); return n })
    } finally {
      setBusy(false)
    }
  }

  const removeSelected = async () => {
    if (selected.size === 0) return
    if (!confirm(`Remove ${selected.size} selected bookmark(s)?`)) return
    setBusy(true)
    try {
      const toRemove = favorites.filter(f => selected.has(f.id))
      await Promise.allSettled(toRemove.map(f => favoritesApi.remove(f.thesis_id)))
      setFavorites(prev => prev.filter(f => !selected.has(f.id)))
      setSelected(new Set())
    } finally {
      setBusy(false)
    }
  }

  const removeAll = async () => {
    setBusy(true)
    try {
      await Promise.allSettled(favorites.map(f => favoritesApi.remove(f.thesis_id)))
      setFavorites([])
      setSelected(new Set())
    } finally {
      setBusy(false)
      setShowRemoveAllModal(false)
    }
  }

  const exportBookmarks = () => {
    if (favorites.length === 0) return
    let text = 'TIPIGANAN Bookmarks Export\n'
    text += 'Generated: ' + new Date().toLocaleString() + '\n'
    text += '='.repeat(50) + '\n\n'
    favorites.forEach((f, i) => {
      const t = f.thesis
      if (!t) {
        text += `${i + 1}. [This item is no longer available]\n`
        text += `   Saved: ${new Date(f.created_at).toLocaleDateString()}\n\n`
        return
      }
      text += `${i + 1}. ${t.title}\n`
      text += `   Author(s): ${t.authors}\n`
      text += `   Department: ${t.category?.name || '—'}\n`
      text += `   Year: ${t.year_published || '—'}\n`
      text += `   Saved: ${new Date(f.created_at).toLocaleDateString()}\n\n`
    })
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tipiganan_bookmarks_${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <style>{pageStyles}</style>
      <PageHeader
        breadcrumb={<><Link to="/dashboard">Dashboard</Link> <span>›</span> My Bookmarks</>}
        title={<>My Bookmarks <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>— {favorites.length} saved</span></>}
        subtitle="Items you've saved for quick access. Bookmarked content stays available in your personal library."
      />

      {error && <ErrorMessage error={error} onRetry={load} />}

      <div className="bm-action-bar">
        <div className="bm-selection-info">
          <i className="fas fa-bookmark" style={{ color: 'var(--primary-blue)' }}></i>
          <span>{selected.size} of {filtered.length} selected</span>
        </div>
        <div className="bm-action-buttons">
          <button className="bm-action-btn" onClick={selectAll} disabled={busy}>
            <i className="fas fa-check-square"></i> Select All
          </button>
          <button className="bm-action-btn" onClick={deselectAll} disabled={busy}>
            <i className="fas fa-square"></i> Deselect All
          </button>
          {selected.size > 0 && (
            <button className="bm-action-btn danger" onClick={removeSelected} disabled={busy}>
              <i className="fas fa-trash-alt"></i> Remove Selected ({selected.size})
            </button>
          )}
          <button className="bm-action-btn warning" onClick={() => setShowRemoveAllModal(true)} disabled={busy || favorites.length === 0}>
            <i className="fas fa-trash-alt"></i> Remove All
          </button>
          <button className="bm-action-btn primary" onClick={exportBookmarks} disabled={favorites.length === 0}>
            <i className="fas fa-download"></i> Export List
          </button>
        </div>
        <div className="bm-search-wrap">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search your bookmarks by title or author..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${filterDept === 'all' ? 'active' : ''}`} onClick={() => setFilterDept('all')}>
          All Bookmarks ({favorites.length})
        </div>
        {Object.entries(deptCounts).map(([code, count]) => (
          <div key={code} className={`tab ${filterDept === code ? 'active' : ''}`} onClick={() => setFilterDept(code)}>
            {code} ({count})
          </div>
        ))}
      </div>

      {loading ? <Loader /> : filtered.length === 0 ? (
        favorites.length === 0 ? (
          <EmptyState
            icon="fa-bookmark"
            title="No bookmarks yet"
            message="Start saving interesting items by clicking the bookmark button on any item page."
          />
        ) : (
          <EmptyState icon="fa-search" title="No matches" message="Try a different search term or department filter." />
        )
      ) : (
        <div className="thesis-grid">
          {filtered.map((f, i) => {
            const t = f.thesis || {}
            // The underlying thesis can be deleted out from under a favorite —
            // the row stays here until the user opens it (ThesisDetail cleans
            // it up on a 404), so render a "no longer available" placeholder
            // instead of a card full of blanks.
            const isDeleted = !f.thesis
            const code = t.category?.name || 'Uncategorized'
            const progress = getBookmarkProgress(t.id)
            const coverImage = t.cover_image_path || t.category?.cover_image_path
            return (
              <div key={f.id} className="thesis-card" style={isDeleted ? { opacity: 0.65 } : undefined}>
                <div className="thesis-cover" style={{ background: isDeleted ? 'linear-gradient(135deg,#999,#bbb)' : GRADIENTS[i % GRADIENTS.length] }}>
                  {isDeleted ? (
                    <i className="fas fa-exclamation-triangle"></i>
                  ) : coverImage ? (
                    <img src={`${apiOrigin}/storage/${coverImage}`} alt=""
                         style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <i className={`fas ${DEPT_ICONS[code] || 'fa-file-alt'}`}></i>
                  )}
                  {!isDeleted && <span className="dept-tag">{code}</span>}
                  {!isDeleted && <span className="year-tag">{t.year_published || '—'}</span>}
                </div>
                <div className="thesis-info">
                  {isDeleted ? (
                    <>
                      <div className="thesis-title">This item is no longer available</div>
                      <div className="thesis-author text-muted">It may have been deleted by staff.</div>
                    </>
                  ) : (
                    <>
                      <div className="thesis-title">{t.title}</div>
                      <div className="thesis-author">{t.authors}</div>
                      <div className="bm-reading-progress">
                        <div className="bm-reading-progress-bar" style={{ width: `${progress}%` }}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                        <span>{progress > 0 ? `${progress}% read` : 'Not started yet'}</span>
                        {t.year_published ? <span>{t.year_published}</span> : null}
                      </div>
                    </>
                  )}
                  <div className="thesis-meta">
                    <span className="text-muted"><i className="fas fa-clock"></i> Saved {new Date(f.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="bm-card-actions">
                    <input
                      type="checkbox"
                      checked={selected.has(f.id)}
                      onChange={() => toggleSelect(f.id)}
                    />
                    <button
                      className="bookmark-btn active"
                      title="Remove bookmark"
                      onClick={() => removeOne(f.thesis_id, f.id)}
                      disabled={busy}
                    >
                      <i className="fas fa-bookmark"></i>
                    </button>
                    <Link to={`/theses/${f.thesis_id}`} className="btn btn-sm btn-primary" style={{ marginLeft: 'auto' }}>
                      {isDeleted ? 'View' : 'Read'}
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showRemoveAllModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowRemoveAllModal(false)}>
          <div className="modal-card" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3><i className="fas fa-trash-alt" style={{ color: '#C62828', marginRight: 8 }}></i>Remove All Bookmarks</h3>
              <button className="btn-icon" onClick={() => setShowRemoveAllModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to remove all <b>{favorites.length}</b> bookmarks?</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRemoveAllModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={removeAll} disabled={busy}>Remove All</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}