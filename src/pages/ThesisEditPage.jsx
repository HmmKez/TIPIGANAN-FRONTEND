import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { thesesApi, categoriesApi } from '../api/admin'
import { citationsApi } from '../api'
import { useToast } from '../components/Toast'

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
    </main>
  )
}
