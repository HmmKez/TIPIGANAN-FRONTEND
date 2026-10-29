import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { thesesApi, categoriesApi, scanInboxApi } from '../api/admin'
import { citationsApi } from '../api'
import ConfirmModal from '../components/ConfirmModal'

// One existing item a new upload may repeat: its title (opening in a new tab,
// so the half-filled form is not lost), year, authors, and status if it is not
// plainly active.
function DupLink({ m }) {
  return (
    <>
      <Link to={`/theses/${m.id}`} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>{m.title}</Link>
      {m.year ? ` (${m.year})` : ''}
      {m.authors ? <span style={{ color: 'var(--text-muted)' }}> — {m.authors}</span> : null}
      {m.status && m.status !== 'active' ? <span className={`badge badge-${m.status}`} style={{ marginLeft: 6 }}>{m.status}</span> : null}
    </>
  )
}

const emptyForm = {
  title: '', authors: '', adviser: '', year: '',
  category_id: '', pages: '', abstract: '', keywords: '',
}

const SCHOOL = 'Mater Dei College'

/**
 * When a scan arrived, kept short enough to sit on one line beside the size and
 * page count. A full locale timestamp wraps each row onto three lines, and the
 * useful information is almost always "was this the one I just scanned?" — so
 * today's scans show only a time, and older ones a date.
 */
/** "36 KB" rather than "0.0 MB", which reads as an empty or broken file. */
function fileSizeLabel(bytes) {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

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
// The year is optional, so a citation without one writes "n.d." (no date),
// as APA and MLA both do. Same text the server generates (CitationController).
function defaultApa({ authors, year, title }) {
  if (!authors || !title) return ''
  return `${authors} (${year || 'n.d.'}). ${title} [Unpublished thesis]. ${SCHOOL}.`
}
function defaultMla({ authors, year, title }) {
  if (!authors || !title) return ''
  // "n.d." already ends in a full stop — no second one after it.
  return `${authors}. "${title}." Unpublished thesis, ${SCHOOL}, ${year ? `${year}.` : 'n.d.'}`
}

export default function ThesisUploadPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [pdfFile, setPdfFile] = useState(null)

  // A PDF the scanner already left waiting, chosen instead of browsing for a
  // file. Mutually exclusive with pdfFile — the backend requires exactly one.
  const [scanFile, setScanFile] = useState(null)
  const [scans, setScans] = useState([])
  // Everything waiting in the folder. Can exceed scans.length, which is capped
  // to the newest 100 - so the heading counts this, not the rows on screen.
  const [scanTotal, setScanTotal] = useState(0)
  const [scanState, setScanState] = useState('loading') // loading | ready | unavailable | off
  // The scan awaiting confirmation before it is discarded. The whole entry,
  // not just its name, so the confirmation can show its size, page count and
  // time - the details that tell one scan from another.
  const [confirmDiscard, setConfirmDiscard] = useState(null)
  // Possible duplicates: same title and at least one author in common. Shown
  // live as staff type, and asked about once more if they submit anyway.
  const [dupMatches, setDupMatches] = useState([])
  const [confirmDup, setConfirmDup] = useState(null)
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
        setScanTotal(d.total ?? (d.files || []).length)
        setScanState('ready')
      })
      .catch(() => setScanState('unavailable'))
  }

  useEffect(loadScans, [])

  /**
   * Open a waiting scan in a new tab so staff can see which thesis it is.
   * Scanner file names ("ScanSnap_2026-09-22_09-14-03.pdf") say nothing about
   * the contents, so with several waiting this is the only way to tell them
   * apart before filing one.
   *
   * Same approach as the edit page's file preview: the endpoint needs the
   * login token, so a plain link can't open it. The blank tab is opened
   * synchronously inside the click so the popup blocker doesn't eat it after
   * the download.
   */
  const viewScan = async (name) => {
    const w = window.open('', '_blank')
    try {
      const res = await scanInboxApi.preview(name)
      const url = URL.createObjectURL(res.data)
      if (w) w.location = url
      else window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      if (w) w.close()
      setError({ message: `"${name}" could not be opened. It may have been filed or discarded already — try Refresh.` })
    }
  }

  /**
   * Runs only after the confirmation screen. Discarding deletes the file from
   * the scan folder for good - there is no bin to restore it from - so it is
   * never done straight from the row's button.
   *
   * The dialog is closed before the request goes out, so a second click
   * during a slow response cannot send a second delete.
   */
  const discardScanNow = async () => {
    const scan = confirmDiscard
    setConfirmDiscard(null)
    if (!scan) return
    try {
      await scanInboxApi.discard(scan.name)
      if (scanFile?.name === scan.name) setScanFile(null)
      loadScans()
    } catch {
      setError({ message: 'That scan could not be discarded. It may already be gone.' })
    }
  }

  useEffect(() => { if (!apaEdited) setApaText(defaultApa(form)) }, [form.authors, form.year, form.title, apaEdited])
  useEffect(() => { if (!mlaEdited) setMlaText(defaultMla(form)) }, [form.authors, form.year, form.title, mlaEdited])

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  useEffect(() => {
    const title = form.title.trim(), authors = form.authors.trim()
    if (title.length < 3 || !authors) { setDupMatches([]); return }
    let cancelled = false
    const t = setTimeout(() => {
      thesesApi.duplicateCheck(title, authors)
        .then(r => { if (!cancelled) setDupMatches(r.data?.matches || []) })
        .catch(() => { /* a failed check never blocks typing; the server checks again on save */ })
    }, 600)
    return () => { cancelled = true; clearTimeout(t) }
  }, [form.title, form.authors])

  const submit = async (e, confirmDuplicate = false) => {
    e?.preventDefault?.()
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
      if (confirmDuplicate) data.append('confirm_duplicate', '1')
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
      const body = err?.response?.data || {}
      if (err?.response?.status === 409 && body.reason === 'possible_duplicate') {
        // Not certain - ask, and let staff go ahead.
        setConfirmDup(body.matches || [])
      } else if (err?.response?.status === 409 && body.reason === 'same_file') {
        // Certain - the exact file is already filed. Point at it.
        setError({ message: body.message, duplicateOf: body.duplicate_of })
      } else {
        const errs = body.errors
        setError({ message: errs ? Object.values(errs).flat().join(' ') : (body.message || 'Upload failed.') })
      }
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
          <i className="fas fa-exclamation-triangle"></i>
          <span>
            {error.message}
            {error.duplicateOf && (
              <> <Link to={`/theses/${error.duplicateOf.id}`} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>Open it</Link></>
            )}
          </span>
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
                {dupMatches.length > 0 && (
                  <div className="dup-warning" role="status">
                    <div className="dup-warning-title">
                      <i className="fas fa-clone"></i> Possible duplicate — already in the repository:
                    </div>
                    <ul>
                      {dupMatches.map(m => <li key={m.id}><DupLink m={m} /></li>)}
                    </ul>
                    <div className="dup-warning-note">Same title and at least one author in common. If this is a different item, you can still upload it.</div>
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Adviser</label>
                    <input type="text" className="form-control"
                           value={form.adviser} onChange={e => update('adviser', e.target.value)}
                           placeholder="e.g. Engr. Roberto Aquino" />
                    <small className="text-muted" style={{ fontSize: 11 }}>Optional — leave blank if the item has no adviser (e.g. special collections)</small>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Year</label>
                    <input type="number" className="form-control" min="1950" max={new Date().getFullYear() + 1}
                           value={form.year} onChange={e => update('year', e.target.value)}
                           placeholder="e.g. 2024" />
                    <small className="text-muted" style={{ fontSize: 11 }}>Optional — leave blank to detect it from the PDF</small>
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
                    <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:10, flexWrap:'wrap' }}>
                      <i className="fas fa-print" style={{ color:'var(--primary-blue)' }}></i>
                      <b style={{ fontSize:13 }}>
                        {scanTotal} scanned {scanTotal === 1 ? 'file' : 'files'} waiting
                      </b>
                      {/* Only when the backend capped the list: say so, rather
                          than letting the rows on screen pass for all of them. */}
                      {scanTotal > scans.length && (
                        <span className="text-muted" style={{ fontSize:11 }}>
                          (showing the newest {scans.length})
                        </span>
                      )}
                    </div>

                    {/* A fixed-height box that scrolls, so a backlog of scans can
                        never push the browse box below off the screen. Sized to
                        show about four and a half rows: a row cut off at the
                        bottom is the cue that there are more to scroll to. */}
                    <div style={{
                           display:'flex', flexDirection:'column', gap:8,
                           maxHeight: 300, overflowY:'auto',
                           paddingRight: scans.length > 4 ? 4 : 0,
                         }}>
                      {scans.map(s => {
                        const chosen = scanFile?.name === s.name
                        return (
                          <div key={s.name}
                               data-scan-name={s.name}
                               style={{
                                 flex:'none',
                                 display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                                 border:`1px solid ${chosen ? 'var(--primary-blue)' : 'var(--border-light)'}`,
                                 background: chosen ? 'var(--info-bg)' : 'var(--bg-white)',
                                 borderRadius:8,
                               }}>
                            <button type="button"
                                    title={chosen ? 'Click to unselect' : `Use ${s.name}`}
                                    onClick={() => { setScanFile(chosen ? null : s); setPdfFile(null) }}
                                    style={{
                                      flex:1, minWidth:0, display:'flex', alignItems:'center', gap:10,
                                      background:'none', border:'none', padding:0, cursor:'pointer',
                                      textAlign:'left', color:'inherit', font:'inherit',
                                    }}>
                              <i className={`fas ${chosen ? 'fa-circle-check' : 'fa-file-pdf'}`}
                                 style={{ color: chosen ? 'var(--primary-blue)' : 'var(--danger)', fontSize:16, flex:'none' }}></i>
                              <span style={{ minWidth:0 }}>
                                {/* Up to two lines, broken anywhere, instead of
                                    one truncated line. On a phone the View and
                                    Discard buttons leave about a dozen characters
                                    of room, which cut every name to
                                    "ScanSnap_2026…" - useless for telling scans
                                    apart. Names longer than two lines still clip,
                                    and the full name is in the tooltip. */}
                                <span title={s.name}
                                      style={{ display:'-webkit-box', WebkitBoxOrient:'vertical', WebkitLineClamp:2,
                                               overflow:'hidden', wordBreak:'break-all', fontWeight:500, fontSize:13,
                                               lineHeight:1.35 }}>
                                  {s.name}
                                </span>
                                <span className="text-muted" style={{ fontSize:11 }}>
                                  {fileSizeLabel(s.size)}
                                  {s.pages ? ` · ${s.pages} page${s.pages === 1 ? '' : 's'}` : ''}
                                  {' · '}{scannedAtLabel(s.scanned_at)}
                                </span>
                              </span>
                            </button>

                            {/* Labelled, not icon-only: the row itself already
                                means "use this one", so the two extra actions
                                have to say what they do at a glance. */}
                            <div style={{ display:'flex', flexDirection:'column', gap:4, flex:'none', alignItems:'stretch' }}>
                              <button type="button" className="btn btn-secondary btn-sm"
                                      onClick={() => viewScan(s.name)}
                                      style={{ width:'auto', padding:'3px 10px', fontSize:11.5, whiteSpace:'nowrap' }}>
                                <i className="fas fa-eye"></i> View
                              </button>
                              <button type="button"
                                      onClick={() => setConfirmDiscard(s)}
                                      style={{ background:'none', border:'none', cursor:'pointer', padding:'2px 4px',
                                               fontSize:11, color:'var(--danger)', whiteSpace:'nowrap' }}>
                                <i className="fas fa-trash"></i> Discard
                              </button>
                            </div>
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

      <ConfirmModal
        open={!!confirmDup}
        icon="fa-clone"
        confirmStyle="warning"
        title="Upload anyway?"
        message={confirmDup && (
          <>
            This looks like {confirmDup.length === 1 ? 'an item' : 'items'} already in the repository —
            same title and at least one author in common:
            <span style={{ display: 'block', margin: '10px 0', textAlign: 'left' }}>
              {confirmDup.map(m => <span key={m.id} style={{ display: 'block', marginBottom: 4 }}>• <DupLink m={m} /></span>)}
            </span>
            Upload only if this is a different item.
          </>
        )}
        confirmLabel="Upload anyway"
        onCancel={() => setConfirmDup(null)}
        onConfirm={() => { setConfirmDup(null); submit(null, true) }}
      />

      {/* Discarding deletes the scan from the folder permanently, so it always
          goes through this screen. It names the file AND shows its size, pages
          and time, and offers View, because scanner file names alone rarely
          say which thesis is inside - the wrong one is easy to pick. */}
      <ConfirmModal
        open={!!confirmDiscard}
        icon="fa-trash-alt"
        confirmStyle="danger"
        title="Discard this scan?"
        message={confirmDiscard && (
          <>
            <span style={{ display:'block', fontWeight:600, color:'var(--text-primary)', wordBreak:'break-all' }}>
              {confirmDiscard.name}
            </span>
            <span style={{ display:'block', fontSize:12, marginBottom:12 }}>
              {fileSizeLabel(confirmDiscard.size)}
              {confirmDiscard.pages ? ` · ${confirmDiscard.pages} page${confirmDiscard.pages === 1 ? '' : 's'}` : ''}
              {' · '}scanned {scannedAtLabel(confirmDiscard.scanned_at)}
            </span>
            It will be deleted from the scan folder and <b>cannot be recovered</b>.
            Not sure it's the right one?{' '}
            <button type="button" onClick={() => viewScan(confirmDiscard.name)}
                    style={{ background:'none', border:'none', padding:0, cursor:'pointer',
                             color:'var(--primary-blue)', font:'inherit', textDecoration:'underline' }}>
              View it first
            </button>
          </>
        )}
        confirmLabel="Discard"
        onConfirm={discardScanNow}
        onCancel={() => setConfirmDiscard(null)}
      />
    </main>
  )
}