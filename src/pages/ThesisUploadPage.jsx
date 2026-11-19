import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { thesesApi, categoriesApi } from '../api/admin'
import { useScanFolder, FILED, DISCARDED } from '../utils/scanFolder'
import CategoryPicker from '../components/CategoryPicker'
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

/**
 * The scan folder on this computer: choosing it, reconnecting it, and the
 * scans waiting in it. Chrome and Edge only (see utils/scanFolder.js).
 */
function ScanFolderPanel({ folder, scanFile, onChoose, onView, onDiscard, onMoveToFiled }) {
  const { state, folderName, scans, total, error } = folder
  const bar = (text, action) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12, fontSize: 13 }}>
      <i className="fas fa-folder-open" style={{ color: 'var(--primary-blue)' }}></i>
      <span style={{ flex: 1, minWidth: 0 }}>{text}</span>
      {action}
    </div>
  )

  if (state === 'unsupported') {
    return (
      <div className="notice-banner" style={{ marginBottom: 14 }}>
        <i className="fas fa-circle-info"></i>
        <span>A scan folder needs <b>Chrome</b> or <b>Edge</b>. In this browser, choose the scanned PDF below.</span>
      </div>
    )
  }
  if (state === 'loading') return bar(<span className="text-muted">Opening the scan folder…</span>)
  // Text above, button below: side by side, the sentence was squeezed into a
  // narrow column next to the button in this side panel.
  const prompt = (text, button) => (
    <div style={{ marginBottom: 16 }}>
      <p style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 }}>
        <i className="fas fa-folder-open" style={{ color: 'var(--primary-blue)', marginTop: 3 }}></i>
        <span>{text}</span>
      </p>
      {button}
      <Or />
    </div>
  )
  if (state === 'none') {
    return prompt(
      <>Choose the folder on this computer where the scanner saves its PDFs. New scans then appear here.</>,
      <button type="button" className="btn btn-primary btn-sm" onClick={folder.choose}>
        <i className="fas fa-folder-plus"></i> Choose scan folder
      </button>,
    )
  }
  if (state === 'needs-permission') {
    return prompt(
      <>Scan folder: <b>{folderName}</b>. The browser asks to allow access again.</>,
      <button type="button" className="btn btn-primary btn-sm" onClick={folder.reconnect}>
        <i className="fas fa-plug"></i> Reconnect
      </button>,
    )
  }
  if (state === 'error') {
    return (
      <div style={{ marginBottom: 16 }}>
        <div className="notice-banner warning" style={{ marginBottom: 10 }}>
          <i className="fas fa-triangle-exclamation"></i><span>{error}</span>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={folder.choose}>
          <i className="fas fa-folder-open"></i> Choose scan folder
        </button>
        <Or />
      </div>
    )
  }

  // ready
  return (
    <div style={{ marginBottom: 18 }}>
      {bar(<>Scan folder: <b>{folderName}</b></>,
        <button type="button" onClick={folder.choose} style={LINKISH}>Change folder</button>)}

      {scans.length === 0 ? (
        <p className="text-muted" style={{ fontSize: 12.5, margin: '0 0 4px' }}>
          No scans waiting. New ones appear here by themselves; the folder is checked every 30 seconds.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <i className="fas fa-print" style={{ color: 'var(--primary-blue)' }}></i>
            <b style={{ fontSize: 13 }}>{total} scanned {total === 1 ? 'file' : 'files'} waiting</b>
            {total > scans.length && <span className="text-muted" style={{ fontSize: 11 }}>(showing the newest {scans.length})</span>}
          </div>

          {/* A fixed-height box that scrolls, so a backlog of scans can never
              push the browse box below off the screen. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto', paddingRight: scans.length > 4 ? 4 : 0 }}>
            {scans.map(s => {
              const chosen = scanFile?.name === s.name
              const usable = s.settled && !s.known
              return (
                <div key={s.name} data-scan-name={s.name}
                     style={{
                       flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                       border: `1px solid ${chosen ? 'var(--primary-blue)' : 'var(--border-light)'}`,
                       background: chosen ? 'var(--info-bg)' : 'var(--bg-white)', borderRadius: 8,
                       opacity: usable ? 1 : 0.85,
                     }}>
                  <button type="button" disabled={!usable}
                          title={!s.settled ? 'Still being saved by the scanner' : s.known ? 'Already in the repository' : (chosen ? 'Click to unselect' : `Use ${s.name}`)}
                          onClick={() => onChoose(s)}
                          style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none',
                                   padding: 0, cursor: usable ? 'pointer' : 'default', textAlign: 'left', color: 'inherit', font: 'inherit' }}>
                    <i className={`fas ${chosen ? 'fa-circle-check' : !s.settled ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}
                       style={{ color: chosen ? 'var(--primary-blue)' : 'var(--danger)', fontSize: 16, flex: 'none' }}></i>
                    <span style={{ minWidth: 0 }}>
                      <span title={s.name}
                            style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden',
                                     wordBreak: 'break-all', fontWeight: 500, fontSize: 13, lineHeight: 1.35 }}>
                        {s.name}
                      </span>
                      <span className="text-muted" style={{ fontSize: 11 }}>
                        {!s.settled ? 'Still saving…' : <>
                          {fileSizeLabel(s.size)}
                          {s.pages ? ` · ${s.pages} page${s.pages === 1 ? '' : 's'}` : ''}
                          {' · '}{scannedAtLabel(s.scanned_at)}
                        </>}
                      </span>
                      {s.known && (
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--warning)', marginTop: 2 }}>
                          <i className="fas fa-circle-check"></i> Already in the repository as <b>{s.known.title}</b>
                        </span>
                      )}
                    </span>
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 'none', alignItems: 'stretch' }}>
                    <button type="button" className="btn btn-secondary btn-sm" disabled={!s.settled} onClick={() => onView(s)}
                            style={{ width: 'auto', padding: '3px 10px', fontSize: 11.5, whiteSpace: 'nowrap' }}>
                      <i className="fas fa-eye"></i> View
                    </button>
                    {s.known ? (
                      <button type="button" onClick={() => onMoveToFiled(s)}
                              style={{ ...LINKISH, fontSize: 11, color: 'var(--primary-blue)', padding: '2px 4px', whiteSpace: 'nowrap' }}>
                        <i className="fas fa-box-archive"></i> Move to Filed
                      </button>
                    ) : (
                      <button type="button" disabled={!s.settled} onClick={() => onDiscard(s)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: 11,
                                       color: 'var(--danger)', whiteSpace: 'nowrap' }}>
                        <i className="fas fa-trash"></i> Discard
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
      <Or />
    </div>
  )
}

const LINKISH = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--primary-blue)', fontFamily: 'inherit', fontSize: 12.5, textDecoration: 'underline' }

function Or() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 4px' }}>
      <span style={{ flex: 1, height: 1, background: 'var(--border-light)' }}></span>
      <span className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>or</span>
      <span style={{ flex: 1, height: 1, background: 'var(--border-light)' }}></span>
    </div>
  )
}

export default function ThesisUploadPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [pdfFile, setPdfFile] = useState(null)

  // The scan folder on this computer (utils/scanFolder.js), and the scan
  // chosen from it instead of browsing for a file. Mutually exclusive with
  // pdfFile: a chosen scan is uploaded exactly like a PDF picked by hand.
  const folder = useScanFolder()
  const [scanFile, setScanFile] = useState(null)
  // The scan awaiting confirmation before it is discarded. The whole entry,
  // not just its name, so the confirmation can show its size, page count and
  // time - the details that tell one scan from another.
  const [confirmDiscard, setConfirmDiscard] = useState(null)
  // Possible duplicates: same title and at least one author in common. Shown
  // live as staff type, and asked about once more if they submit anyway.
  const [dupMatches, setDupMatches] = useState([])
  const [confirmDup, setConfirmDup] = useState(null)
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

  // A chosen scan that has since been filed, discarded or moved away is
  // unchosen, so the form never uploads a file that is no longer listed.
  useEffect(() => {
    if (scanFile && !folder.scans.some(x => x.name === scanFile.name)) setScanFile(null)
  }, [folder.scans]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Open a waiting scan in a new tab so staff can see which thesis it is.
   * Scanner file names ("ScanSnap_2026-09-22_09-14-03.pdf") say nothing about
   * the contents. The file is read straight from this computer's folder.
   */
  const viewScan = async (scan) => {
    const w = window.open('', '_blank')
    try {
      const url = URL.createObjectURL(await folder.fileFor(scan.name))
      if (w) w.location = url
      else window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      if (w) w.close()
      setError({ message: `"${scan.name}" could not be opened. It may have been moved already — try Refresh.` })
    }
  }

  /**
   * Runs only after the confirmation screen. The scan moves into the scan
   * folder's Discarded subfolder; nothing is deleted, so it can be moved back.
   * The dialog closes first, so a second click cannot send a second move.
   */
  const discardScanNow = async () => {
    const scan = confirmDiscard
    setConfirmDiscard(null)
    if (!scan) return
    try {
      await folder.move(scan.name, DISCARDED)
      if (scanFile?.name === scan.name) setScanFile(null)
    } catch {
      setError({ message: 'That scan could not be moved to the Discarded folder. It may already be gone — try Refresh.' })
    }
  }

  /** A scan already in the repository: tidy it away without filing it again. */
  const moveToFiled = async (scan) => {
    try { await folder.move(scan.name, FILED) }
    catch { setError({ message: `"${scan.name}" could not be moved to the Filed folder.` }) }
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
      // A chosen scan is read fresh from this computer's folder and uploaded
      // exactly like a PDF chosen by hand: same size limit, duplicate check,
      // reading of the text, and audit entry.
      data.append('pdf_file', scanFile ? await folder.fileFor(scanFile.name) : pdfFile)
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

      // Only now that it is saved does the scan leave the folder, into Filed.
      // If that fails, the item is still saved; the scan stays and is marked
      // "Already in the repository" next time, with a Move to Filed button.
      if (scanFile) {
        try { await folder.move(scanFile.name, FILED) } catch { /* see above */ }
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
            <Link to="/admin/collections">Item Management</Link> <span>›</span>
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
                  <CategoryPicker categories={categories} value={form.category_id}
                                  onChange={id => update('category_id', id)} />
                </div>
                <div className="form-row">
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
                {folder.state === 'ready' && (
                  <button type="button" className="btn btn-secondary btn-sm"
                          onClick={folder.refresh} title="Check the scan folder again">
                    <i className="fas fa-rotate"></i> Refresh
                  </button>
                )}
              </div>
              <div className="panel-body">

                <ScanFolderPanel folder={folder} scanFile={scanFile}
                                 onChoose={s => { setScanFile(scanFile?.name === s.name ? null : s); setPdfFile(null) }}
                                 onView={viewScan} onDiscard={setConfirmDiscard} onMoveToFiled={moveToFiled} />

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
                    Using the scanned file <b>{scanFile.name}</b>. Once this item is saved, it moves into the scan folder's <b>{FILED}</b> folder.
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

      {/* Discarding moves the scan into the Discarded folder, and always goes
          through this screen. It names the file AND shows its size, pages
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
            It will be moved into the scan folder's <b>{DISCARDED}</b> folder. Nothing is deleted, so it can be moved back.
            Not sure it's the right one?{' '}
            <button type="button" onClick={() => viewScan(confirmDiscard)}
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