import { useEffect, useRef, useState } from 'react'
import { settingsApi } from '../api'
import { useAuth } from '../contexts/AuthContext'

// The navbar's "Active Term". The value used to be hardcoded in Layout.jsx, so
// rolling over to a new semester meant editing and redeploying the frontend.
// It now comes from the backend `settings` table, and a Super Admin can change
// it in place by clicking the badge. Everyone else — including guests, who see
// the navbar too — just sees the text.
export default function ActiveTermBadge() {
  const { user } = useAuth()
  const canEdit = user?.role === 'super_admin'

  const [term, setTerm] = useState(null)
  const [semesters, setSemesters] = useState([])
  const [open, setOpen] = useState(false)
  const [semester, setSemester] = useState('')
  const [startYear, setStartYear] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const popoverRef = useRef(null)

  useEffect(() => {
    let mounted = true
    settingsApi.activeTerm()
      .then(res => {
        if (!mounted) return
        setTerm(res.data?.term || null)
        setSemesters(res.data?.semesters || [])
      })
      // The term is decoration, not function — if it fails to load, the navbar
      // should stay quiet rather than throw an error banner over every page.
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  // Close on outside-click and on Escape, the way the notification dropdown
  // beside it already behaves.
  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const startEditing = () => {
    if (!canEdit || !term) return
    setSemester(term.semester)
    setStartYear(String(term.school_year).split('-')[0])
    setError('')
    setOpen(true)
  }

  // A school year always spans two consecutive years, so only the first is
  // asked for and the second is derived. That makes "2026-2029" or a backwards
  // "2027-2026" impossible to type, rather than something to validate after
  // the fact. The backend re-checks it anyway — this is convenience, not trust.
  const endYear = /^\d{4}$/.test(startYear) ? Number(startYear) + 1 : null
  const schoolYear = endYear ? `${startYear}-${endYear}` : ''
  const preview = semester && schoolYear ? `${semester} AY ${schoolYear}` : ''

  const save = async (e) => {
    e.preventDefault()
    if (!preview) {
      setError('Enter a 4-digit starting year.')
      return
    }
    setSaving(true); setError('')
    try {
      const res = await settingsApi.updateActiveTerm({ semester, school_year: schoolYear })
      setTerm(res.data.term)
      setOpen(false)
    } catch (err) {
      const data = err?.response?.data
      setError(data?.errors?.school_year?.[0] || data?.message || 'Could not save the term.')
    } finally {
      setSaving(false)
    }
  }

  if (!term) return null

  return (
    <>
      <span className="term-info"><b style={{ color: 'var(--text-primary)' }}>Active Term:</b></span>

      {canEdit ? (
        <span className="term-edit-wrap term-info" ref={popoverRef}>
          <button
            type="button"
            className="term-badge term-badge-editable"
            onClick={() => (open ? setOpen(false) : startEditing())}
            title="Click to change the active term"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            {term.label}
            <i className="fas fa-pen term-edit-icon" aria-hidden="true"></i>
          </button>

          {open && (
            <form className="term-popover" onSubmit={save} role="dialog" aria-label="Change active term">
              <div className="term-popover-title">Change Active Term</div>

              <label className="term-field">
                <span>Semester</span>
                <select value={semester} onChange={(e) => setSemester(e.target.value)}>
                  {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              <label className="term-field">
                <span>School year starts</span>
                <input
                  type="number"
                  value={startYear}
                  onChange={(e) => setStartYear(e.target.value)}
                  min="2000"
                  max="2100"
                  step="1"
                  placeholder="2026"
                />
              </label>

              <div className="term-preview">
                {preview
                  ? <>Will show as <b>{preview}</b></>
                  : <span className="term-preview-empty">Enter a 4-digit starting year.</span>}
              </div>

              {error && <div className="term-error">{error}</div>}

              <div className="term-actions">
                <button type="button" className="btn btn-secondary btn-sm"
                        onClick={() => setOpen(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !preview}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </span>
      ) : (
        <span className="term-badge term-info">{term.label}</span>
      )}
    </>
  )
}
