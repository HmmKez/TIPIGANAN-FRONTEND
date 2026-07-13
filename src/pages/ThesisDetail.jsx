import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { apiOrigin } from '../api/axios'
import { favoritesApi } from '../api'
import { useToast } from '../components/Toast'
import { categoryCode, categoryName, categoryLabel } from '../utils/category'
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
  const [citeMenuOpen, setCiteMenuOpen] = useState(false)
  const [citeMenuPos, setCiteMenuPos] = useState(null)
  const citeBtnRef = useRef(null)
  const { notify } = useToast()

  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.get(`/theses/${id}`)
      .then((res) => { if (!cancelled) setData(res.data) })
      .catch((err) => {
        if (cancelled) return
        if (err?.response?.status === 404) {
          if (isAuthenticated()) {
            favoritesApi.remove(id).catch(() => {})
          }
          setError('This thesis is no longer available. It may have been deleted and has been removed from your bookmarks.')
        } else {
          setError(err?.response?.data?.message || 'Failed to load thesis.')
        }
      })
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
      notify(err?.response?.data?.message || 'Could not open the document. Please try again.', 'error')
    } finally {
      setOpening(false)
    }
  }

  const toggleCiteMenu = () => {
    if (!citeMenuOpen && citeBtnRef.current) {
      const r = citeBtnRef.current.getBoundingClientRect()
      setCiteMenuPos({ top: r.bottom + 4, left: r.left })
    }
    setCiteMenuOpen(v => !v)
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

  const handleCite = async (format) => {
    setCiteMenuOpen(false)
    try {
      // Backend returns { APA: "...", MLA: "..." } — each reflects the
      // staff-customized citation_text if one was saved, otherwise the
      // auto-generated default.
      const { data: cite } = await api.get(`/theses/${id}/citations/generate`, { params: { format } })
      const text = cite?.[format] || ''
      if (text) {
        await navigator.clipboard.writeText(text)
        notify(`${format} citation copied to clipboard:\n\n${text}`, 'success')
        if (isAuthenticated()) {
          api.post(`/theses/${id}/citations/log`, { format_type: format }).catch(() => {})
        }
      } else {
        notify('Citation is not available for this thesis yet.', 'error')
      }
    } catch {
      notify('Citation service unavailable. Try again in a moment.', 'error')
    }
  }

  const openReport = () => {
    if (!isAuthenticated()) return nav(`/login?next=/theses/${id}`)
    setReportReason('')
    setReportOpen(true)
  }

  const submitReport = async (e) => {
    e.preventDefault()
    setReportSubmitting(true)
    try {
      await api.post(`/theses/${id}/report`, { reason: reportReason || undefined })
      setReportOpen(false)
      notify('Report submitted. Staff will review it.', 'success')
    } catch (err) {
      notify(err?.response?.data?.message || 'Could not submit the report. Please try again.', 'error')
    } finally {
      setReportSubmitting(false)
    }
  }

  if (loading) return <div className="panel"><div className="panel-body">Loading thesis…</div></div>
  if (error)   return <div className="panel"><div className="panel-body error">{error}</div></div>
  if (!data)   return null

  const { thesis, related, view_count, bookmark_count, bookmarked } = data
  const keywords = (thesis.keywords || '').split(',').map(k => k.trim()).filter(Boolean)
  // Read the authored code and name — never derive one from the other.
  const deptName = categoryName(thesis.category)
  const deptCode = categoryCode(thesis.category)

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
                  <img src={`${apiOrigin}/storage/${thesis.cover_image_path}`} alt="" />
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
              {/* categoryLabel collapses to just the name when the code and the
                  name are the same word, instead of rendering "CAST — CAST". */}
              <span className="badge badge-info" style={{ marginBottom: 10 }}>
                {categoryLabel(thesis.category)}
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
                  <span className={'badge ' + (thesis.status === 'active' ? 'badge-active' : thesis.status === 'restricted' ? 'badge-restricted' : 'badge-archived')}>
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
                <button className={'btn ' + (bookmarked ? 'btn-bookmarked' : 'btn-secondary')}
                        onClick={handleBookmark} disabled={bookmarking}>
                  <i className={'fas fa-bookmark ' + (bookmarked ? 'bookmarked' : '')} />
                  {bookmarking ? ' …' : (bookmarked ? ' Bookmarked' : ' Bookmark')}
                </button>
                <div style={{ display: 'inline-block' }}>
                  <button ref={citeBtnRef} className="btn btn-secondary" onClick={toggleCiteMenu}>
                    <i className="fas fa-share-alt" /> Cite this <i className="fas fa-caret-down" style={{ marginLeft: 4 }} />
                  </button>
                  {citeMenuOpen && citeMenuPos && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 60 }} onClick={() => setCiteMenuOpen(false)}></div>
                      {/* position:fixed (anchored to the button's own bounding rect, not a
                          relative-positioned ancestor) so the menu escapes .panel's
                          overflow:hidden instead of getting clipped at the panel edge. */}
                      <div style={{
                        position: 'fixed', top: citeMenuPos.top, left: citeMenuPos.left, minWidth: 170,
                        background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 8,
                        boxShadow: '0 8px 24px rgba(0,0,0,.14)', zIndex: 61, overflow: 'hidden',
                      }}>
                        <button type="button" onClick={() => handleCite('APA')}
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          APA Style
                        </button>
                        <button type="button" onClick={() => handleCite('MLA')}
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          MLA Style
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <button className="btn btn-secondary" onClick={openReport}>
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
                // Its OWN code. This used to fall back to the code of the thesis
                // being viewed, so a related item from another collection was
                // tagged with the wrong department entirely.
                const rDept = categoryCode(r.category)
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

      {reportOpen && (
        <div className="modal-backdrop" onClick={() => setReportOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-flag" style={{ color: 'var(--warning)', marginRight: 8 }}></i>Report This Item</h3>
              <button className="btn-icon" onClick={() => setReportOpen(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={submitReport}>
              <div className="modal-body">
                <p className="text-muted" style={{ marginBottom: 16 }}>
                  Let staff know if something's wrong with this item — incorrect metadata,
                  a broken file, inappropriate content, or anything else worth a second look.
                </p>
                <div className="form-group">
                  <label className="form-label">Reason (optional)</label>
                  <textarea className="form-control" rows="3" value={reportReason}
                            onChange={e => setReportReason(e.target.value)}
                            placeholder="What's the issue?"></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setReportOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={reportSubmitting}>
                  <i className={`fas ${reportSubmitting ? 'fa-spinner fa-spin' : 'fa-flag'}`}></i>
                  {reportSubmitting ? ' Submitting…' : ' Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}