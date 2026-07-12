import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import api from '../api/axios'
import Watermark from '../components/Watermark'

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const MDC_LOGO = 'https://sis.materdeicollege.com/img/MDC-Logo-clipped.png'
const HOVER_BG = 'rgba(255,255,255,0.12)'

// Inline style objects can't express :hover, so toolbar controls toggle
// their own background directly on the DOM node — same pattern already
// used for the cite-menu buttons in ThesisDetail.jsx.
function ToolbarBtn({ active, style, onMouseLeaveBg, ...props }) {
  return (
    <button
      {...props}
      style={{ ...S.tbBtn, ...(active ? S.tbBtnActive : {}), ...style }}
      onMouseEnter={e => { e.currentTarget.style.background = active ? S.tbBtnActive.background : HOVER_BG }}
      onMouseLeave={e => { e.currentTarget.style.background = active ? S.tbBtnActive.background : (onMouseLeaveBg || 'transparent') }}
    />
  )
}

export default function PdfViewer() {
  const { token }   = useParams()
  const [params]    = useSearchParams()
  const thesisId    = params.get('thesis') || '?'
  const nav         = useNavigate()

  const [pdfBlobUrl, setBlobUrl]   = useState(null)
  const [numPages, setNumPages]    = useState(0)
  const [currentPage, setPage]     = useState(1)
  const [zoom, setZoom]            = useState(1)
  const [blur, setBlur]            = useState(false)
  const [error, setError]          = useState(null)
  // Closed by default on phone-width screens — a 148px thumbnail rail eats
  // a big share of a narrow viewport; still one tap away via the toolbar
  // toggle either way.
  const [sidebarOpen, setSidebar]  = useState(() => window.innerWidth > 768)
  const pageRefs                   = useRef({})
  const mainRef                    = useRef(null)

  useEffect(() => {
    let revokeUrl = null
    let cancelled = false
    api.get(`/theses/serve/${token}`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return
        revokeUrl = URL.createObjectURL(res.data)
        setBlobUrl(revokeUrl)
      })
      .catch(async (err) => {
        if (cancelled) return
        let msg = 'Could not load the PDF. Your link may have expired.'
        const blob = err?.response?.data
        if (blob instanceof Blob) {
          try { const t = await blob.text(); const p = JSON.parse(t); if (p?.message) msg = p.message } catch {}
        }
        setError(msg)
      })
    return () => { cancelled = true; if (revokeUrl) URL.revokeObjectURL(revokeUrl) }
  }, [token])

  useEffect(() => {
    const stop = (e) => { e.preventDefault(); e.stopPropagation() }
    const onKey = (e) => {
      const k = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && ['p','s','c'].includes(k)) stop(e)
      if (k === 'printscreen') { navigator.clipboard?.writeText('TIPIGANAN — screenshots are disabled.').catch(() => {}); stop(e) }
      if (k === 'f12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && k === 'i')) stop(e)
    }
    const onBlur = () => setBlur(true)
    const onFocus = () => setBlur(false)
    const onVisible = () => setBlur(document.hidden)
    document.addEventListener('keydown', onKey, { capture: true })
    document.addEventListener('contextmenu', stop, { capture: true })
    document.addEventListener('copy', stop, { capture: true })
    document.addEventListener('cut', stop, { capture: true })
    document.addEventListener('dragstart', stop, { capture: true })
    window.addEventListener('beforeprint', stop)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('keydown', onKey, { capture: true })
      document.removeEventListener('contextmenu', stop, { capture: true })
      document.removeEventListener('copy', stop, { capture: true })
      document.removeEventListener('cut', stop, { capture: true })
      document.removeEventListener('dragstart', stop, { capture: true })
      window.removeEventListener('beforeprint', stop)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const scrollToPage = (n) => {
    const el = pageRefs.current[n]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setPage(n)
  }

  const file = useMemo(() => pdfBlobUrl ? { url: pdfBlobUrl } : null, [pdfBlobUrl])

  useEffect(() => {
    if (!mainRef.current || !file || numPages === 0) return
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
      if (visible.length === 0) return
      const pageNum = Number(visible[0].target.dataset.page)
      if (pageNum && pageNum !== currentPage) {
        setPage(pageNum)
      }
    }, {
      root: mainRef.current,
      rootMargin: '0px 0px -60% 0px',
      threshold: [0.2, 0.4, 0.6, 0.8],
    })

    Object.values(pageRefs.current).forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [file, numPages])

  useEffect(() => {
    if (!thesisId || !numPages || currentPage < 1) return
    const progress = Math.round((currentPage / numPages) * 100)
    try {
      localStorage.setItem(`tipiganan_read_progress_${thesisId}`, String(progress))
    } catch {
      // ignore storage errors
    }
  }, [thesisId, currentPage, numPages])

  const zoomIn  = () => setZoom(z => Math.min(3, +(z + 0.15).toFixed(2)))
  const zoomOut = () => setZoom(z => Math.max(0.4, +(z - 0.15).toFixed(2)))
  const zoomReset = () => setZoom(1)

  return (
    <div style={S.shell}>
      {/* ── TOP TOOLBAR ── */}
      <div style={S.toolbar}>
        <div style={S.toolLeft}>
          <ToolbarBtn onClick={() => nav(-1)} title="Back">
            <i className="fas fa-arrow-left" />
          </ToolbarBtn>
          <ToolbarBtn active={sidebarOpen} onClick={() => setSidebar(v => !v)} title="Toggle thumbnails">
            <i className="fas fa-th-large" />
          </ToolbarBtn>
          <div style={S.tbDivider} />
          <div style={S.titleBlock}>
            <img src={MDC_LOGO} alt="MDC" style={S.brandLogo} />
            <i className="fas fa-lock" style={{ fontSize: 11, marginRight: 6, color: 'rgba(255,255,255,0.5)' }} />
            <span style={S.titleMain}>{file ? (params.get('title') || `Thesis #${thesisId}`) : 'Loading…'}</span>
          </div>
        </div>

        <div style={S.toolCenter}>
          <ToolbarBtn onClick={() => scrollToPage(Math.max(1, currentPage - 1))} title="Previous page">
            <i className="fas fa-chevron-up" />
          </ToolbarBtn>
          <div style={S.pageInput}>
            <input
              type="number" min={1} max={numPages || 1} value={currentPage}
              onChange={e => { const v = Math.min(numPages, Math.max(1, +e.target.value)); setPage(v); scrollToPage(v) }}
              style={S.pageNum}
            />
            <span style={S.pageSep}>/</span>
            <span style={S.pageTotal}>{numPages || '–'}</span>
          </div>
          <ToolbarBtn onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))} title="Next page">
            <i className="fas fa-chevron-down" />
          </ToolbarBtn>
        </div>

        <div style={S.toolRight}>
          <ToolbarBtn onClick={zoomOut} title="Zoom out">
            <i className="fas fa-minus" />
          </ToolbarBtn>
          <ToolbarBtn onClick={zoomReset} title="Reset zoom" style={S.zoomLabel} onMouseLeaveBg="rgba(255,255,255,0.06)">
            {Math.round(zoom * 100)}%
          </ToolbarBtn>
          <ToolbarBtn onClick={zoomIn} title="Zoom in">
            <i className="fas fa-plus" />
          </ToolbarBtn>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={S.body}>
        {/* LEFT THUMBNAIL PANEL */}
        {sidebarOpen && (
          <div style={S.sidebar}>
            {file && numPages > 0
              ? Array.from({ length: numPages }, (_, i) => i + 1).map(n => (
                <div key={n} style={{ ...S.thumbWrap, ...(currentPage === n ? S.thumbActive : {}) }}
                  onClick={() => scrollToPage(n)}
                  onMouseEnter={e => { if (currentPage !== n) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
                  onMouseLeave={e => { if (currentPage !== n) e.currentTarget.style.borderColor = 'transparent' }}>
                  <Document file={file} loading={null} error={null}>
                    <Page pageNumber={n} width={110} renderAnnotationLayer={false} renderTextLayer={false}
                      loading={<div style={S.thumbSkeleton} />} />
                  </Document>
                  <div style={S.thumbLabel}>{n}</div>
                </div>
              ))
              : !error && Array.from({ length: 4 }, (_, i) => (
                <div key={i} style={S.thumbWrap}><div style={S.thumbSkeleton} /></div>
              ))
            }
          </div>
        )}

        {/* MAIN CANVAS */}
        <div ref={mainRef} style={{ ...S.canvas, ...(blur ? S.canvasBlur : {}) }}
          onContextMenu={e => e.preventDefault()}>
          {error && (
            <div style={S.errorBox}>
              <i className="fas fa-exclamation-circle" style={{ fontSize: 28, color: '#FF6B5E', marginBottom: 10 }} />
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Could not load the PDF.</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>{error}</div>
            </div>
          )}

          {!error && !file && (
            <div style={S.loadingBox}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: 'var(--primary-blue-light)', marginBottom: 10 }} />
              <div style={{ color: 'rgba(255,255,255,0.6)' }}>Loading secure document…</div>
            </div>
          )}

          {file && (
            <Document file={file}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              onLoadError={() => setError('Could not load the PDF.')}
              loading={<div style={S.loadingBox}><i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: 'var(--primary-blue-light)' }} /></div>}>
              {Array.from({ length: numPages }, (_, i) => (
                <div key={i} data-page={i + 1} ref={el => { if (el) pageRefs.current[i + 1] = el }} style={S.pageWrap}>
                  <Page
                    pageNumber={i + 1}
                    scale={zoom}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    onRenderSuccess={() => { if (i === 0) setPage(1) }}
                  />
                  {/* Watermarked per page, not once over the whole scroll
                      container — the container's own box is only as tall as
                      the viewport, so a single absolutely-positioned overlay
                      only ever covers whatever's scrolled to the top (page 1)
                      and scrolls away with it. Every page needs its own mark
                      so a screenshot of any single page still shows it. */}
                  <Watermark thesisId={thesisId} />
                </div>
              ))}
            </Document>
          )}
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      <div style={S.statusBar}>
        <span><i className="fas fa-shield-alt" style={{ marginRight: 5 }} />Watermarked · view only</span>
        <span>Downloading, printing, and copying are disabled</span>
      </div>
    </div>
  )
}

const S = {
  shell: {
    display: 'flex', flexDirection: 'column',
    height: '100vh', overflow: 'hidden',
    background: '#2A2D3A', fontFamily: "'Inter','Segoe UI',sans-serif",
    position: 'fixed', inset: 0, zIndex: 9999,
  },
  toolbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#1F2230', borderBottom: '1px solid rgba(255,255,255,0.08)',
    height: 48, flexShrink: 0, padding: '0 8px', gap: 8, userSelect: 'none',
    // ~15 controls at 30px+ each don't all fit a phone-width screen — this
    // keeps every button reachable via horizontal scroll instead of some
    // silently overflowing off-screen with no way to reach them.
    overflowX: 'auto',
  },
  toolLeft:   { display: 'flex', alignItems: 'center', gap: 2, flex: 1 },
  toolCenter: { display: 'flex', alignItems: 'center', gap: 4 },
  toolRight:  { display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'flex-end' },
  brandLogo: {
    width: 28, height: 28, borderRadius: '50%', objectFit: 'contain',
    background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
    padding: 2, marginRight: 10, flexShrink: 0,
  },
  tbBtn: {
    background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer',
    width: 30, height: 30, borderRadius: 6, fontSize: 13,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.12s, color 0.12s',
  },
  tbBtnActive: { background: 'var(--primary-blue)', color: '#fff' },
  tbDivider: { width: 1, height: 20, background: 'rgba(255,255,255,0.15)', margin: '0 4px' },
  titleBlock: { display: 'flex', alignItems: 'center', overflow: 'hidden' },
  titleMain: {
    color: 'rgba(255,255,255,0.92)', fontSize: 13, whiteSpace: 'nowrap',
    overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320,
  },
  pageInput: { display: 'flex', alignItems: 'center', gap: 4 },
  pageNum: {
    width: 42, textAlign: 'center', background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.18)', borderRadius: 5, color: '#fff',
    fontSize: 13, padding: '2px 4px', outline: 'none',
  },
  pageSep:   { color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  pageTotal: { color: 'rgba(255,255,255,0.65)', fontSize: 13, minWidth: 20 },
  zoomLabel: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 5,
    fontSize: 13, padding: '2px 8px', minWidth: 52, textAlign: 'center',
  },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar: {
    width: 148, background: '#1F2230', borderRight: '1px solid rgba(255,255,255,0.08)',
    overflowY: 'auto', flexShrink: 0, padding: '8px 0',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  },
  thumbWrap: {
    cursor: 'pointer', borderRadius: 5, overflow: 'hidden',
    // Longhand (not the `border` shorthand) so the active-state and hover
    // handlers can toggle borderColor alone without React warning about
    // removing a longhand property while a conflicting shorthand is set.
    borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent',
    transition: 'border-color 0.15s',
    position: 'relative',
  },
  thumbActive: { borderColor: 'var(--primary-blue-light)', boxShadow: '0 0 0 2px rgba(90,121,229,0.35)' },
  thumbSkeleton: { width: 110, height: 155, background: 'rgba(255,255,255,0.06)', borderRadius: 3 },
  thumbLabel: {
    textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: 11, padding: '3px 0 2px',
  },
  canvas: {
    flex: 1, overflowY: 'auto', overflowX: 'auto',
    background: '#2A2D3A', padding: '24px 0',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    position: 'relative',
  },
  canvasBlur: { filter: 'blur(12px)', pointerEvents: 'none' },
  pageWrap: {
    marginBottom: 16, boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
    background: '#fff', display: 'inline-block', borderRadius: 2,
    position: 'relative',
  },
  errorBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', marginTop: 80, color: 'rgba(255,255,255,0.85)', textAlign: 'center',
  },
  loadingBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', marginTop: 80, color: 'rgba(255,255,255,0.65)',
  },
  statusBar: {
    background: 'var(--primary-blue)', color: '#e0e8ff', fontSize: 11,
    height: 24, display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', padding: '0 12px', flexShrink: 0,
    userSelect: 'none',
  },
}