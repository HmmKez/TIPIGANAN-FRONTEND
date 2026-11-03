import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { schoolRosterApi } from '../api/admin'
import { useAuth } from '../contexts/AuthContext'
import ConfirmModal from '../components/ConfirmModal'
import ActivateAccountPanel from '../components/ActivateAccountPanel'

/**
 * The school's list of everyone allowed to use TIPIGANAN.
 *
 *  - Staff (activate_accounts): Activate an Account, for a person at the desk.
 *  - Super Admin: also the current list, the ID numbers on it, and importing a
 *    new CSV. Importing replaces the whole list. While the list is in use
 *    (SCHOOL_DIRECTORY_DRIVER=csv), only ID numbers on it can be activated or
 *    sign in.
 */
const ROLE_LABEL = { student: 'Students', teacher: 'Teachers', staff: 'Staff', super_admin: 'Super Admins' }

function RoleCounts({ byRole }) {
  return (
    <div className="roster-counts">
      {Object.entries(ROLE_LABEL).map(([k, label]) => (
        <div key={k} className="roster-count"><b>{(byRole?.[k] ?? 0).toLocaleString()}</b><span>{label}</span></div>
      ))}
    </div>
  )
}

// A long list stays folded so the page stays short. A few names are simply shown.
const SHOW_WITHOUT_ASKING = 10

const LINK_BUTTON = { background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }

function Names({ shown, total, children }) {
  const [open, setOpen] = useState(false)
  if (total <= SHOW_WITHOUT_ASKING) return children

  return (
    <>
      <div style={{ marginTop: 6 }}>
        <button type="button" className="roster-toggle" aria-expanded={open} onClick={() => setOpen(o => !o)}
                style={LINK_BUTTON}>
          {open ? 'Hide the names' : (total > shown ? `Show the first ${shown}` : `Show all ${shown}`)}
        </button>
      </div>
      {open && children}
    </>
  )
}

// Who has an account but is not on the current list. Hiding it only shrinks it
// to one line in this browser, and only for this list: it remembers which import
// it was hidden for, so every new import shows it again, in case someone was left
// off by mistake. Browser storage can be unavailable; it then simply stays shown.
const HIDDEN_FOR_KEY = 'tipiganan_not_on_list_hidden_for'

function NotOnListWarning({ people, total, importedAt }) {
  const [hiddenFor, setHiddenFor] = useState(() => {
    try { return localStorage.getItem(HIDDEN_FOR_KEY) } catch { return null }
  })
  const hidden = Boolean(importedAt) && hiddenFor === importedAt
  const accounts = `${total.toLocaleString()} account${total === 1 ? ' is' : 's are'} not on the list`

  const remember = (value) => {
    setHiddenFor(value)
    try {
      if (value) localStorage.setItem(HIDDEN_FOR_KEY, value)
      else localStorage.removeItem(HIDDEN_FOR_KEY)
    } catch { /* Stays as chosen until the page is reloaded. */ }
  }

  if (hidden) {
    return (
      <div className="text-muted" style={{ marginTop: 14, fontSize: 13 }}>
        <i className="fas fa-user-lock" style={{ marginRight: 6 }}></i>
        {accounts} · <button type="button" style={LINK_BUTTON} onClick={() => remember(null)}>Show</button>
      </div>
    )
  }

  return (
    <div className="notice-banner warning" style={{ marginTop: 14, alignItems: 'flex-start' }}>
      <i className="fas fa-user-lock"></i>
      <span style={{ flex: 1 }}>
        <b>{accounts}</b> and cannot sign in:
        <PeopleList people={people} total={total} />
        <DownloadLists lists={[{ fetch: () => schoolRosterApi.downloadNotOnList(), filename: 'school-list-not-on-list.csv' }]} />
      </span>
      <button type="button" style={{ ...LINK_BUTTON, marginLeft: 12 }} onClick={() => remember(importedAt)}>Hide</button>
    </div>
  )
}

function PeopleList({ people, total }) {
  return (
    <Names shown={people.length} total={total}>
      <ul className="roster-people">
        {people.map(p => <li key={p.id_number}><code>{p.id_number}</code> {p.name} <span className="text-muted">· {p.role.replace('_', ' ')}</span></li>)}
      </ul>
      <MoreNote shown={people.length} total={total} />
    </Names>
  )
}

// One button that saves each list as its own CSV, to check in Excel before
// importing. One at a time with a short pause, as browsers can drop files
// started in the same instant.
function DownloadLists({ lists }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState([])

  const download = async () => {
    setBusy(true); setFailed([])
    const missed = []
    for (const list of lists) {
      try {
        const res = await list.fetch()
        const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }))
        const a = document.createElement('a')
        a.href = url; a.download = list.filename; a.click()
        setTimeout(() => URL.revokeObjectURL(url), 10000)
        await new Promise(resolve => setTimeout(resolve, 400))
      } catch {
        missed.push(list.filename)
      }
    }
    setFailed(missed)
    setBusy(false)
  }

  if (lists.length === 0) return null
  return (
    <div style={{ marginTop: 14 }}>
      <button type="button" className="btn btn-secondary btn-sm" style={{ width: 'auto' }} disabled={busy} onClick={download}>
        <i className={`fas ${busy ? 'fa-spinner fa-spin' : 'fa-download'}`}></i> {lists.length === 1 ? 'Download full list' : `Download full lists (${lists.length} files)`}
      </button>
      {failed.length > 0 && <div style={{ marginTop: 6, fontSize: 12 }}>Could not download: {failed.join(', ')}. Please try again.</div>}
    </div>
  )
}

// The server sends at most 50 names; the count in the heading is the true one.
function MoreNote({ shown, total }) {
  return total > shown ? <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>Showing the first {shown} of {total.toLocaleString()}.</div> : null
}

// Everyone on the current list: ID number and whether the account has been
// activated. No names (the user's choice): names show only at activation.
function RosterTable({ reloadKey }) {
  const [search, setSearch] = useState('')
  const [activated, setActivated] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => {
      schoolRosterApi.people({ search: search || undefined, activated: activated || undefined, page })
        .then(r => { setData(r.data); setError(null) })
        .catch(e => setError(e?.response?.data?.message || 'Could not load the list.'))
    }, search ? 250 : 0)
    return () => clearTimeout(t)
  }, [search, activated, page, reloadKey])

  const counts = data?.counts
  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-header">
        <div className="panel-title">ID numbers on the list</div>
        {counts && <span className="text-muted" style={{ fontSize: 12 }}>{counts.activated.toLocaleString()} activated · {counts.not_activated.toLocaleString()} not yet</span>}
      </div>
      <div className="search-bar" style={{ margin: 0, borderRadius: 0, boxShadow: 'none' }}>
        <div className="search-row">
          <div className="search-input-wrap">
            <i className="fas fa-search"></i>
            <input type="text" inputMode="numeric" maxLength={5} placeholder="Search by ID number…" aria-label="Search by ID number"
                   value={search} onChange={e => { setSearch(e.target.value.replace(/\D/g, '')); setPage(1) }} />
          </div>
        </div>
        <div className="filter-row">
          <select className="form-control" aria-label="Activated" value={activated} onChange={e => { setActivated(e.target.value); setPage(1) }}>
            <option value="">Activated and not yet</option>
            <option value="yes">Activated</option>
            <option value="no">Not activated yet</option>
          </select>
        </div>
      </div>
      {error && <div className="notice-banner warning" style={{ margin: 16 }}><i className="fas fa-exclamation-triangle"></i><span>{error}</span></div>}
      <div className="table-wrap">
        <table className="data-table roster-table">
          <thead><tr><th>ID number</th><th>Account</th></tr></thead>
          <tbody>
            {!data ? <tr><td colSpan={2}>Loading…</td></tr>
              : data.data.length === 0 ? <tr><td colSpan={2} className="text-muted">{search || activated ? 'No ID numbers match.' : 'No list imported yet.'}</td></tr>
              : data.data.map(p => (
                <tr key={p.id_number}>
                  <td data-label="ID number"><code>{p.id_number}</code></td>
                  <td data-label="Account">
                    {p.activated
                      ? <span className="badge badge-active"><i className="fas fa-check"></i> Activated</span>
                      : <span className="badge" style={{ background: 'var(--bg-light, rgba(127,127,127,.12))', color: 'var(--text-muted)' }}>Not activated yet</span>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {/* Always shown once there are results, so it is clear how much of the
          list is on screen; the page buttons appear only with several pages. */}
      {data && data.total > 0 && (
        <div className="pagination">
          <div className="pagination-info">
            Showing <b>{data.from}–{data.to}</b> of <b>{data.total.toLocaleString()}</b> ID number{data.total === 1 ? '' : 's'}
          </div>
          {data.last_page > 1 && (
            <div className="pagination-nav">
              <button className="page-btn" aria-label="Previous page" disabled={data.current_page <= 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}>
                <i className="fas fa-chevron-left"></i>
              </button>
              {Array.from({ length: data.last_page }, (_, i) => i + 1)
                .filter(p => p === 1 || p === data.last_page || Math.abs(p - data.current_page) <= 1)
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) => p === '…'
                  ? <span key={`e-${i}`} className="page-btn" style={{ border: 'none', cursor: 'default' }}>…</span>
                  : <button key={p} className={`page-btn ${p === data.current_page ? 'active' : ''}`}
                            aria-label={`Page ${p}`} aria-current={p === data.current_page ? 'page' : undefined}
                            onClick={() => setPage(p)}>{p}</button>
                )}
              <button className="page-btn" aria-label="Next page" disabled={data.current_page >= data.last_page}
                      onClick={() => setPage(p => Math.min(data.last_page, p + 1))}>
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SchoolRecordsPage() {
  const { user, hasPermission } = useAuth()
  const isSuper = user?.role === 'super_admin'
  const canActivate = hasPermission('activate_accounts')
  const [state, setState] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [confirmSmaller, setConfirmSmaller] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const load = () => schoolRosterApi.get()
    .then(r => setState(r.data))
    .catch(e => setLoadError(e?.response?.data?.message || 'Could not load the school list.'))
  // The list itself is the Super Admin's; staff only activate accounts.
  useEffect(() => { if (isSuper) load() }, [isSuper])

  const pick = (e) => {
    setFile(e.target.files?.[0] || null)
    setPreview(null); setError(null); setNotice(null); setConfirmSmaller(false)
  }

  const runPreview = async () => {
    if (!file) return
    setBusy(true); setError(null); setNotice(null)
    try {
      const r = await schoolRosterApi.preview(file)
      setPreview(r.data)
      if (r.data.error) setError(r.data.error)
    } catch (e) {
      const errs = e?.response?.data?.errors
      setError(errs ? Object.values(errs).flat().join(' ') : (e?.response?.data?.message || 'Could not read the file.'))
    } finally { setBusy(false) }
  }

  const runImport = async () => {
    setConfirmOpen(false)
    setBusy(true); setError(null)
    try {
      const r = await schoolRosterApi.import(file, confirmSmaller)
      setNotice(r.data.message)
      setPreview(null); setFile(null); setConfirmSmaller(false)
      const input = document.getElementById('roster-file'); if (input) input.value = ''
      load()
    } catch (e) {
      setError(e?.response?.data?.message || 'The list could not be imported.')
    } finally { setBusy(false) }
  }

  const blocked = preview && (preview.error || !preview.includes_you || (preview.much_smaller && !confirmSmaller))
  const last = state?.last_import

  return (
    <main className="content">
      <div className="page-header">
        <div>
          <div className="breadcrumb"><Link to="/admin">Dashboard</Link> <span>›</span> School Records</div>
          <div className="page-title">School Records</div>
          <div className="page-subtitle">
            {isSuper
              ? "Activate accounts at the library desk, and manage the school's list of everyone allowed to use TIPIGANAN."
              : 'Activate the account of a student or teacher at the library desk.'}
          </div>
        </div>
      </div>

      {canActivate && <ActivateAccountPanel />}
      {!isSuper && !canActivate && (
        <div className="notice-banner warning"><i className="fas fa-ban"></i><span>You do not have permission to activate accounts.</span></div>
      )}
      {isSuper && <>

      {loadError && <div className="notice-banner warning" style={{ marginBottom: 16 }}><i className="fas fa-exclamation-triangle"></i><span>{loadError}</span></div>}

      {state && !state.enabled && (
        <div className="notice-banner" style={{ marginBottom: 16 }}>
          <i className="fas fa-info-circle"></i>
          <span>The school list is <b>not switched on</b>, so sign-in does not check it yet (activation always does). You can import it now; it takes effect once the server's <code>SCHOOL_DIRECTORY_DRIVER</code> setting is <code>csv</code>.</span>
        </div>
      )}

      {/* ---- The current list ---- */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header"><div className="panel-title">Current list</div>
          {state?.enforced && <span className="badge badge-active">In use</span>}
        </div>
        <div className="panel-body">
          {!state ? 'Loading…' : state.summary.total === 0 ? (
            <p className="text-muted" style={{ margin: 0 }}>No list imported yet. Until one is, nothing is checked.</p>
          ) : (
            <>
              <p style={{ marginTop: 0 }}><b>{state.summary.total.toLocaleString()}</b> people
                {last && <> · imported {new Date(last.imported_at).toLocaleString()} by {last.imported_by}{last.file_name ? ` from ${last.file_name}` : ''}</>}
              </p>
              <RoleCounts byRole={state.summary.by_role} />
              {state.accounts_not_on_list_total > 0 && (
                <NotOnListWarning people={state.accounts_not_on_list} total={state.accounts_not_on_list_total} importedAt={state.summary.imported_at} />
              )}
            </>
          )}
        </div>
      </div>

      {state && state.summary.total > 0 && <RosterTable reloadKey={state.summary.imported_at} />}

      {/* ---- Import a new list ---- */}
      <div className="panel">
        <div className="panel-header"><div className="panel-title">Import a new list</div></div>
        <div className="panel-body">
          <p className="text-muted" style={{ marginTop: 0 }}>
            A CSV file with a header row and these columns: <code>id_number</code>, <code>first_name</code>,
            {' '}<code>last_name</code> (optional) and <code>role</code> — student, teacher, staff or super_admin.
            Every account must be on it, staff and Super Admins included. Importing <b>replaces</b> the current list.
            If the file was opened in Excel, check that ID numbers kept their leading zeros (00042, not 42).
          </p>

          {notice && <div className="notice-banner success" style={{ marginBottom: 14 }} role="status"><i className="fas fa-check-circle"></i><span>{notice}</span></div>}
          {error && <div className="notice-banner warning" style={{ marginBottom: 14 }}><i className="fas fa-exclamation-triangle"></i><span>{error}</span></div>}

          <div className="roster-upload">
            <input id="roster-file" type="file" accept=".csv,text/csv" onChange={pick} />
            <button className="btn btn-secondary" style={{ width: 'auto' }} disabled={!file || busy} onClick={runPreview}>
              <i className={`fas ${busy && !preview ? 'fa-spinner fa-spin' : 'fa-eye'}`}></i> Check file
            </button>
          </div>

          {preview && !preview.error && (
            <div className="roster-preview">
              <h4 style={{ margin: '18px 0 8px' }}>This file has {preview.valid.toLocaleString()} people</h4>
              <RoleCounts byRole={preview.by_role} />

              {!preview.includes_you && (
                <div className="notice-banner warning" style={{ marginTop: 14 }}>
                  <i className="fas fa-ban"></i>
                  <span><b>Your own ID number is not on this list.</b> Importing it would sign you out and lock you out, so it cannot be imported. Add yourself to the file.</span>
                </div>
              )}
              {preview.much_smaller && (
                <div className="notice-banner warning" style={{ marginTop: 14, alignItems: 'flex-start' }}>
                  <i className="fas fa-exclamation-triangle"></i>
                  <span>
                    <b>Much smaller than the current list</b> ({preview.valid} against {preview.previous_total}). A cut-off or wrong file is the likeliest cause.
                    <label style={{ display: 'flex', gap: 8, marginTop: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={confirmSmaller} onChange={e => setConfirmSmaller(e.target.checked)} />
                      I've checked — this is the complete, current list.
                    </label>
                  </span>
                </div>
              )}
              {preview.your_new_name && (
                <div className="notice-banner" style={{ marginTop: 14 }}>
                  <i className="fas fa-info-circle"></i>
                  <span>Your name on this list is <b>{preview.your_new_name}</b>. Your account's name will update to match, and you stay signed in.</span>
                </div>
              )}
              {preview.would_lose_access_total > 0 && (
                <div className="notice-banner warning" style={{ marginTop: 14, alignItems: 'flex-start' }}>
                  <i className="fas fa-user-lock"></i>
                  <span><b>{preview.would_lose_access_total.toLocaleString()} existing account{preview.would_lose_access_total === 1 ? '' : 's'}</b> {preview.would_lose_access_total === 1 ? 'is' : 'are'} not on this list and will be <b>switched off</b>. They are signed out and cannot sign in; if a later list has them again, they are switched back on with their own password:
                    <PeopleList people={preview.would_lose_access} total={preview.would_lose_access_total} />
                  </span>
                </div>
              )}
              {preview.name_changes_total > 0 && (
                <div className="notice-banner warning" style={{ marginTop: 14, alignItems: 'flex-start' }}>
                  <i className="fas fa-id-card"></i>
                  <span><b>{preview.name_changes_total.toLocaleString()} account{preview.name_changes_total === 1 ? ' has' : 's have'} a different name on this list</b> and must be <b>activated again</b> at the library. They are signed out and cannot sign in until then. Staff and Super Admin accounts here can only be activated by a Super Admin:
                    <Names shown={preview.name_changes.length} total={preview.name_changes_total}>
                      <ul className="roster-people">
                        {preview.name_changes.map(p => <li key={p.id_number}><code>{p.id_number}</code> {p.name} → <b>{p.list_name}</b></li>)}
                      </ul>
                      <MoreNote shown={preview.name_changes.length} total={preview.name_changes_total} />
                    </Names>
                  </span>
                </div>
              )}
              {preview.role_changes_total > 0 && (
                <div className="notice-banner" style={{ marginTop: 14, alignItems: 'flex-start' }}>
                  <i className="fas fa-user-tag"></i>
                  <span><b>{preview.role_changes_total.toLocaleString()} account{preview.role_changes_total === 1 ? '' : 's'}</b> will change between student and teacher to match this list:
                    <Names shown={preview.role_changes.length} total={preview.role_changes_total}>
                      <ul className="roster-people">
                        {preview.role_changes.map(p => <li key={p.id_number}><code>{p.id_number}</code> {p.name} <span className="text-muted">· {p.from} → {p.to}</span></li>)}
                      </ul>
                      <MoreNote shown={preview.role_changes.length} total={preview.role_changes_total} />
                    </Names>
                  </span>
                </div>
              )}
              {preview.would_restore_total > 0 && (
                <div className="notice-banner success" style={{ marginTop: 14, alignItems: 'flex-start' }}>
                  <i className="fas fa-user-check"></i>
                  <span><b>{preview.would_restore_total.toLocaleString()} account{preview.would_restore_total === 1 ? '' : 's'}</b> switched off by an earlier list {preview.would_restore_total === 1 ? 'is' : 'are'} on this one and will be <b>switched back on</b>:
                    <PeopleList people={preview.would_restore} total={preview.would_restore_total} />
                  </span>
                </div>
              )}
              {preview.rejected_total > 0 && (
                <div style={{ marginTop: 14 }}>
                  <b>{preview.rejected_total.toLocaleString()} row{preview.rejected_total === 1 ? '' : 's'} will be skipped:</b>
                  <Names shown={preview.rejected.length} total={preview.rejected_total}>
                  <MoreNote shown={preview.rejected.length} total={preview.rejected_total} />
                  <div className="table-wrap" style={{ marginTop: 6 }}>
                    <table className="data-table">
                      <thead><tr><th>Line</th><th>ID number</th><th>Why</th></tr></thead>
                      <tbody>
                        {preview.rejected.map(r => <tr key={r.line}><td>{r.line}</td><td><code>{r.id_number || '—'}</code></td><td>{r.reason}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                  </Names>
                </div>
              )}

              <DownloadLists lists={[
                ['switched_off', preview.would_lose_access_total],
                ['name_changes', preview.name_changes_total],
                ['role_changes', preview.role_changes_total],
                ['switched_back_on', preview.would_restore_total],
                ['skipped', preview.rejected_total],
              ].filter(([, total]) => total > 0).map(([section]) => ({
                fetch: () => schoolRosterApi.downloadPreview(file, section),
                filename: `school-list-${section.replaceAll('_', '-')}.csv`,
              }))} />

              <button className="btn btn-primary" style={{ width: 'auto', marginTop: 18, display: 'block' }} disabled={blocked || busy}
                      onClick={() => setConfirmOpen(true)}>
                <i className={`fas ${busy ? 'fa-spinner fa-spin' : 'fa-file-import'}`}></i> Import this list
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        icon="fa-file-import"
        confirmStyle="warning"
        title="Replace the school list?"
        message={preview && `The current list will be replaced by these ${preview.valid} people. Only ID numbers on it can be activated or sign in.${preview.would_lose_access_total ? ` ${preview.would_lose_access_total.toLocaleString()} account${preview.would_lose_access_total === 1 ? '' : 's'} not on it will be switched off.` : ''}${preview.name_changes_total ? ` ${preview.name_changes_total.toLocaleString()} account${preview.name_changes_total === 1 ? '' : 's'} with a changed name must be activated again.` : ''}${preview.role_changes_total ? ` ${preview.role_changes_total.toLocaleString()} role${preview.role_changes_total === 1 ? '' : 's'} will update.` : ''}`}
        confirmLabel="Import"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={runImport}
      />
      </>}
    </main>
  )
}
