import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { thesesApi, categoriesApi } from '../api/admin'

const emptyForm = {
  title: '', authors: '', adviser: '', year_published: '',
  category_id: '', pages: '', abstract: '', keywords: '',
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

  useEffect(() => {
    categoriesApi.list().then(r => setCategories(r.data || [])).catch(() => {})
  }, [])

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
      setSuccess(true)
      setTimeout(() => navigate(res.data?.id ? `/theses/${res.data.id}` : '/admin/collections'), 900)
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
        <span>Files must be in PDF format. Max size 50 MB. The backend runs OCR and validation automatically.</span>
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
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                  <label className="form-label">Abstract <span className="req">*</span></label>
                  <textarea className="form-control" rows="6" required
                            value={form.abstract} onChange={e => update('abstract', e.target.value)}
                            placeholder="Enter the abstract…"></textarea>
                </div>
                <div className="form-group">
                  <label className="form-label">Keywords</label>
                  <input type="text" className="form-control"
                         value={form.keywords} onChange={e => update('keywords', e.target.value)}
                         placeholder="e.g. IoT, Smart Classroom, ESP32" />
                  <small className="text-muted" style={{ fontSize: 11 }}>Separate with commas</small>
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
                      <p className="file-hint">PDF only · Max 50 MB</p>
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
