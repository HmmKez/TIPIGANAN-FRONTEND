import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { thesesApi, categoriesApi } from '../api/admin'
import { citationsApi } from '../api'
import { useToast } from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'

function daysLeft(dateStr) {
  return Math.max(0, Math.ceil((new Date(dateStr) - new Date()) / 86400000))
}

// A hashed storage filename means nothing to staff — size is the at-a-glance
// "which file is this" signal (two different PDFs almost always differ).
function formatBytes(bytes) {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`
}

const normText = (s) => (s || '').trim()

// How the current file's OCR-detected value compares to what's on the record.
//   stale   — file has nothing, record still has a value (likely from a
//             previously-replaced file that was never refreshed)
//   differs — file has different content than the record
//   match   — they agree
//   none    — both empty, nothing to do
function fieldState(detectedVal, currentVal) {
  const d = normText(detectedVal), c = normText(currentVal)
  if (!d && !c) return 'none'
  if (!d && c) return 'stale'
  return d === c ? 'match' : 'differs'
}

function methodLabel(method) {
  if (method === 'ocr') return 'Scanned (OCR)'
  if (method === 'digital') return 'Digital text'
  return 'Not detected'
}

const emptyForm = {
  title: '', authors: '', adviser: '', year_published: '',
  category_id: '', pages: '', abstract: '', keywords: '', status: 'active',
}

export default function ThesisEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()

  const [form, setForm] = useState(emptyForm)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Every thesis has exactly one APA and one MLA citation, auto-generated
  // from its metadata — staff can edit the wording but not add extras.
  const [apaCitation, setApaCitation] = useState(null)
  const [mlaCitation, setMlaCitation] = useState(null)
  const [apaText, setApaText] = useState('')
  const [mlaText, setMlaText] = useState('')
  const [citationSaving, setCitationSaving] = useState(null) // 'APA' | 'MLA' | null

  // Replacing/restoring/deleting the underlying PDF
  const [fileVersions, setFileVersions] = useState([])
  const [currentFileSize, setCurrentFileSize] = useState(null)
  const [replacing, setReplacing] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false)
  const [confirmDeleteVersion, setConfirmDeleteVersion] = useState(null)
  const [restoringId, setRestoringId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const fileInputRef = useRef(null)

  // OCR review: what the CURRENT file's OCR detected (never auto-applied to a
  // non-blank field — staff choose whether to apply/clear per field).
  const [detected, setDetected] = useState(null)
  const [extracting, setExtracting] = useState(false)
  const [applyingField, setApplyingField] = useState(null)

  const loadFileVersions = () => {
    thesesApi.listFileVersions(id).then(r => {
      setFileVersions(r.data?.versions || [])
      setCurrentFileSize(r.data?.current?.size ?? null)
    }).catch(() => {})
  }

  // Open a PDF (current file or an archived version) in a new tab so staff can
  // verify its contents. The file endpoints need an auth header, so we can't
  // just point an <a> at them — fetch the blob, then hand the tab a blob URL.
  // The blank tab is opened synchronously inside the click so the popup blocker
  // doesn't eat it after the await.
  const openPdfBlob = async (promise) => {
    const w = window.open('', '_blank')
    try {
      const res = await promise
      const url = URL.createObjectURL(res.data)
      if (w) w.location = url
      else window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      if (w) w.close()
      notify('Could not open the file for preview.', 'error')
    }
  }

  const loadCitations = () => {
    // generate() ensures both rows exist (creating defaults if missing)
    // without overwriting an already-customized citation_text.
    citationsApi.generate(id).then(() => citationsApi.list(id)).then(r => {
      const list = r.data || []
      const apa = list.find(c => c.format_type === 'APA') || null
      const mla = list.find(c => c.format_type === 'MLA') || null
      setApaCitation(apa); setMlaCitation(mla)
      setApaText(apa?.citation_text || '')
      setMlaText(mla?.citation_text || '')
    }).catch(() => {})
  }

  useEffect(() => {
    categoriesApi.list().then(r => setCategories(r.data || [])).catch(() => {})
    loadCitations()
    loadFileVersions()

    setLoading(true)
    thesesApi.get(id)
      .then(r => {
        const t = r.data?.thesis || r.data
        setForm({
          title: t.title || '',
          authors: t.authors || '',
          adviser: t.adviser || '',
          year_published: t.year_published || '',
          category_id: t.category_id || '',
          pages: t.pages || '',
          abstract: t.abstract || '',
          keywords: t.keywords || '',
          status: t.status || 'active',
        })
      })
      .catch(err => setError(err?.response?.data?.message || 'Failed to load thesis.'))
      .finally(() => setLoading(false))
  }, [id])

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setError(null); setSuccess(false); setSaving(true)
    try {
      await thesesApi.update(id, form)
      setSuccess(true)
    } catch (err) {
      const errs = err?.response?.data?.errors
      setError(errs ? Object.values(errs).flat().join(' ') : (err?.response?.data?.message || 'Update failed.'))
    } finally { setSaving(false) }
  }

  const saveCitation = async (format) => {
    const citation = format === 'APA' ? apaCitation : mlaCitation
    const text = format === 'APA' ? apaText : mlaText
    if (!citation) return
    setCitationSaving(format)
    try {
      await citationsApi.update(id, citation.id, { citation_text: text })
      notify(`${format} citation updated.`, 'success')
      loadCitations()
    } catch (err) {
      const errs = err?.response?.data?.errors
      notify(errs ? Object.values(errs).flat().join(' ') : (err?.response?.data?.message || 'Save failed.'), 'error')
    } finally { setCitationSaving(null) }
  }

  const pickReplacementFile = () => fileInputRef.current?.click()

  const onFileChosen = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPendingFile(file)
    setConfirmReplaceOpen(true)
  }

  const confirmReplace = async () => {
    setConfirmReplaceOpen(false)
    const file = pendingFile
    setPendingFile(null)
    if (!file) return
    setReplacing(true)
    try {
      const res = await thesesApi.replaceFile(id, file)
      const t = res.data.thesis || res.data
      const d = res.data.detected || null
      // Blank fields were just auto-filled from the new file — reflect that.
      const newAbstract = t.abstract || ''
      const newKeywords = t.keywords || ''
      setForm(prev => ({ ...prev, abstract: newAbstract, keywords: newKeywords }))
      loadFileVersions()

      // Option 2 — warn (don't auto-overwrite) when the new file's detected
      // content differs from, or is missing against, what's still on record
      // (e.g. the previous file's abstract lingering after this replace).
      const flagged = d && (
        ['stale', 'differs'].includes(fieldState(d.abstract, newAbstract)) ||
        ['stale', 'differs'].includes(fieldState(d.keywords, newKeywords))
      )
      if (flagged) {
        setDetected(d)
        notify("File replaced — but the new file's abstract/keywords differ from what's on record. Review below.", 'info')
      } else {
        setDetected(null)
        notify('File replaced. The previous version can be restored below for a limited time.', 'success')
      }
    } catch (err) {
      notify(err?.response?.data?.message || 'Failed to replace the file.', 'error')
    } finally {
      setReplacing(false)
    }
  }

  // Option 3 (light) — re-run OCR on the CURRENT file on demand and open the
  // same review, so stale metadata can be refreshed any time, not only on a
  // replace.
  const runExtract = async () => {
    setExtracting(true)
    try {
      const res = await thesesApi.extractMetadata(id)
      setDetected(res.data)
      notify('Re-extracted from the current file — review the detected details below.', 'info')
    } catch (err) {
      notify(err?.response?.data?.message || 'Could not extract from the current file.', 'error')
    } finally {
      setExtracting(false)
    }
  }

  // Persist a single reviewed field (empty value = clear a stale one). Only
  // ever runs on an explicit staff click, never automatically.
  const applyDetected = async (field, value) => {
    setApplyingField(field)
    try {
      await thesesApi.update(id, { [field]: value })
      setForm(prev => ({ ...prev, [field]: value }))
      const name = field === 'abstract' ? 'Abstract' : 'Keywords'
      notify(`${name} ${value ? 'updated from the current file' : 'cleared'}.`, 'success')
    } catch (err) {
      notify(err?.response?.data?.message || 'Failed to apply the change.', 'error')
    } finally {
      setApplyingField(null)
    }
  }

  const restoreVersion = async (versionId) => {
    setRestoringId(versionId)
    try {
      await thesesApi.restoreFileVersion(id, versionId)
      notify('Previous file version restored.', 'success')
      loadFileVersions()
    } catch (err) {
      notify(err?.response?.data?.message || 'Failed to restore that version.', 'error')
    } finally {
      setRestoringId(null)
    }
  }

  const confirmDeleteVersionNow = async () => {
    const version = confirmDeleteVersion
    setConfirmDeleteVersion(null)
    if (!version) return
    setDeletingId(version.id)
    try {
      await thesesApi.deleteFileVersion(id, version.id)
      notify('Previous version permanently deleted.', 'success')
      loadFileVersions()
    } catch (err) {
      notify(err?.response?.data?.message || 'Failed to delete that version.', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <main className="content"><div className="panel"><div className="panel-body">Loading…</div></div></main>
  }

  return (
    <main className="content">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/admin">Dashboard</Link> <span>›</span>
            <Link to="/admin/collections">Collection Management</Link> <span>›</span>
            Edit Item
          </div>
          <div className="page-title">Edit Item</div>
          <div className="page-subtitle">Update metadata and citations for this collection item.</div>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/admin/collections')}>
          <i className="fas fa-arrow-left"></i> Back to Collections
        </button>
      </div>

      {error && (
        <div className="notice-banner warning" style={{ marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle"></i> <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="notice-banner success" style={{ marginBottom: 16, background: '#E6F4EA', borderLeft: '4px solid #2BB673' }}>
          <i className="fas fa-check-circle" style={{ color: '#2BB673' }}></i>
          <span>Changes saved.</span>
        </div>
      )}

      <form onSubmit={submit}>
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Item Information</div></div>
          <div className="panel-body">
            <div className="form-group">
              <label className="form-label">Title <span className="req">*</span></label>
              <input type="text" className="form-control" required
                     value={form.title} onChange={e => update('title', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Author(s) / Creator(s) <span className="req">*</span></label>
              <input type="text" className="form-control" required
                     value={form.authors} onChange={e => update('authors', e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Adviser <span className="req">*</span></label>
                <input type="text" className="form-control" required
                       value={form.adviser} onChange={e => update('adviser', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Year Published <span className="req">*</span></label>
                <input type="number" className="form-control" required min="1900" max="2030"
                       value={form.year_published} onChange={e => update('year_published', e.target.value)} />
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
                       value={form.pages} onChange={e => update('pages', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Abstract <span className="req">*</span></label>
              <textarea className="form-control" rows="6" required
                        value={form.abstract} onChange={e => update('abstract', e.target.value)}></textarea>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Keywords</label>
                <input type="text" className="form-control"
                       value={form.keywords} onChange={e => update('keywords', e.target.value)}
                       placeholder="Separate with commas" />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={form.status} onChange={e => update('status', e.target.value)}>
                  <option value="active">Active</option>
                  <option value="restricted">Restricted (logged-in users only)</option>
                  <option value="archived">Archived (hidden from everyone)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: 4 }}>
          <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
          {saving ? ' Saving…' : ' Save Changes'}
        </button>
      </form>

      <div className="panel" style={{ marginTop: 24 }}>
        <div className="panel-header">
          <div className="panel-title">
            <i className="fas fa-quote-right" style={{ color: 'var(--primary-blue)', marginRight: 6 }}></i>
            Citations
          </div>
        </div>
        <div className="panel-body">
          <p className="text-muted" style={{ marginBottom: 16, fontSize: 12.5 }}>
            Auto-generated from the item's metadata. You can edit the wording below —
            readers will see your edited text instead of the default when they cite this item.
          </p>

          <div className="form-group">
            <label className="form-label"><span className="badge badge-info">APA</span></label>
            <textarea className="form-control" rows="3" value={apaText}
                      onChange={e => setApaText(e.target.value)}></textarea>
            <button type="button" className="btn btn-sm btn-secondary" style={{ marginTop: 8 }}
                    disabled={citationSaving === 'APA'} onClick={() => saveCitation('APA')}>
              <i className={`fas ${citationSaving === 'APA' ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
              {citationSaving === 'APA' ? ' Saving…' : ' Save APA'}
            </button>
          </div>

          <div className="form-group" style={{ marginTop: 20 }}>
            <label className="form-label"><span className="badge badge-info">MLA</span></label>
            <textarea className="form-control" rows="3" value={mlaText}
                      onChange={e => setMlaText(e.target.value)}></textarea>
            <button type="button" className="btn btn-sm btn-secondary" style={{ marginTop: 8 }}
                    disabled={citationSaving === 'MLA'} onClick={() => saveCitation('MLA')}>
              <i className={`fas ${citationSaving === 'MLA' ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
              {citationSaving === 'MLA' ? ' Saving…' : ' Save MLA'}
            </button>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 24 }}>
        <div className="panel-header">
          <div className="panel-title">
            <i className="fas fa-file-pdf" style={{ color: 'var(--primary-blue)', marginRight: 6 }}></i>
            File
          </div>
        </div>
        <div className="panel-body">
          <p className="text-muted" style={{ marginBottom: 16, fontSize: 12.5 }}>
            Replacing the file keeps the previous version restorable below for a limited time
            before it's permanently deleted — mistakes can still be undone. Use <b>Preview</b>
            {' '}to open any file and confirm which is which before restoring.
          </p>

          {/* The file that's live right now — the reference point for
              "did my restore actually take", so it's always shown. */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            padding: '10px 12px', marginBottom: 16, borderRadius: 6,
            background: 'var(--bg-main)', border: '1px solid var(--border-light)',
          }}>
            <span className="badge badge-info">Current file</span>
            <span className="text-muted" style={{ fontSize: 13 }}>{formatBytes(currentFileSize)}</span>
            <button type="button" className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }}
                    onClick={() => openPdfBlob(thesesApi.previewFile(id))}>
              <i className="fas fa-eye"></i> Preview
            </button>
          </div>

          <input ref={fileInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={onFileChosen} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" disabled={replacing} onClick={pickReplacementFile}>
              <i className={`fas ${replacing ? 'fa-spinner fa-spin' : 'fa-file-upload'}`}></i>
              {replacing ? ' Replacing…' : ' Replace File'}
            </button>
            <button type="button" className="btn btn-secondary" disabled={extracting} onClick={runExtract}
                    title="Re-run text detection on the current file and review what it finds">
              <i className={`fas ${extracting ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'}`}></i>
              {extracting ? ' Checking…' : ' Re-extract from current file'}
            </button>
          </div>

          {/* OCR review panel — appears after a replace whose new file's
              detected content differs from the record, or on demand via the
              button above. Nothing here is applied until staff click. */}
          {detected && (
            <div style={{ marginTop: 16, padding: 14, borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-main)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <i className="fas fa-wand-magic-sparkles" style={{ color: 'var(--primary-blue)' }}></i>
                <strong>Detected in current file</strong>
                <span className="badge badge-info" style={{ marginLeft: 'auto' }}>{methodLabel(detected.method)}</span>
              </div>
              <p className="text-muted" style={{ fontSize: 12, marginBottom: 12 }}>
                Nothing changes until you apply it. <b>Use detected</b> overwrites the field with the text found in the current file;
                {' '}<b>Clear</b> removes a value the current file no longer contains.
              </p>
              {['abstract', 'keywords'].map(field => {
                const st = fieldState(detected[field], form[field])
                return (
                  <div key={field} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="form-label" style={{ margin: 0, textTransform: 'capitalize' }}>{field}</span>
                      {st === 'stale'   && <span className="badge badge-admin">Not in current file</span>}
                      {st === 'differs' && <span className="badge badge-staff">Differs from record</span>}
                      {st === 'match'   && <span className="badge badge-student">Matches record</span>}
                      {st === 'none'    && <span className="badge">Nothing detected</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 6, padding: '8px 10px', maxHeight: 120, overflow: 'auto' }}>
                      {normText(detected[field]) || <em>— nothing detected —</em>}
                    </div>
                    {(st === 'differs' || st === 'stale') && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        {st === 'differs' && (
                          <button type="button" className="btn btn-sm btn-primary" disabled={applyingField === field}
                                  onClick={() => applyDetected(field, detected[field])}>
                            <i className={`fas ${applyingField === field ? 'fa-spinner fa-spin' : 'fa-check'}`}></i> Use detected
                          </button>
                        )}
                        {st === 'stale' && (
                          <button type="button" className="btn btn-sm btn-danger" disabled={applyingField === field}
                                  onClick={() => applyDetected(field, '')}>
                            <i className={`fas ${applyingField === field ? 'fa-spinner fa-spin' : 'fa-eraser'}`}></i> Clear stale value
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setDetected(null)}>Dismiss</button>
            </div>
          )}

          {fileVersions.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div className="form-label" style={{ marginBottom: 8 }}>Previous Versions</div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Replaced</th>
                      <th>By</th>
                      <th>Size</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fileVersions.map(v => (
                      <tr key={v.id}>
                        <td>{new Date(v.replaced_at).toLocaleString()}</td>
                        <td>{v.replacer?.name || '—'}</td>
                        <td>{formatBytes(v.size)}</td>
                        <td>
                          {v.status === 'pending' && (
                            <span className="badge badge-staff">{daysLeft(v.purge_after)}d left to restore</span>
                          )}
                          {v.status === 'restored' && <span className="badge badge-student">Restored</span>}
                          {v.status === 'purged' && <span className="badge badge-admin">Deleted</span>}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {v.size != null && (
                              <button type="button" className="btn btn-sm btn-secondary"
                                      onClick={() => openPdfBlob(thesesApi.previewFileVersion(id, v.id))}>
                                <i className="fas fa-eye"></i> Preview
                              </button>
                            )}
                            {v.status === 'pending' && (
                              <>
                                <button type="button" className="btn btn-sm btn-secondary"
                                        disabled={restoringId === v.id} onClick={() => restoreVersion(v.id)}>
                                  <i className={`fas ${restoringId === v.id ? 'fa-spinner fa-spin' : 'fa-undo'}`}></i>
                                  {' '}Restore
                                </button>
                                <button type="button" className="btn btn-sm btn-danger"
                                        disabled={deletingId === v.id} onClick={() => setConfirmDeleteVersion(v)}>
                                  <i className={`fas ${deletingId === v.id ? 'fa-spinner fa-spin' : 'fa-trash-alt'}`}></i>
                                  {' '}Delete Now
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmReplaceOpen}
        icon="fa-file-upload"
        confirmStyle="primary"
        title="Replace this file?"
        message={`The current file will be archived and restorable for a limited time before permanent deletion. Continue with "${pendingFile?.name || ''}"?`}
        confirmLabel="Replace File"
        onConfirm={confirmReplace}
        onCancel={() => { setConfirmReplaceOpen(false); setPendingFile(null) }}
      />

      <ConfirmModal
        open={!!confirmDeleteVersion}
        icon="fa-trash-alt"
        confirmStyle="danger"
        title="Permanently delete this version?"
        message="This cannot be undone — the file will no longer be restorable."
        confirmLabel="Delete Now"
        onConfirm={confirmDeleteVersionNow}
        onCancel={() => setConfirmDeleteVersion(null)}
      />
    </main>
  )
}
