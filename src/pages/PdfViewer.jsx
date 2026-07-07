import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import api from '../api/axios'
import Watermark from '../components/Watermark'

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

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
  const [sidebarOpen, setSidebar]  = useState(true)
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

  const zoomIn  = () => setZoom(z => Math.min(3, +(z + 0.15).toFixed(2)))
  const zoomOut = () => setZoom(z => Math.max(0.4, +(z - 0.15).toFixed(2)))
  const zoomReset = () => setZoom(1)

  return (
    <div style={S.shell}>
      {/* ── TOP TOOLBAR ── */}
      <div style={S.toolbar}>
        <div style={S.toolLeft}>
          <button style={S.tbBtn} onClick={() => nav(-1)} title="Back">
            <i className="fas fa-arrow-left" />
          </button>
          <button style={{ ...S.tbBtn, ...(sidebarOpen ? S.tbBtnActive : {}) }}
            onClick={() => setSidebar(v => !v)} title="Toggle thumbnails">
            <i className="fas fa-th-large" />
          </button>
          <div style={S.tbDivider} />
          <div style={S.titleBlock}>
            <i className="fas fa-lock" style={{ fontSize: 11, marginRight: 6, color: '#aab' }} />
            <span style={S.titleMain}>{file ? (params.get('title') || `Thesis #${thesisId}`) : 'Loading…'}</span>
          </div>
        </div>

        <div style={S.toolCenter}>
          <button style={S.tbBtn} onClick={() => scrollToPage(Math.max(1, currentPage - 1))} title="Previous page">
            <i className="fas fa-chevron-up" />
          </button>
          <div style={S.pageInput}>
            <input
              type="number" min={1} max={numPages || 1} value={currentPage}
              onChange={e => { const v = Math.min(numPages, Math.max(1, +e.target.value)); setPage(v); scrollToPage(v) }}
              style={S.pageNum}
            />
            <span style={S.pageSep}>/</span>
            <span style={S.pageTotal}>{numPages || '–'}</span>
          </div>
          <button style={S.tbBtn} onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))} title="Next page">
            <i className="fas fa-chevron-down" />
          </button>
        </div>

        <div style={S.toolRight}>
          <button style={S.tbBtn} onClick={zoomOut} title="Zoom out">
            <i className="fas fa-minus" />
          </button>
          <button style={S.zoomLabel} onClick={zoomReset} title="Reset zoom">
            {Math.round(zoom * 100)}%
          </button>
          <button style={S.tbBtn} onClick={zoomIn} title="Zoom in">
            <i className="fas fa-plus" />
          </button>
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
                  onClick={() => scrollToPage(n)}>
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
          <Watermark thesisId={thesisId} />

          {error && (
            <div style={S.errorBox}>
              <i className="fas fa-exclamation-circle" style={{ fontSize: 28, color: '#e74c3c', marginBottom: 10 }} />
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Could not load the PDF.</div>
              <div style={{ color: '#888', fontSize: 13 }}>{error}</div>
            </div>
          )}

          {!error && !file && (
            <div style={S.loadingBox}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: '#345FCF', marginBottom: 10 }} />
              <div style={{ color: '#666' }}>Loading secure document…</div>
            </div>
          )}

          {file && (
            <Document file={file}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              onLoadError={() => setError('Could not load the PDF.')}
              loading={<div style={S.loadingBox}><i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: '#345FCF' }} /></div>}>
              {Array.from({ length: numPages }, (_, i) => (
                <div key={i} ref={el => { if (el) pageRefs.current[i + 1] = el }} style={S.pageWrap}>
                  <Page
                    pageNumber={i + 1}
                    scale={zoom}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    onRenderSuccess={() => { if (i === 0) setPage(1) }}
                  />
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
    background: '#3c3c3c', fontFamily: "'Inter','Segoe UI',sans-serif",
    position: 'fixed', inset: 0, zIndex: 9999,
  },
  toolbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#2b2b2b', borderBottom: '1px solid #1a1a1a',
    height: 44, flexShrink: 0, padding: '0 8px', gap: 8, userSelect: 'none',
  },
  toolLeft:   { display: 'flex', alignItems: 'center', gap: 2, flex: 1 },
  toolCenter: { display: 'flex', alignItems: 'center', gap: 4 },
  toolRight:  { display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'flex-end' },
  tbBtn: {
    background: 'none', border: 'none', color: '#ccc', cursor: 'pointer',
    width: 30, height: 30, borderRadius: 4, fontSize: 13,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.12s, color 0.12s',
  },
  tbBtnActive: { background: '#3f5fc0', color: '#fff' },
  tbDivider: { width: 1, height: 20, background: '#444', margin: '0 4px' },
  titleBlock: { display: 'flex', alignItems: 'center', overflow: 'hidden' },
  titleMain: {
    color: '#ddd', fontSize: 13, whiteSpace: 'nowrap',
    overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320,
  },
  pageInput: { display: 'flex', alignItems: 'center', gap: 4 },
  pageNum: {
    width: 42, textAlign: 'center', background: '#1e1e1e',
    border: '1px solid #555', borderRadius: 3, color: '#ddd',
    fontSize: 13, padding: '2px 4px', outline: 'none',
  },
  pageSep:   { color: '#888', fontSize: 13 },
  pageTotal: { color: '#aaa', fontSize: 13, minWidth: 20 },
  zoomLabel: {
    background: '#1e1e1e', border: '1px solid #555', borderRadius: 3,
    color: '#ddd', fontSize: 13, padding: '2px 8px', cursor: 'pointer',
    minWidth: 52, textAlign: 'center',
  },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar: {
    width: 148, background: '#2b2b2b', borderRight: '1px solid #1a1a1a',
    overflowY: 'auto', flexShrink: 0, padding: '8px 0',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  },
  thumbWrap: {
    cursor: 'pointer', borderRadius: 3, overflow: 'hidden',
    border: '2px solid transparent', transition: 'border-color 0.15s',
    position: 'relative',
  },
  thumbActive: { borderColor: '#345FCF' },
  thumbSkeleton: { width: 110, height: 155, background: '#3a3a3a', borderRadius: 2 },
  thumbLabel: {
    textAlign: 'center', color: '#aaa', fontSize: 11, padding: '3px 0 2px',
    background: '#2b2b2b',
  },
  canvas: {
    flex: 1, overflowY: 'auto', overflowX: 'auto',
    background: '#505050', padding: '20px 0',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    position: 'relative',
  },
  canvasBlur: { filter: 'blur(12px)', pointerEvents: 'none' },
  pageWrap: {
    marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
    background: '#fff', display: 'inline-block',
  },
  errorBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', marginTop: 80, color: '#ccc', textAlign: 'center',
  },
  loadingBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', marginTop: 80, color: '#aaa',
  },
  statusBar: {
    background: '#345FCF', color: '#e0e8ff', fontSize: 11,
    height: 24, display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', padding: '0 12px', flexShrink: 0,
    userSelect: 'none',
  },
}