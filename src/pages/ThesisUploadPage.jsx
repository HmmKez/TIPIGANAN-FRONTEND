import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { thesesApi, categoriesApi } from '../api/admin'
import { citationsApi } from '../api'

const emptyForm = {
  title: '', authors: '', adviser: '', year_published: '',
  category_id: '', pages: '', abstract: '', keywords: '',
}

const SCHOOL = 'Mater Dei College'

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

  useEffect(() => { if (!apaEdited) setApaText(defaultApa(form)) }, [form.authors, form.year_published, form.title, apaEdited])
  useEffect(() => { if (!mlaEdited) setMlaText(defaultMla(form)) }, [form.authors, form.year_published, form.title, mlaEdited])

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!pdfFile) { setError({ message: 'Please attach a PDF file.' }); return }
    setError(null); setSubmitting(true)
    try {
      const data = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v != null) data.append(k, v) })
      data.append('pdf_file', pdfFile)
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
      setTimeout(() => navigate(newId ? `/admin/theses/${newId}/edit` : '/admin/collections'), 900)
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
          <span>Item uploaded! Redirecting…</span>
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
              <div className="panel-header"><div className="panel-title">PDF File</div></div>
              <div className="panel-body">
                <label className="file-drop" style={{ display: 'block' }}>
                  <input type="file" accept="application/pdf" style={{ display: 'none' }}
                         onChange={e => setPdfFile(e.target.files?.[0] || null)} />
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