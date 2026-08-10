import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api, { apiOrigin } from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import { categoryCode, categoryName } from '../utils/category'

// Dept → icon + cover color (matches the mockup styling)
// Cosmetic only — icon and cover colour, keyed on a category's CODE. A category
// with no entry here simply gets the neutral default, so this never needs to be
// exhaustive and a new category is never broken by being absent from it.
//
// It previously keyed on codes invented from the name, so 'SPC' and 'GS' matched
// nothing that actually existed and three categories had no entry at all.
const DEPT_META = {
  'CAST':   { icon: 'fa-flask',          cover: 'purple' },
  'COE':    { icon: 'fa-microchip',      cover: 'blue'   },
  'CON':    { icon: 'fa-heartbeat',      cover: 'green'  },
  'CCJ':    { icon: 'fa-balance-scale',  cover: 'orange' },
  'CABM-B': { icon: 'fa-chart-line',     cover: 'red'    },
  'CABM-H': { icon: 'fa-hotel',          cover: 'sky'    },
  'GS':     { icon: 'fa-graduation-cap', cover: 'teal'   },
  'SC':     { icon: 'fa-star',           cover: 'purple' },
  'SBC':    { icon: 'fa-landmark',       cover: 'orange' },
  'IP':     { icon: 'fa-building',       cover: 'blue'   },
  'FR':     { icon: 'fa-microscope',     cover: 'green'  },
}

const QUICK_TAGS = [
  'IoT', 'sustainable tourism', 'machine learning', 'nursing intervention',
  'digital marketing', 'Bohol', 'solar energy', 'cybersecurity',
]

const SORT_OPTIONS = [
  { value: 'recent',   label: 'Most Recent' },
  { value: 'viewed',   label: 'Most Viewed' },
  { value: 'az',       label: 'Title A–Z' },
]

// Parse the backend keywords column (stored as comma-separated string per migration)
function parseKeywords(kw) {
  if (!kw) return []
  if (Array.isArray(kw)) return kw
  return String(kw).split(',').map(s => s.trim()).filter(Boolean)
}

// Sort a list client-side based on the selected option
function sortItems(items, sort) {
  const copy = [...items]
  if (sort === 'viewed')  return copy.sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
  if (sort === 'az')      return copy.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  // 'recent' is default order from backend (latest())
  return copy
}

export default function BrowsePage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { user } = useAuth()

  // The badge beside each department must equal what clicking it returns.
  // It previously used `theses_count`, which counts archived theses too — the
  // filter advertised "CAST 19" and then showed 15. Guests see active only;
  // logged-in users also see restricted, mirroring ThesisController::index.
  const visibleIn = (c) =>
    (c.active_theses_count ?? 0) + (user ? (c.restricted_theses_count ?? 0) : 0)

  const [heroInput, setHeroInput] = useState('')
  const [query, setQuery] = useState(params.get('q') || '')
  const [resultsInput, setResultsInput] = useState(params.get('q') || '')

  const [categories, setCategories] = useState([])
  const [categoryId, setCategoryId] = useState(params.get('category_id') || '')
  const [year, setYear] = useState(params.get('year_published') || '')
  const [sort, setSort] = useState(params.get('sort') || 'recent')

  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 12 })
  const [page, setPage] = useState(Number(params.get('page')) || 1)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load categories once
  useEffect(() => {
    api.get('/categories')
      .then(res => setCategories(Array.isArray(res.data) ? res.data : (res.data?.data || [])))
      .catch(() => setCategories([]))
  }, [])

  // Fetch theses / search whenever filters change
  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)

    // If we have a search query → use /search (backend logs it and does full search)
    // Otherwise → use /theses (paginated public listing)
    const request = query
      ? api.get('/search', {
          params: {
            q: query,
            category_id: categoryId || undefined,
            year_published: year || undefined,
          },
        })
      : api.get('/theses', {
          params: {
            category_id: categoryId || undefined,
            year_published: year || undefined,
            page,
          },
        })

    request
      .then(res => {
        if (cancelled) return
        // Laravel paginator returns { data: [...], current_page, last_page, total, per_page }
        // SearchService may return { data: [...] } or a plain array — handle both
        const body = res.data
        let list = []
        let m = { current_page: page, last_page: 1, total: 0, per_page: 12 }
        if (Array.isArray(body)) {
          list = body
          m = { current_page: 1, last_page: 1, total: body.length, per_page: body.length || 12 }
        } else if (body && Array.isArray(body.data)) {
          list = body.data
          m = {
            current_page: body.current_page || 1,
            last_page:    body.last_page    || 1,
            total:        body.total        ?? list.length,
            per_page:     body.per_page     || 12,
          }
        } else if (body && body.results) {
          list = body.results
          m.total = list.length
        }
        setItems(list)
        setMeta(m)
      })
      .catch(err => {
        if (cancelled) return
        setError(err?.response?.data?.message || err.message || 'Failed to load collections')
        setItems([])
      })
      .finally(() => !cancelled && setLoading(false))

    return () => { cancelled = true }
  }, [query, categoryId, year, page])

  // Sync URL params so the page is bookmarkable / back-nav works
  useEffect(() => {
    const next = {}
    if (query)      next.q = query
    if (categoryId) next.category_id = categoryId
    if (year)       next.year_published = year
    if (sort !== 'recent') next.sort = sort
    if (page !== 1) next.page = String(page)
    setParams(next, { replace: true })
  }, [query, categoryId, year, sort, page, setParams])

  // Client-side sort (backend already returns latest first for /theses)
  const displayItems = useMemo(() => sortItems(items, sort), [items, sort])

  const showHero = !query && !categoryId && !year && items.length === 0 && !loading && !error

  const runSearch = (fromResults = false) => {
    const q = fromResults ? resultsInput.trim() : heroInput.trim()
    if (!q) return
    setQuery(q)
    setResultsInput(q)
    setPage(1)
  }

  const setFromQuick = (q) => {
    setHeroInput(q)
    setQuery(q)
    setResultsInput(q)
    setPage(1)
  }

  const clearQuery = () => {
    setQuery('')
    setResultsInput('')
    setPage(1)
  }

  const clearAllFilters = () => {
    setQuery(''); setResultsInput(''); setHeroInput('')
    setCategoryId(''); setYear(''); setSort('recent'); setPage(1)
  }

  // Build current year list for the dropdown
  const years = useMemo(() => {
    const cy = new Date().getFullYear()
    const out = []
    for (let y = cy; y >= cy - 8; y--) out.push(y)
    return out
  }, [])

  return (
    <main className="content">
      {/* ===== HERO (visible on first load, no query) ===== */}
      {showHero && (
        <section id="heroSection">
          <div className="hero-logo">
            <div className="logo-box"><i className="fas fa-book-open"></i></div>
            <h1>Browse Collections</h1>
            <p>Search and explore the entire MDC special collections repository</p>
          </div>

          <div className="search-hero-box">
            <div className="search-input-outer">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search by title, author, adviser, keyword…"
                value={heroInput}
                onChange={e => setHeroInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runSearch(false)}
                autoComplete="off"
              />
              <button className="btn-search" onClick={() => runSearch(false)}>
                <i className="fas fa-search"></i> Search
              </button>
            </div>
            <div className="search-quick-tags">
              {QUICK_TAGS.map(tag => (
                <span key={tag} className="quick-tag" onClick={() => setFromQuick(tag)}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== RESULTS SECTION ===== */}
      {!showHero && (
        <section id="resultsSection" className="visible">
          {/* Top search bar */}
          <div className="results-topbar">
            <div className="results-search-wrap">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search items by title, author, adviser, keyword…"
                value={resultsInput}
                onChange={e => setResultsInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runSearch(true)}
                autoComplete="off"
              />
            </div>
            {/* The MOBILE home for Department and Year. The sidebar owns both on
                desktop and is hidden below 992px, so these take over there —
                see the paired media queries in styles.css.
                Sort is deliberately not repeated here: it belongs beside the
                result count it reorders, which is where it now lives at every
                width. */}
            <div className="results-controls">
              <select
                className="filter-select"
                value={categoryId}
                onChange={e => { setCategoryId(e.target.value); setPage(1) }}
              >
                <option value="">All Departments</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                className="filter-select"
                value={year}
                onChange={e => { setYear(e.target.value); setPage(1) }}
              >
                <option value="">All Years</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Security notice. Deliberately does NOT claim screenshots are
              disabled — they cannot be, in any browser. Every page is watermarked
              with the reader's identity instead, which is both true and a better
              deterrent than a promise a reader can disprove in one keystroke. */}
          <div className="notice-banner">
            <i className="fas fa-shield-alt"></i>
            <span>
              <b>Academic Use Only:</b> Downloading, printing, and copying are disabled to protect
              intellectual property, and every page you open is watermarked with your name — any
              screenshot is traceable to your account. For citation purposes, please use the
              provided citation format.
            </span>
          </div>

          {/* Active filter chips */}
          {(query || categoryId || year) && (
            <div className="active-filters">
              {query && (
                <span className="chip">
                  <i className="fas fa-search" style={{ fontSize: 10 }}></i>
                  "{query}"
                  <button onClick={clearQuery} title="Remove"><i className="fas fa-times"></i></button>
                </span>
              )}
              {categoryId && (
                <span className="chip">
                  <i className="fas fa-sitemap" style={{ fontSize: 10 }}></i>
                  {categories.find(c => String(c.id) === String(categoryId))?.name || 'Category'}
                  <button onClick={() => { setCategoryId(''); setPage(1) }}><i className="fas fa-times"></i></button>
                </span>
              )}
              {year && (
                <span className="chip">
                  <i className="fas fa-calendar-alt" style={{ fontSize: 10 }}></i>
                  {year}
                  <button onClick={() => { setYear(''); setPage(1) }}><i className="fas fa-times"></i></button>
                </span>
              )}
              <button
                className="chip"
                onClick={clearAllFilters}
                style={{ background: 'transparent', border: '1px dashed var(--border-medium)', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                Clear all
              </button>
            </div>
          )}

          {/* Two-column layout */}
          <div className="results-layout">
            {/* Left sidebar: Category checkboxes + year range */}
            <aside className="results-sidebar-panel">
              <div className="filter-panel">
                <div className="filter-panel-title">Filter Results</div>

                <div className="filter-group">
                  <div className="filter-group-label">Department</div>
                  {categories.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading…</div>
                  )}
                  {categories.map(c => (
                    <div key={c.id} className="filter-option">
                      <label>
                        <input
                          type="radio"
                          name="dept"
                          checked={String(categoryId) === String(c.id)}
                          onChange={() => { setCategoryId(c.id); setPage(1) }}
                        />
                        {' '}{c.name}
                      </label>
                      {c.active_theses_count != null && (
                        <span className="filter-count">{visibleIn(c)}</span>
                      )}
                    </div>
                  ))}
                  {/* No "clear department" link here. Removing one filter is
                      already covered twice over — the active-filter chip above
                      the results has its own X, and Reset Filters below clears
                      everything. A third control for the same job was just more
                      to read. */}
                </div>

                <div className="filter-divider"></div>

                <div className="filter-group">
                  <div className="filter-group-label">Publication Year</div>
                  <select
                    className="filter-select"
                    style={{ width: '100%' }}
                    value={year}
                    onChange={e => { setYear(e.target.value); setPage(1) }}
                  >
                    <option value="">Any year</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                <button className="btn-apply-filter" onClick={clearAllFilters}>
                  Reset Filters
                </button>
              </div>
            </aside>

            {/* Main results column */}
            <div className="results-main">
              <div className="results-meta">
                <div className="results-count">
                  {loading
                    ? 'Loading…'
                    : error
                      ? 'Unable to load results'
                      : <>About <b>{(meta.total || displayItems.length).toLocaleString()}</b> result{(meta.total || displayItems.length) !== 1 ? 's' : ''}</>
                  }
                </div>
                <div className="results-sort">
                  <span>Sort:</span>
                  <select value={sort} onChange={e => setSort(e.target.value)}>
                    {SORT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Loading skeletons */}
              {loading && (
                <>
                  {[1, 2, 3].map(i => (
                    <div className="skeleton-card" key={i}>
                      <div className="skel skel-title"></div>
                      <div className="skel skel-sub"></div>
                      <div className="skel skel-line short"></div>
                      <div className="skel skel-line shorter"></div>
                    </div>
                  ))}
                </>
              )}

              {/* Error */}
              {!loading && error && (
                <div className="empty-state">
                  <i className="fas fa-exclamation-triangle" style={{ color: '#F5A623' }}></i>
                  <h3>Something went wrong</h3>
                  <p>{error}</p>
                </div>
              )}

              {/* Empty state */}
              {!loading && !error && displayItems.length === 0 && (
                <div className="empty-state">
                  <i className="fas fa-search"></i>
                  <h3>No results found</h3>
                  <p>
                    {query
                      ? <>No items found for "<b>{query}</b>". Try adjusting your search terms or filters.</>
                      : 'No items match the selected filters. Try clearing them.'}
                  </p>
                </div>
              )}

              {/* Result cards */}
              {!loading && !error && displayItems.map(t => {
                // Keyed on the category's real code. The old heuristic split the
                // NAME on whitespace/dashes, so "CABM-B" and "CABM-H" both keyed
                // as "CABM" and shared one icon and colour — and any multi-word
                // category ("Institutional Publications") keyed as its first word
                // and matched nothing at all.
                const cat = categoryName(t.category)
                const deptCode = categoryCode(t.category)
                const meta = DEPT_META[deptCode] || { icon: 'fa-file-alt', cover: '' }
                const kws = parseKeywords(t.keywords)

                return (
                  <div className="result-card" key={t.id}>
                    <div className="result-card-header">
                      <div className={`result-cover ${meta.cover}`}>
                        {t.category?.cover_image_path ? (
                          <img src={`${apiOrigin}/storage/${t.category.cover_image_path}`} alt=""
                               style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                        ) : (
                          <i className={`fas ${meta.icon}`}></i>
                        )}
                      </div>
                      <div className="result-body">
                        <div
                          className="result-title"
                          onClick={() => navigate(`/theses/${t.id}`)}
                        >
                          {t.title}
                        </div>
                        <div className="result-authors">
                          <i className="fas fa-users" style={{ fontSize: 11, marginRight: 4, color: 'var(--text-muted)' }}></i>
                          <span>{t.authors}</span>
                        </div>
                        <div className="result-meta-row">
                          {/* The short code, so every card's tag is the same shape.
                              It used to be the raw name, which is why some tags
                              read "CAST" and others "INSTITUTIONAL PUBLICATIONS".
                              Full name on hover, since IP/SBC aren't self-evident. */}
                          {deptCode && (
                            <span className="result-dept-badge" title={cat}>{deptCode}</span>
                          )}
                          {deptCode && <span className="dot"></span>}
                          {t.year_published && (
                            <>
                              <span className="result-year">
                                <i className="fas fa-calendar-alt" style={{ fontSize: 10, marginRight: 3 }}></i>
                                {t.year_published}
                              </span>
                              <span className="dot"></span>
                            </>
                          )}
                          {t.pages && (
                            <>
                              <span><i className="fas fa-file-alt" style={{ fontSize: 10, marginRight: 3 }}></i>{t.pages} pages</span>
                              <span className="dot"></span>
                            </>
                          )}
                          {t.adviser && (
                            <span><i className="fas fa-user-tie" style={{ fontSize: 10, marginRight: 3 }}></i>{t.adviser}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {t.abstract && (
                      <div className="result-abstract">{t.abstract}</div>
                    )}

                    {kws.length > 0 && (
                      <div className="result-keywords">
                        {kws.map(k => (
                          <span key={k} className="kw-tag" onClick={() => setFromQuick(k)}>{k}</span>
                        ))}
                      </div>
                    )}

                    <div className="result-footer">
                      <div className="result-actions">
                        <button className="btn-view" onClick={() => navigate(`/theses/${t.id}`)}>
                          <i className="fas fa-book-open"></i> View Details
                        </button>
                      </div>
                      <div className="result-stats">
                        <span><i className="fas fa-eye"></i> {t.views_count || 0}</span>
                        {t.favorites_count != null && (
                          <span><i className="fas fa-bookmark"></i> {t.favorites_count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Pagination — only shown when using /theses (paginated) */}
              {!loading && !error && !query && meta.last_page > 1 && (
                <div className="pagination-wrap">
                  <div className="pagination-info">
                    Showing page <b>{meta.current_page}</b> of <b>{meta.last_page}</b> · <b>{meta.total}</b> total
                  </div>
                  <div className="pagination-nav">
                    <button
                      className="page-btn"
                      disabled={meta.current_page <= 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    {Array.from({ length: meta.last_page }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === meta.last_page || Math.abs(p - meta.current_page) <= 1)
                      .reduce((acc, p, i, arr) => {
                        if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
                        acc.push(p)
                        return acc
                      }, [])
                      .map((p, i) => p === '…'
                        ? <span key={`e-${i}`} className="page-btn" style={{ border: 'none', cursor: 'default' }}>…</span>
                        : <button
                            key={p}
                            className={`page-btn ${p === meta.current_page ? 'active' : ''}`}
                            onClick={() => setPage(p)}
                          >{p}</button>
                      )
                    }
                    <button
                      className="page-btn"
                      disabled={meta.current_page >= meta.last_page}
                      onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                    >
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
