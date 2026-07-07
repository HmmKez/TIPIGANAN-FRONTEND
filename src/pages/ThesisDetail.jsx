import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios'
const isAuthenticated = () => !!localStorage.getItem('tipiganan_token')

// Thesis Detail page — the React port of the HTML mockup, wired to the
// live backend at GET /api/theses/{id}. The "Read Online" button minted
// a signed URL token via POST /api/theses/{id}/view-token, then routes
// to /viewer/:token where PdfViewer will fetch the actual PDF.
//
// NOTE: This page no longer wraps itself in <Layout> — the route wrapper
// (InLayout, in App.jsx) already provides the sidebar/topbar. Wrapping it
// here too caused a duplicated sidebar/topbar bug.

export default function ThesisDetail() {
  const { id } = useParams()
  const nav    = useNavigate()

  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [bookmarking, setBm]    = useState(false)
  const [opening, setOpening]   = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.get(`/theses/${id}`)
      .then((res) => { if (!cancelled) setData(res.data) })
      .catch((err) => { if (!cancelled) setError(err?.response?.data?.message || 'Failed to load thesis.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  const handleReadOnline = async () => {
    if (!isAuthenticated()) {
      // Guests can see the record but not open the PDF — that matches
      // the "Guest cannot open documents without logging in" rule from
      // the blueprint.
      nav(`/login?next=/theses/${id}`)
      return
    }
    try {
      setOpening(true)
      const { data: tok } = await api.post(`/theses/${id}/view-token`)
      nav(`/viewer/${tok.token}?thesis=${id}`)
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not open the document. Please try again.')
    } finally {
      setOpening(false)
    }
  }

  const handleBookmark = async () => {
    if (!isAuthenticated()) return nav(`/login?next=/theses/${id}`)
    setBm(true)
    try {
      if (data.bookmarked) {
        await api.delete(`/favorites/${id}`)
        setData({ ...data, bookmarked: false, bookmark_count: Math.max(0, data.bookmark_count - 1) })
      } else {
        await api.post(`/favorites/${id}`)
        setData({ ...data, bookmarked: true, bookmark_count: data.bookmark_count + 1 })
      }
    } catch {
      /* silent — the button UI won't budge if the call fails */
    } finally {
      setBm(false)
    }
  }

  const handleCite = async () => {
    try {
      const { data: cite } = await api.get(`/theses/${id}/citations/generate`, { params: { format: 'APA' } })
      const text = cite?.citation_text || cite?.text || ''
      if (text) {
        await navigator.clipboard.writeText(text)
        alert('APA citation copied to clipboard:\n\n' + text)
        if (isAuthenticated()) {
          api.post(`/theses/${id}/citations/log`, { format_type: 'APA' }).catch(() => {})
        }
      } else {
        alert('Citation is not available for this thesis yet.')
      }
    } catch {
      alert('Citation service unavailable. Try again in a moment.')
    }
  }

  if (loading) return <div className="panel"><div className="panel-body">Loading thesis…</div></div>
  if (error)   return <div className="panel"><div className="panel-body error">{error}</div></div>
  if (!data)   return null

  const { thesis, related, view_count, bookmark_count, bookmarked } = data
  const keywords = (thesis.keywords || '').split(',').map(k => k.trim()).filter(Boolean)
  const deptName = thesis.category?.name || 'Unknown'
  const deptCode = deptName.match(/\(([A-Z]+)\)/)?.[1] || deptName.slice(0, 4).toUpperCase()

  return (
    <>
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/dashboard">Dashboard</Link> <span>›</span>
            <Link to="/browse">Browse</Link> <span>›</span>
            <span>{deptCode}</span> <span>›</span>
            Thesis Detail
          </div>
          <div className="page-title">Thesis Detail</div>
        </div>
        <div>
          <button className="btn btn-secondary" onClick={() => nav(-1)}>
            <i className="fas fa-arrow-left" /> Back to Browse
          </button>
        </div>
      </div>

      <div className="notice-banner">
        <i className="fas fa-info-circle" />
        <span>This thesis is available for online reading only. Downloading, printing, and screenshots are disabled.</span>
      </div>

      <div className="panel">
        <div className="panel-body">
          <div className="thesis-detail-grid">
            <div>
              <div className="detail-cover">
                {thesis.cover_image_path ? (
                  <img src={`/storage/${thesis.cover_image_path}`} alt="" />
                ) : (
                  <i className="fas fa-microchip" />
                )}
                <div className="cover-label">FOR ACADEMIC USE ONLY</div>
              </div>
              <div className="text-center text-muted" style={{ fontSize: '11.5px' }}>
                <i className="fas fa-eye" /> {view_count ?? 0} views ·{' '}
                <i className="fas fa-bookmark" /> {bookmark_count ?? 0} bookmarks
              </div>
            </div>

            <div className="detail-meta">
              <span className="badge badge-info" style={{ marginBottom: 10 }}>
                {deptCode} — {deptName}
              </span>
              <h2>{thesis.title}</h2>
              <div className="authors">By <b>{thesis.authors}</b></div>

              <div className="row"><b>Adviser:</b> <span>{thesis.adviser}</span></div>
              <div className="row"><b>Year Published:</b> <span>{thesis.year_published}</span></div>
              <div className="row"><b>Department:</b> <span>{deptName}</span></div>
              {thesis.pages != null && <div className="row"><b>Pages:</b> <span>{thesis.pages} pages</span></div>}
              <div className="row">
                <b>Status:</b>
                <span>
                  <span className={'badge ' + (thesis.status === 'active' ? 'badge-active' : 'badge-muted')}>
                    {thesis.status}
                  </span>
                </span>
              </div>
              <div className="row"><b>Date Uploaded:</b>
                <span>{new Date(thesis.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>

              <div className="abstract-title">Abstract</div>
              <p className="abstract-body">{thesis.abstract}</p>

              {keywords.length > 0 && (
                <div className="keywords">
                  {keywords.map(k => <span key={k} className="keyword">{k}</span>)}
                </div>
              )}

              <div className="detail-actions">
                <button className="btn btn-primary" onClick={handleReadOnline} disabled={opening}>
                  <i className="fas fa-book-open" /> {opening ? 'Opening…' : 'Read Online'}
                </button>
                <button className="btn btn-secondary" onClick={handleBookmark} disabled={bookmarking}>
                  <i className={'fas fa-bookmark ' + (bookmarked ? 'bookmarked' : '')} />
                  {bookmarked ? ' Bookmarked' : ' Bookmark'}
                </button>
                <button className="btn btn-secondary" onClick={handleCite}>
                  <i className="fas fa-share-alt" /> Cite this
                </button>
                <button className="btn btn-secondary" onClick={() => alert('Report submitted. Staff will review it.')}>
                  <i className="fas fa-flag" /> Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {related?.length > 0 && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <i className="fas fa-layer-group" style={{ color: 'var(--primary-blue)', marginRight: 6 }} />
              Related Theses
            </div>
          </div>
          <div className="panel-body">
            <div className="thesis-grid">
              {related.map(r => {
                const rDept = r.category?.name?.match(/\(([A-Z]+)\)/)?.[1] || deptCode
                return (
                  <Link key={r.id} to={`/theses/${r.id}`} className="thesis-card">
                    <div className="thesis-cover">
                      <span className="dept-tag">{rDept}</span>
                      <span className="year-tag">{r.year_published}</span>
                      <i className="fas fa-file-alt" />
                    </div>
                    <div className="thesis-info">
                      <div className="thesis-title">{r.title}</div>
                      <div className="thesis-author">{r.authors}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}