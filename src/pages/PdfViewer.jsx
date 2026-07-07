import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import api from '../api/axios'
import Watermark from '../components/Watermark'

// Point react-pdf at the bundled worker so we don't need a CDN.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

// Secure PDF viewer. Talks to GET /api/theses/serve/{token}, which returns
// a PDF that has already been server-side watermarked with the viewer's
// identity. On top of that we:
//   - overlay a CSS watermark (extra visible layer for screenshots)
//   - disable right-click, copy, print, drag, and dev-tool shortcuts
//   - blur the content when the tab loses focus so screen-recording
//     software captures a blur instead of the text
// None of these fully "prevent" a determined attacker, but together they
// deter casual leaks and make sure any leaked copy is traceable.

export default function PdfViewer() {
  const { token } = useParams()
  const [params]  = useSearchParams()
  const thesisId  = params.get('thesis') || '?'
  const nav       = useNavigate()

  const [pdfBlobUrl, setBlobUrl] = useState(null)
  const [numPages, setNumPages]  = useState(0)
  const [zoom, setZoom]          = useState(1)
  const [blur, setBlur]          = useState(false)
  const [error, setError]        = useState(null)
  const containerRef = useRef(null)

  // Fetch the PDF as a blob so it never lives at a guessable URL and so
  // we can revoke it when the component unmounts.
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
        // Axios can't auto-parse error JSON when responseType is 'blob',
        // so the error body comes back as a Blob. Read it manually to
        // surface the backend's actual message instead of always showing
        // the generic fallback.
        if (blob instanceof Blob) {
          try {
            const text = await blob.text()
            const parsed = JSON.parse(text)
            if (parsed?.message) msg = parsed.message
          } catch {
            // not JSON — keep the default message
          }
        }
        setError(msg)
      })

    return () => {
      cancelled = true
      if (revokeUrl) URL.revokeObjectURL(revokeUrl)
    }
  }, [token])

  // Global handlers that discourage the obvious exfiltration paths.
  useEffect(() => {
    const stop = (e) => { e.preventDefault(); e.stopPropagation() }

    const onKey = (e) => {
      const k = e.key.toLowerCase()
      // Ctrl/Cmd + P/S/C, PrintScreen
      if ((e.ctrlKey || e.metaKey) && ['p', 's', 'c'].includes(k)) stop(e)
      if (k === 'printscreen') {
        // Best-effort: wipe clipboard so a paste after PrintScreen loses the image.
        navigator.clipboard?.writeText('TIPIGANAN — screenshots are disabled.').catch(() => {})
        stop(e)
      }
      // F12 / Ctrl+Shift+I (devtools)
      if (k === 'f12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && k === 'i')) stop(e)
    }

    const onBlur    = () => setBlur(true)
    const onFocus   = () => setBlur(false)
    const onVisible = () => setBlur(document.hidden)

    document.addEventListener('keydown',       onKey,     { capture: true })
    document.addEventListener('contextmenu',   stop,      { capture: true })
    document.addEventListener('copy',          stop,      { capture: true })
    document.addEventListener('cut',           stop,      { capture: true })
    document.addEventListener('dragstart',     stop,      { capture: true })
    window.addEventListener('beforeprint',     stop)
    window.addEventListener('blur',            onBlur)
    window.addEventListener('focus',           onFocus)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      document.removeEventListener('keydown',     onKey,     { capture: true })
      document.removeEventListener('contextmenu', stop,      { capture: true })
      document.removeEventListener('copy',        stop,      { capture: true })
      document.removeEventListener('cut',         stop,      { capture: true })
      document.removeEventListener('dragstart',   stop,      { capture: true })
      window.removeEventListener('beforeprint',   stop)
      window.removeEventListener('blur',          onBlur)
      window.removeEventListener('focus',         onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const file = useMemo(() => pdfBlobUrl ? { url: pdfBlobUrl } : null, [pdfBlobUrl])

  return (
    <div className="viewer-shell">
      <div className="viewer-topbar">
        <button className="btn btn-secondary" onClick={() => nav(-1)}>
          <i className="fas fa-arrow-left" /> Back
        </button>

        <div className="viewer-title">
          <i className="fas fa-lock" /> Secure PDF Viewer — Thesis #{thesisId}
        </div>

        <div className="viewer-tools">
          <button className="btn btn-ghost" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2)))} title="Zoom out">
            <i className="fas fa-minus" />
          </button>
          <span className="zoom-label">{Math.round(zoom * 100)}%</span>
          <button className="btn btn-ghost" onClick={() => setZoom(z => Math.min(2.5, +(z + 0.1).toFixed(2)))} title="Zoom in">
            <i className="fas fa-plus" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={'viewer-canvas' + (blur ? ' is-blurred' : '')}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Watermark thesisId={thesisId} />

        {error && <div className="viewer-error">{error}</div>}

        {!error && !file && <div className="viewer-loading">Loading secure document…</div>}

        {file && (
          <Document
            file={file}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={() => setError('Could not load the PDF.')}
            loading={<div className="viewer-loading">Decrypting…</div>}
          >
            {Array.from({ length: numPages }, (_, i) => (
              <div key={i} className="viewer-page-wrap">
                <Page
                  pageNumber={i + 1}
                  scale={zoom}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
              </div>
            ))}
          </Document>
        )}
      </div>

      <div className="viewer-footer">
        <i className="fas fa-shield-alt" />
        &nbsp;Watermarked for your account. Downloading, printing, copying, and screenshots are disabled.
      </div>
    </div>
  )
}