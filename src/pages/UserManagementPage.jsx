import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usersApi } from '../api/admin'

const emptyCreate = { name: '', email: '', password: '', role: 'staff' }

function initials(n) { return (n || '?').split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase() }

function roleBadgeClass(role) {
  if (role === 'super_admin') return 'badge-admin'
  if (role === 'staff') return 'badge-staff'
  return 'badge-student'
}
function roleLabel(role) {
  if (role === 'super_admin') return 'Super Admin'
  if (role === 'staff') return 'Staff'
  if (role === 'teacher') return 'Teacher'
  return 'Student'
}

export default function UserManagementPage() {
  const [me] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tipiganan_user') || 'null') } catch { return null }
  })
  const isSuper = me?.role === 'super_admin'

  const [users, setUsers] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [saving, setSaving] = useState(false)

  const [resetFor, setResetFor] = useState(null)
  const [resetForm, setResetForm] = useState({ password: '', password_confirmation: '' })

  const load = () => {
    setLoading(true); setError(null)
    const params = { page }
    if (role) params.role = role
    if (status) params.status = status
    usersApi.list(params)
      .then(r => {
        const d = r.data
        let list = d.data || []
        if (q) {
          const s = q.toLowerCase()
          list = list.filter(u => (u.name || '').toLowerCase().includes(s)
            || (u.email || '').toLowerCase().includes(s))
        }
        if (tab === 'students')    list = list.filter(u => u.role === 'student' || u.role === 'teacher')
        if (tab === 'staff')       list = list.filter(u => u.role === 'staff')
        if (tab === 'admins')      list = list.filter(u => u.role === 'super_admin')
        if (tab === 'deactivated') list = list.filter(u => u.status === 'deactivated')
        setUsers(list)
        setMeta({
          current_page: d.current_page || 1,
          last_page:    d.last_page || 1,
          total:        d.total ?? list.length,
        })
      })
      .catch(err => setError(err?.response?.data?.message || err.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [tab, q, role, status, page]) // eslint-disable-line

  const activate = async (u) => {
    try { await usersApi.activate(u.id); load() }
    catch (e) { alert(e?.response?.data?.message || 'Failed') }
  }
  const deactivate = async (u) => {
    if (!confirm(`Deactivate ${u.name}?`)) return
    try { await usersApi.deactivate(u.id); load() }
    catch (e) { alert(e?.response?.data?.message || 'Failed') }
  }
  const remove = async (u) => {
    if (!confirm(`Permanently delete ${u.name}? This cannot be undone.`)) return
    try { await usersApi.remove(u.id); load() }
    catch (e) { alert(e?.response?.data?.message || 'Failed') }
  }

  const create = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await usersApi.create(createForm)
      setShowCreate(false); setCreateForm(emptyCreate); load()
    } catch (err) {
      const errs = err?.response?.data?.errors
      alert(errs ? Object.values(errs).flat().join(' ') :
                   (err?.response?.data?.message || 'Create failed.'))
    } finally { setSaving(false) }
  }

  const submitReset = async (e) => {
    e.preventDefault()
    if (resetForm.password !== resetForm.password_confirmation) {
      alert('Passwords do not match.'); return
    }
    setSaving(true)
    try {
      await usersApi.resetPassword(resetFor.id, resetForm)
      setResetFor(null); setResetForm({ password: '', password_confirmation: '' })
      alert('Password reset successfully.')
    } catch (err) {
      const errs = err?.response?.data?.errors
      alert(errs ? Object.values(errs).flat().join(' ') :
                   (err?.response?.data?.message || 'Reset failed.'))
    } finally { setSaving(false) }
  }

  return (
    <main className="content">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/admin">Dashboard</Link> <span>›</span> User Management
          </div>
          <div className="page-title">User Management</div>
          <div className="page-subtitle">View, create, activate/deactivate, reset passwords, and manage user accounts.</div>
        </div>
        {isSuper && (
          <div className="flex gap-2" style={{ gap: 10 }}>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <i className="fas fa-user-plus"></i> Add User
            </button>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon blue"><i className="fas fa-users"></i></div>
          <div className="stat-value">{meta.total.toLocaleString()}</div>
          <div className="stat-label">Total Users (page)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green"><i className="fas fa-user-check"></i></div>
          <div className="stat-value">{users.filter(u => u.status === 'active').length}</div>
          <div className="stat-label">Active (shown)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon red"><i className="fas fa-user-slash"></i></div>
          <div className="stat-value">{users.filter(u => u.status === 'deactivated').length}</div>
          <div className="stat-label">Deactivated (shown)</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon orange"><i className="fas fa-user-tag"></i></div>
          <div className="stat-value">{users.filter(u => u.role === 'staff' || u.role === 'super_admin').length}</div>
          <div className="stat-label">Staff &amp; Admins (shown)</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          ['all', 'All Users'], ['students', 'Students & Teachers'],
          ['staff', 'Staff'], ['admins', 'Admins'], ['deactivated', 'Deactivated'],
        ].map(([id, label]) => (
          <div key={id} className={`tab ${tab === id ? 'active' : ''}`}
               onClick={() => { setTab(id); setPage(1) }}>{label}</div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="search-bar">
        <div className="search-row">
          <div className="search-input-wrap">
            <i className="fas fa-search"></i>
            <input type="text" placeholder="Search by name or email…"
                   value={q} onChange={e => setQ(e.target.value)} />
          </div>
        </div>
        <div className="filter-row">
          <select className="form-control" value={role} onChange={e => { setRole(e.target.value); setPage(1) }}>
            <option value="">All Roles</option>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="staff">Staff</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <select className="form-control" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="notice-banner warning" style={{ marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle"></i> <span>{error}</span>
        </div>
      )}

      <div className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="5" className="text-muted" style={{ padding: 30, textAlign: 'center' }}>Loading…</td></tr>}
              {!loading && users.length === 0 && (
                <tr><td colSpan="5" className="text-muted" style={{ padding: 30, textAlign: 'center' }}>No users match your filters.</td></tr>
              )}
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="user-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                        {initials(u.name)}
                      </div>
                      <div>
                        <b>{u.name}</b>{me?.id === u.id && <span className="text-muted" style={{ fontSize: 11 }}> (you)</span>}<br />
                        <small className="text-muted">{u.email}</small>
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge ${roleBadgeClass(u.role)}`}>{roleLabel(u.role)}</span></td>
                  <td>
                    <span className={`badge ${u.status === 'active' ? 'badge-active' : 'badge-restricted'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                  <td>
                    {isSuper && (
                      <>
                        <button className="btn-icon" title="Reset Password" onClick={() => setResetFor(u)}>
                          <i className="fas fa-key"></i>
                        </button>
                        {u.status === 'active' ? (
                          <button className="btn-icon" title="Deactivate" onClick={() => deactivate(u)}
                                  disabled={me?.id === u.id}
                                  style={me?.id === u.id ? { opacity: 0.3 } : {}}>
                            <i className="fas fa-user-slash"></i>
                          </button>
                        ) : (
                          <button className="btn-icon" title="Activate" onClick={() => activate(u)}>
                            <i className="fas fa-user-check"></i>
                          </button>
                        )}
                        <button className="btn-icon" title="Delete" onClick={() => remove(u)}
                                disabled={me?.id === u.id}
                                style={{ color: 'var(--danger)', ...(me?.id === u.id ? { opacity: 0.3 } : {}) }}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </>
                    )}
                    {!isSuper && (
                      <span className="text-muted" style={{ fontSize: 11 }}>read-only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta.last_page > 1 && (
          <div className="pagination">
            <div className="pagination-info">
              Page <b>{meta.current_page}</b> of <b>{meta.last_page}</b> · <b>{meta.total.toLocaleString()}</b> total
            </div>
            <div className="pagination-nav">
              <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <i className="fas fa-chevron-left"></i>
              </button>
              <button className="page-btn active">{meta.current_page}</button>
              <button className="page-btn" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-user-plus" style={{ color: 'var(--primary-blue)', marginRight: 8 }}></i>Add User</h3>
              <button className="btn-icon" onClick={() => setShowCreate(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={create}>
              <div className="modal-body">
                <div className="notice-banner" style={{ marginBottom: 16 }}>
                  <i className="fas fa-info-circle"></i>
                  <span>This form creates <b>staff</b> or <b>super_admin</b> accounts only. Students and teachers should self-register.</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Full Name <span className="req">*</span></label>
                  <input type="text" className="form-control" required
                         value={createForm.name}
                         onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email <span className="req">*</span></label>
                  <input type="email" className="form-control" required
                         value={createForm.email}
                         onChange={e => setCreateForm({ ...createForm, email: e.target.value })} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Role <span className="req">*</span></label>
                    <select className="form-control" value={createForm.role}
                            onChange={e => setCreateForm({ ...createForm, role: e.target.value })}>
                      <option value="staff">Staff</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password <span className="req">*</span></label>
                    <input type="password" className="form-control" required minLength="8"
                           value={createForm.password}
                           onChange={e => setCreateForm({ ...createForm, password: e.target.value })} />
                    <small className="text-muted" style={{ fontSize: 11 }}>Minimum 8 characters</small>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
                  {saving ? ' Creating…' : ' Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetFor && (
        <div className="modal-backdrop" onClick={() => setResetFor(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-key" style={{ color: 'var(--warning)', marginRight: 8 }}></i>Reset Password</h3>
              <button className="btn-icon" onClick={() => setResetFor(null)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={submitReset}>
              <div className="modal-body">
                <p style={{ marginBottom: 16 }}>Set a new password for <b>{resetFor.name}</b>.</p>
                <div className="form-group">
                  <label className="form-label">New Password <span className="req">*</span></label>
                  <input type="password" className="form-control" required minLength="8"
                         value={resetForm.password}
                         onChange={e => setResetForm({ ...resetForm, password: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password <span className="req">*</span></label>
                  <input type="password" className="form-control" required minLength="8"
                         value={resetForm.password_confirmation}
                         onChange={e => setResetForm({ ...resetForm, password_confirmation: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setResetFor(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                  {saving ? ' Saving…' : ' Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
