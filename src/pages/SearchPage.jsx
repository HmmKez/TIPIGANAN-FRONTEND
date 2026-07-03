import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { Loader, EmptyState, ErrorMessage } from '../components/Loader'
import { searchApi, categoriesApi } from '../api'

const DEPT_ICONS = {
  'CAST': 'fa-flask', 'CCJ': 'fa-balance-scale', 'COE': 'fa-microchip',
  'CON': 'fa-heartbeat', 'CABM-B': 'fa-chart-line', 'CABM-H': 'fa-hotel',
  'GS': 'fa-graduation-cap', 'SPC': 'fa-star',
}
const COVER_COLORS = ['', 'green', 'purple', 'orange', 'red', 'teal', 'sky']

const QUICK_TAGS = ['IoT', 'sustainable tourism', 'machine learning', 'nursing intervention',
                    'digital marketing', 'Bohol', 'solar energy', 'cybersecurity']

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [query, setQuery] = useState(params.get('q') || '')
  const [inputQuery, setInputQuery] = useState(params.get('q') || '')
  const [results, setResults] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('relevance')
  const [filterDept, setFilterDept] = useState('')
  const [yearFrom, setYearFrom] = useState('')
  const [yearTo, setYearTo] = useState('')

  useEffect(() => {
    categoriesApi.list().then(r => setCategories(r.data?.data || r.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!query) { setResults([]); return }
    let mounted = true
    setLoading(true); setError(null)
    searchApi.search({
      q: query,
      category_id: filterDept || undefined,
      year_from: yearFrom || undefined,
      year_to: yearTo || undefined,
      sort: sortBy,
    }).then(res => {
      if (!mounted) return
      setResults(res.data?.data || res.data?.results || res.data || [])
    }).catch(err => {
      if (!mounted) return
      setError(err); setResults([])
    }).finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [query, sortBy, filterDept, yearFrom, yearTo])

  const runSearch = (q) => {
    const val = q ?? inputQuery
    setQuery(val)
    setInputQuery(val)
    setParams(val ? { q: val } : {})
  }

  const showHero = !query

  return (
    <>
      {showHero ? (
        <section style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                          minHeight:'calc(100vh - 60px - 80px)', textAlign:'center'}}>
          <div style={{marginBottom:24}}>
            <div style={{width:64, height:64, background:'linear-gradient(135deg, var(--primary-blue), var(--primary-blue-light))',
                          borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28,
                          color:'#fff', margin:'0 auto 12px', boxShadow:'var(--shadow-lg)'}}>
              <i className="fas fa-search"></i>
            </div>
            <h1 style={{fontSize:32, fontWeight:700, color:'var(--text-primary)', letterSpacing:'-0.5px'}}>Search TIPIGANAN</h1>
            <p style={{fontSize:13, color:'var(--text-muted)', marginTop:4}}>
              Search across the entire MDC special collections repository
            </p>
          </div>
          <div style={{width:'100%', maxWidth:680, marginBottom:20}}>
            <form onSubmit={(e) => { e.preventDefault(); runSearch() }}
                  style={{display:'flex', alignItems:'center', background:'#fff', border:'1px solid var(--border-medium)',
                          borderRadius:28, padding:'0 6px 0 20px', boxShadow:'var(--shadow-md)'}}>
              <i className="fas fa-search" style={{color:'var(--text-muted)', fontSize:15, marginRight:12}}></i>
              <input type="text" value={inputQuery} onChange={e => setInputQuery(e.target.value)}
                     placeholder="Search by title, author, adviser, keyword..."
                     style={{flex:1, border:'none', outline:'none', fontSize:15, padding:'14px 0', background:'transparent', fontFamily:'inherit'}} />
              <button type="submit" style={{background:'var(--primary-blue)', color:'#fff', border:'none', borderRadius:22,
                                              padding:'9px 20px', fontSize:13, fontWeight:600, display:'flex',
                                              alignItems:'center', gap:6, fontFamily:'inherit'}}>
                <i className="fas fa-search"></i> Search
              </button>
            </form>
            <div style={{display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', marginTop:14}}>
              {QUICK_TAGS.map(tag => (
                <span key={tag} onClick={() => runSearch(tag)}
                      style={{background:'#fff', border:'1px solid var(--border-medium)', borderRadius:16,
                                padding:'5px 14px', fontSize:12, color:'var(--text-secondary)', cursor:'pointer'}}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <>
          <div className="results-topbar">
            <form onSubmit={(e) => { e.preventDefault(); runSearch() }}
                  style={{display:'flex', alignItems:'center', gap:8, flex:1, minWidth:260,
                            background:'var(--bg-main)', border:'1px solid var(--border-medium)',
                            borderRadius:22, padding:'7px 14px'}}>
              <i className="fas fa-search" style={{color:'var(--text-muted)', fontSize:13}}></i>
              <input value={inputQuery} onChange={e => setInputQuery(e.target.value)}
                     style={{border:'none', outline:'none', background:'transparent', fontSize:13.5, width:'100%', fontFamily:'inherit'}} />
              {inputQuery && (
                <button type="button" onClick={() => { setInputQuery(''); runSearch('') }} className="btn-icon">
                  <i className="fas fa-times"></i>
                </button>
              )}
            </form>
            <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                      style={{border:'1px solid var(--border-medium)', borderRadius:8, padding:'7px 12px', fontSize:12.5, background:'#fff'}}>
                <option value="">All Departments</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.code || c.name}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                      style={{border:'1px solid var(--border-medium)', borderRadius:8, padding:'7px 12px', fontSize:12.5, background:'#fff'}}>
                <option value="relevance">Sort: Relevance</option>
                <option value="recent">Newest</option>
                <option value="views">Most Viewed</option>
              </select>
            </div>
          </div>

          <div className="results-layout" style={{display:'flex', gap:24, alignItems:'flex-start'}}>
            <aside style={{width:220, flexShrink:0}}>
              <div style={{background:'#fff', border:'1px solid var(--border-light)', borderRadius:12, padding:18}}>
                <div style={{fontSize:12, fontWeight:600, textTransform:'uppercase', color:'var(--text-muted)', marginBottom:12, letterSpacing:0.8}}>
                  Refine Results
                </div>
                <div style={{marginBottom:18}}>
                  <div style={{fontSize:12, fontWeight:600, marginBottom:8}}>Year Range</div>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <input type="number" value={yearFrom} onChange={e => setYearFrom(e.target.value)}
                            placeholder="From" style={{flex:1, border:'1px solid var(--border-medium)', borderRadius:6, padding:'6px 8px', fontSize:12, textAlign:'center'}} />
                    <span style={{color:'var(--text-muted)', fontSize:11}}>—</span>
                    <input type="number" value={yearTo} onChange={e => setYearTo(e.target.value)}
                            placeholder="To" style={{flex:1, border:'1px solid var(--border-medium)', borderRadius:6, padding:'6px 8px', fontSize:12, textAlign:'center'}} />
                  </div>
                </div>
                <button onClick={() => runSearch(query)}
                        style={{width:'100%', background:'var(--primary-blue)', color:'#fff', border:'none',
                                  borderRadius:8, padding:9, fontSize:12.5, fontWeight:600, cursor:'pointer'}}>
                  Apply Filters
                </button>
              </div>
            </aside>

            <div style={{flex:1, minWidth:0}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:8}}>
                <div style={{fontSize:13, color:'var(--text-muted)'}}>
                  {loading ? 'Searching...' : (
                    <><b style={{color:'var(--text-primary)'}}>{results.length}</b> result{results.length !== 1 ? 's' : ''} for
                      <b style={{color:'var(--text-primary)'}}> "{query}"</b>
                    </>
                  )}
                </div>
              </div>

              {error && <ErrorMessage error={error} />}

              {loading ? <Loader /> :
               results.length === 0 ? <EmptyState icon="fa-search" title="No matches" message="Try different keywords or fewer filters." /> :
                results.map((r, i) => {
                  const t = r.thesis || r
                  const color = COVER_COLORS[i % COVER_COLORS.length]
                  return (
                    <div key={t.id} className="result-card" onClick={() => navigate(`/theses/${t.id}`)} style={{cursor:'pointer'}}>
                      <div style={{display:'flex', alignItems:'flex-start', gap:14}}>
                        <div className={`result-cover ${color}`}>
                          <i className={`fas ${DEPT_ICONS[t.department] || 'fa-file-alt'}`}></i>
                        </div>
                        <div style={{flex:1, minWidth:0}}>
                          <div style={{fontSize:15, fontWeight:600, color:'var(--primary-blue)', marginBottom:4}}>
                            {t.title}
                          </div>
                          <div style={{fontSize:12.5, color:'var(--text-secondary)', marginBottom:4}}>
                            By <span style={{color:'var(--text-primary)', fontWeight:500}}>{t.authors || t.author || '—'}</span>
                            {t.adviser && <> · Adviser: <span>{t.adviser}</span></>}
                          </div>
                          <div style={{display:'flex', flexWrap:'wrap', gap:10, fontSize:11.5, color:'var(--text-muted)', marginBottom:10}}>
                            {t.department && <span className="result-dept-badge" style={{background:'rgba(52,95,207,.08)', color:'var(--primary-blue)', borderRadius:4, padding:'2px 8px', fontSize:11, fontWeight:600}}>{t.department}</span>}
                            {(t.year_published || t.year) && <span><i className="fas fa-calendar-alt"></i> {t.year_published || t.year}</span>}
                            {t.views_count != null && <span><i className="fas fa-eye"></i> {t.views_count} views</span>}
                          </div>
                          {t.abstract && (
                            <div style={{fontSize:13, color:'var(--text-secondary)', lineHeight:1.65,
                                          display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden'}}>
                              {t.abstract}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              }
            </div>
          </div>
        </>
      )}
    </>
  )
}
