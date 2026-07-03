import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { Loader, EmptyState, ErrorMessage } from '../components/Loader'
import { thesesApi } from '../api/theses'
import { categoriesApi } from '../api'

const DEPT_ICONS = {
  'CAST': 'fa-flask', 'CCJ': 'fa-balance-scale', 'COE': 'fa-microchip',
  'CON': 'fa-heartbeat', 'CABM-B': 'fa-chart-line', 'CABM-H': 'fa-hotel',
  'GS': 'fa-graduation-cap', 'SPC': 'fa-star',
}

export default function BrowsePage() {
  const [params, setParams] = useSearchParams()
  const [theses, setTheses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState(params.get('q') || '')
  const [category, setCategory] = useState(params.get('category') || '')
  const [year, setYear] = useState(params.get('year') || '')
  const [sort, setSort] = useState(params.get('sort') || 'recent')

  useEffect(() => {
    categoriesApi.list().then(res => {
      setCategories(res.data?.data || res.data || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    let mounted = true
    setLoading(true); setError(null)
    thesesApi.list({
      q: query || undefined,
      category_id: category || undefined,
      year: year || undefined,
      sort,
      per_page: 24,
    }).then(res => {
      if (!mounted) return
      setTheses(res.data?.data || res.data || [])
    }).catch(err => {
      if (!mounted) return
      setError(err)
      setTheses([])
    }).finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [query, category, year, sort])

  const handleSubmit = (e) => {
    e.preventDefault()
    const newParams = {}
    if (query) newParams.q = query
    if (category) newParams.category = category
    if (year) newParams.year = year
    if (sort !== 'recent') newParams.sort = sort
    setParams(newParams)
  }

  const currentYear = new Date().getFullYear()
  const years = []
  for (let y = currentYear; y >= currentYear - 10; y--) years.push(y)

  return (
    <>
      <PageHeader
        title="Browse Collections"
        subtitle="Search and explore MDC special collections repository"
      />

      <form onSubmit={handleSubmit} className="search-bar">
        <div className="search-row">
          <div className="search-input-wrap">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search by title, author, adviser, keyword..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            <i className="fas fa-search"></i> Search
          </button>
        </div>
        <div className="filter-row">
          <select className="form-control" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All Departments</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.code ? `${c.code} — ${c.name}` : c.name}</option>
            ))}
          </select>
          <select className="form-control" value={year} onChange={e => setYear(e.target.value)}>
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="form-control" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="recent">Sort: Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="views">Most Viewed</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </form>

      {error && <ErrorMessage error={error} onRetry={() => setSort(s => s)} />}

      {loading ? (
        <Loader label="Loading collections..." />
      ) : theses.length === 0 ? (
        <EmptyState icon="fa-book" title="No items found" message="Try adjusting your filters or search terms." />
      ) : (
        <>
          <div style={{marginBottom:14, fontSize:13, color:'var(--text-muted)'}}>
            <b style={{color:'var(--text-primary)'}}>{theses.length}</b> item{theses.length !== 1 ? 's' : ''} found
          </div>
          <div className="thesis-grid">
            {theses.map(t => (
              <Link key={t.id} to={`/theses/${t.id}`} className="thesis-card">
                <div className="thesis-cover">
                 {t.category?.name && <span className="dept-tag">{t.category.name}</span>}
                  {(t.year_published || t.year) && <span className="year-tag">{t.year_published || t.year}</span>}
                  <i className={`fas ${DEPT_ICONS[t.category?.name] || 'fa-file-alt'}`}></i>
                </div>
                <div className="thesis-info">
                  <div className="thesis-title">{t.title}</div>
                  <div className="thesis-author">{t.authors || t.author || '—'}</div>
                  <div className="thesis-meta">
                    <span className="icon-views"><i className="fas fa-eye"></i> {t.views_count || 0}</span>
                    <button className="bookmark-btn" onClick={(e) => e.preventDefault()}>
                      <i className="far fa-bookmark"></i>
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  )
}
