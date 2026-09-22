import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { thesesApi, categoriesApi, scanInboxApi } from '../api/admin'
import { citationsApi } from '../api'

const emptyForm = {
  title: '', authors: '', adviser: '', year_published: '',
  category_id: '', pages: '', abstract: '', keywords: '',
}

const SCHOOL = 'Mater Dei College'

/**
 * When a scan arrived, kept short enough to sit on one line beside the size and
 * page count. A full locale timestamp wraps each row onto three lines, and the
 * useful information is almost always "was this the one I just scanned?" — so
 * today's scans show only a time, and older ones a date.
 */
function scannedAtLabel(iso) {
  const when = new Date(iso)
  if (Number.isNaN(when.getTime())) return ''
  const time = when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return when.toDateString() === new Date().toDateString()
    ? time
    : `${when.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`
}

// Mirrors CitationController::generate()'s default formula exactly, so the
// live preview matches what actually gets saved.
function defaultApa({ authors, year_published, title }) {
  if (!authors || !year_published || !title) return ''
  return `${authors} (${year_published}). ${title} [Unpublished thesis]. ${SCHOOL}.`
}
function defaultMla({ authors, year_published, title }) {
  if (!authors || !year_published || !title) return ''
  return `${authors}. "${title}." Unpublished thesis, ${SCHOOL}, ${year_published}.`
}

export default function ThesisUploadPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [pdfFile, setPdfFile] = useState(null)

  // A PDF the scanner already left waiting, chosen instead of browsing for a
  // file. Mutually exclusive with pdfFile — the backend requires exactly one.
  const [scanFile, setScanFile] = useState(null)
  const [scans, setScans] = useState([])
  const [scanState, setScanState] = useState('loading') // loading | ready | unavailable | off
  const [scanError, setScanError] = useState('')
  const [coverFile, setCoverFile] = useState(null)
  const [categories, setCategories] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Live citation preview — recomputed from the form as you type, unless
  // you've edited the text directly, in which case your edit wins.
  const [apaText, setApaText] = useState('')
  const [mlaText, setMlaText] = useState('')
  const [apaEdited, setApaEdited] = useState(false)
  const [mlaEdited, setMlaEdited] = useState(false)

  useEffect(() => {
    categoriesApi.list().then(r => setCategories(r.data || [])).catch(() => {})
  }, [])

  const loadScans = () => {
    setScanState('loading')
    scanInboxApi.list()
      .then(r => {
        const d = r.data || {}
        if (!d.enabled)        { setScanState('off'); return }
        // "Folder unreachable" is kept distinct from "nothing scanned yet".
        // They look the same to a user but mean different things: the first is
        // usually the shared drive not being mounted, and calling it "no scans"
        // sends staff to check the scanner instead of the storage.
        if (d.available === false) { setScanState('unavailable'); setScanError(d.message || ''); return }
        setScans(d.files || [])
        setScanState('ready')
      })
      .catch(() => setScanState('unavailable'))
  }

  useEffect(loadScans, [])

  const discardScan = async (name) => {
    if (!window.confirm(`Discard the scanned file "${name}"? This deletes it from the scan folder.`)) return
    try {
      await scanInboxApi.discard(name)
      if (scanFile?.name === name) setScanFile(null)
      loadScans()
    } catch {
      setError({ message: 'That scan could not be discarded. It may already be gone.' })
    }
  }

  useEffect(() => { if (!apaEdited) setApaText(defaultApa(form)) }, [form.authors, form.year_published, form.title, apaEdited])
  useEffect(() => { if (!mlaEdited) setMlaText(defaultMla(form)) }, [form.authors, form.year_published, form.title, mlaEdited])

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!pdfFile && !scanFile) {
      setError({ message: 'Attach a PDF, or choose one of the scanned files waiting.' })
      return
    }
    setError(null); setSubmitting(true)
    try {
      const data = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v != null) data.append(k, v) })
      // Exactly one of these. A scan is named rather than uploaded — the file
      // is already on the server's storage, so sending it up from the browser
      // would mean downloading and re-uploading the staff member's own scan.
      if (scanFile) data.append('scan_file', scanFile.name)
      else          data.append('pdf_file', pdfFile)
      if (coverFile) data.append('cover_image', coverFile)
      const res = await thesesApi.create(data)
      const newId = res.data?.id

      // Persist the citation preview: generate() creates the default APA/MLA
      // rows, then any text the staff member edited away from the computed
      // default gets saved over it — so the edit made here doesn't need a
      // separate trip through the Edit page to take effect.
      if (newId && (apaEdited || mlaEdited)) {
        try {
          await citationsApi.generate(newId)
          const list = (await citationsApi.list(newId)).data || []
          const apaRow = list.find(c => c.format_type === 'APA')
          const mlaRow = list.find(c => c.format_type === 'MLA')
          if (apaEdited && apaRow) await citationsApi.update(newId, apaRow.id, { citation_text: apaText })
          if (mlaEdited && mlaRow) await citationsApi.update(newId, mlaRow.id, { citation_text: mlaText })
        } catch { /* thesis is already created; citation text can still be fixed on the Edit page */ }
      }

      setSuccess(true)
      // Land on the edit page so staff can review/keep customizing citations.
      // A PDF the viewer can't open still uploads successfully by design, so
      // the warning rides along to the edit page — the one screen with a
      // Replace File control, i.e. where it can actually be acted on. It is
      // carried in navigation state rather than shown here because this page
      // redirects away after 900ms, which isn't long enough to read it.
      const viewWarning = res.data?.view_warning || null
      setTimeout(
        () => navigate(
          newId ? `/admin/theses/${newId}/edit` : '/admin/collections',
          viewWarning ? { state: { viewWarning } } : undefined,
        ),
        900,
      )
    } catch (err) {
      const errs = err?.response?.data?.errors
      setError({ message: errs ? Object.values(errs).flat().join(' ') :
                  (err?.response?.data?.message || 'Upload failed.') })
    } finally { setSubmitting(false) }
  }

  return (
    <main className="content">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/admin">Dashboard</Link> <span>›</span>
            <Link to="/admin/collections">Collection Management</Link> <span>›</span>
            Upload Item
          </div>
          <div className="page-title">Upload New Item</div>
          <div className="page-subtitle">Add a new item to the special collections repository.</div>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/admin/collections')}>
          <i className="fas fa-arrow-left"></i> Cancel
        </button>
      </div>

      <div className="notice-banner">
        <i className="fas fa-info-circle"></i>
        <span>Files must be in PDF format. Max size 150 MB. The backend runs OCR and validation automatically.</span>
      </div>

      {error && (
        <div className="notice-banner warning" style={{ marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle"></i> <span>{error.message}</span>
        </div>
      )}
      {success && (
        <div className="notice-banner success" style={{ marginBottom: 16, background: '#E6F4EA', borderLeft: '4px solid #2BB673' }}>
          <i className="fas fa-check-circle" style={{ color: '#2BB673' }}></i>
          {/* The document is still being read at this point, so promising a
              finished record would be untrue for a scanned thesis. */}
          <span>Item uploaded — the document is being read in the background. Redirecting…</span>
        </div>
      )}

      <form onSubmit={submit}>
        <div className="panel-grid-2">
          <div>
            <div className="panel">
              <div className="panel-header"><div className="panel-title">Item Information</div></div>
              <div className="panel-body">
                <div className="form-group">
                  <label className="form-label">Title <span className="req">*</span></label>
                  <input type="text" className="form-control" required
                         value={form.title} onChange={e => update('title', e.target.value)}
                         placeholder="Enter the full title" />
                </div>
                <div className="form-group">
                  <label className="form-label">Author(s) / Creator(s) <span className="req">*</span></label>
                  <input type="text" className="form-control" required
                         value={form.authors} onChange={e => update('authors', e.target.value)}
                         placeholder="e.g. Reyes, Maria C.; Santos, Andrew P." />
                  <small className="text-muted" style={{ fontSize: 11 }}>Separate multiple authors with semicolons</small>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Adviser <span className="req">*</span></label>
                    <input type="text" className="form-control" required
                           value={form.adviser} onChange={e => update('adviser', e.target.value)}
                           placeholder="e.g. Engr. Roberto Aquino" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Year Published <span className="req">*</span></label>
                    <input type="number" className="form-control" required min="1900" max="2030"
                           value={form.year_published} onChange={e => update('year_published', e.target.value)}
                           placeholder="2026" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category / Department <span className="req">*</span></label>
                    <select className="form-control" required
                            value={form.category_id} onChange={e => update('category_id', e.target.value)}>
                      <option value="">— Select Category —</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Number of Pages</label>
                    <input type="number" className="form-control"
                           value={form.pages} onChange={e => update('pages', e.target.value)}
                           placeholder="112" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Abstract</label>
                  <textarea className="form-control" rows="6"
                            value={form.abstract} onChange={e => update('abstract', e.target.value)}
                            placeholder="Enter the abstract, or leave blank to pull it from the PDF automatically…"></textarea>
                </div>
                <div className="form-group">
                  <label className="form-label">Keywords</label>
                  <input type="text" className="form-control"
                         value={form.keywords} onChange={e => update('keywords', e.target.value)}
                         placeholder="e.g. IoT, Smart Classroom, ESP32 — or leave blank to pull from the PDF" />
                  <small className="text-muted" style={{ fontSize: 11 }}>Separate with commas. Left blank, both fields are filled in from the PDF's own Abstract/Keywords section after upload.</small>
                </div>
              </div>
            </div>

            <div className="panel" style={{ marginTop: 16 }}>
              <div className="panel-header"><div className="panel-title">Citation Preview</div></div>
              <div className="panel-body">
                <p className="text-muted" style={{ fontSize: 11.5, marginBottom: 14 }}>
                  Auto-generated from the fields above as you type. Edit either one directly if it needs adjusting —
                  your wording is saved when you upload, no separate step needed.
                </p>
                <div className="form-group">
                  <label className="form-label"><span className="badge badge-info">APA</span></label>
                  <textarea className="form-control" rows="3" value={apaText}
                            placeholder="Fill in Title, Author(s), and Year to preview"
                            onChange={e => { setApaText(e.target.value); setApaEdited(true) }}></textarea>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label"><span className="badge badge-info">MLA</span></label>
                  <textarea className="form-control" rows="3" value={mlaText}
                            placeholder="Fill in Title, Author(s), and Year to preview"
                            onChange={e => { setMlaText(e.target.value); setMlaEdited(true) }}></textarea>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">PDF File</div>
                {scanState === 'ready' && scans.length > 0 && (
                  <button type="button" className="btn btn-secondary btn-sm"
                          onClick={loadScans} title="Check the scan folder again">
                    <i className="fas fa-rotate"></i> Refresh
                  </button>
                )}
              </div>
              <div className="panel-body">

                {/* Waiting scans come first: if the scanner has just produced
                    the file, picking it here is the whole point of the feature
                    and browsing for it would be the slower path. */}
                {scanState === 'ready' && scans.length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                      <i className="fas fa-print" style={{ color:'var(--primary-blue)' }}></i>
                      <b style={{ fontSize:13 }}>
                        {scans.length} scanned {scans.length === 1 ? 'file' : 'files'} waiting
                      </b>
                    </div>

                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {scans.map(s => {
                        const chosen = scanFile?.name === s.name
                        return (
                          <div key={s.name}
                               style={{
                                 display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                                 border:`1px solid ${chosen ? 'var(--primary-blue)' : 'var(--border-light)'}`,
                                 background: chosen ? 'var(--info-bg)' : 'var(--bg-white)',
                                 borderRadius:8,
                               }}>
                            <button type="button"
                                    onClick={() => { setScanFile(chosen ? null : s); setPdfFile(null) }}
                                    style={{
                                      flex:1, display:'flex', alignItems:'center', gap:10,
                                      background:'none', border:'none', padding:0, cursor:'pointer',
                                      textAlign:'left', color:'inherit', font:'inherit',
                                    }}>
                              <i className={`fas ${chosen ? 'fa-circle-check' : 'fa-file-pdf'}`}
                                 style={{ color: chosen ? 'var(--primary-blue)' : 'var(--danger)', fontSize:16 }}></i>
                              <span style={{ minWidth:0 }}>
                                <span style={{ display:'block', fontWeight:500, fontSize:13, overflow:'hidden',
                                               textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                  {s.name}
                                </span>
                                <span className="text-muted" style={{ fontSize:11 }}>
                                  {(s.size / 1024 / 1024).toFixed(1)} MB
                                  {s.pages ? ` · ${s.pages} page${s.pages === 1 ? '' : 's'}` : ''}
                                  {' · '}{scannedAtLabel(s.scanned_at)}
                                </span>
                              </span>
                            </button>
                            <button type="button" className="btn-icon" title="Discard this scan"
                                    onClick={() => discardScan(s.name)}
                                    style={{ background:'none', border:'none', cursor:'pointer',
                                             color:'var(--text-muted)', padding:4 }}>
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    <div style={{ display:'flex', alignItems:'center', gap:10, margin:'16px 0 4px' }}>
                      <span style={{ flex:1, height:1, background:'var(--border-light)' }}></span>
                      <span className="text-muted" style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em' }}>or</span>
                      <span style={{ flex:1, height:1, background:'var(--border-light)' }}></span>
                    </div>
                  </div>
                )}

                {scanState === 'unavailable' && (
                  <div className="notice-banner warning" style={{ marginBottom:14 }}>
                    <i className="fas fa-triangle-exclamation"></i>
                    <span>{scanError || 'The scan folder cannot be reached, so scanned files are not listed. You can still attach a PDF below.'}</span>
                  </div>
                )}

                <label className="file-drop" style={{ display: 'block' }}>
                  <input type="file" accept="application/pdf" style={{ display: 'none' }}
                         onChange={e => { setPdfFile(e.target.files?.[0] || null); setScanFile(null) }} />
                  {pdfFile ? (
                    <>
                      <i className="fas fa-file-pdf" style={{ color: 'var(--danger)' }}></i>
                      <p><b>{pdfFile.name}</b></p>
                      <p className="file-hint">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB — click to replace</p>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-cloud-upload-alt"></i>
                      <p>Click to browse or drag &amp; drop your PDF</p>
                      <p className="file-hint">PDF only · Max 150 MB</p>
                    </>
                  )}
                </label>

                {scanFile && (
                  <p className="text-muted" style={{ fontSize:11, marginTop:10 }}>
                    Using the scanned file <b>{scanFile.name}</b>. It leaves the scan folder once this item is saved.
                  </p>
                )}
              </div>
            </div>

            <div className="panel" style={{ marginTop: 16 }}>
              <div className="panel-header"><div className="panel-title">Cover Image (optional)</div></div>
              <div className="panel-body">
                <label className="file-drop" style={{ display: 'block', padding: 20 }}>
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                         onChange={e => setCoverFile(e.target.files?.[0] || null)} />
                  {coverFile ? (
                    <><i className="fas fa-image"></i><p><b>{coverFile.name}</b></p></>
                  ) : (
                    <><i className="fas fa-image"></i><p>Optional cover image</p><p className="file-hint">Max 2 MB</p></>
                  )}
                </label>
              </div>
            </div>

            <div className="panel" style={{ marginTop: 16 }}>
              <div className="panel-body">
                <button type="submit" className="btn btn-primary" disabled={submitting}
                        style={{ width: '100%', justifyContent: 'center' }}>
                  <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
                  {submitting ? ' Uploading…' : ' Upload Item'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/collections')}
                        style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </main>
  )
}