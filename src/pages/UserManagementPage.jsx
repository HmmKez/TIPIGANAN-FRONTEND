import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usersApi, permissionsApi } from '../api/admin'
import ConfirmModal from '../components/ConfirmModal'
import { useToast } from '../components/Toast'
import { useAuth } from '../contexts/AuthContext'

const emptyCreate = { name: '', email: '', password: '', role: 'staff' }

// Staff get every other privilege (uploading, editing, categorizing, viewing
// logs, exporting reports, viewing users, resetting passwords) automatically
// with the Staff role — per the team guide, only account deletion and
// document deletion require an explicit Super Admin grant. Those are the
// only permissions worth surfacing here; everything else would always show
// "granted" and isn't meaningfully revocable per-user since it comes from
// the role, not a direct grant.
const MANAGEABLE_PERMISSIONS = ['delete_accounts', 'delete_documents']
const PERMISSION_LABELS = {
  delete_accounts: 'Delete User Accounts',
  delete_documents: 'Delete Collections',
}

// Staff (even with delete_accounts) can only delete accounts below their own
// level — never another staff member or a super admin.
function canDelete(actor, target, hasPermission) {
  if (!actor || actor.id === target.id) return false
  if (actor.role === 'super_admin') return true
  return hasPermission('delete_accounts') && (target.role === 'student' || target.role === 'teacher')
}

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
  const { notify } = useToast()
  const { user: me, hasPermission } = useAuth()
  const isSuper = me?.role === 'super_admin'
  const canResetPasswords = hasPermission('reset_passwords') // true for super_admin too

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

  const [allPermissions, setAllPermissions] = useState([])
  const [permsFor, setPermsFor] = useState(null)
  const [permBusy, setPermBusy] = useState(false)
  const [permConfirm, setPermConfirm] = useState(null) // { perm, checked } pending confirmation

  const [deleteFor, setDeleteFor] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  useEffect(() => {
    if (!isSuper) return
    permissionsApi.list()
      .then(r => setAllPermissions((r.data || []).filter(p => MANAGEABLE_PERMISSIONS.includes(p.name))))
      .catch(() => {})
  }, [isSuper])

  // Checking/unchecking a permission box only stages the change — the actual
  // grant/revoke call happens in confirmPermissionToggle after the admin
  // confirms in the modal below.
  const requestPermissionToggle = (perm, checked) => setPermConfirm({ perm, checked })

  const confirmPermissionToggle = async () => {
    if (!permsFor || !permConfirm) return
    const { perm, checked } = permConfirm
    setPermBusy(true)
    try {
      if (checked) await usersApi.grantPermission(permsFor.id, perm.name)
      else await usersApi.revokePermission(permsFor.id, perm.name)
      const updated = {
        ...permsFor,
        permissions: checked
          ? [...(permsFor.permissions || []), perm]
          : (permsFor.permissions || []).filter(p => p.name !== perm.name),
      }
      setPermsFor(updated)
      setUsers(us => us.map(u => (u.id === updated.id ? updated : u)))
      notify(`${PERMISSION_LABELS[perm.name] || perm.name} ${checked ? 'granted to' : 'revoked from'} ${permsFor.name}.`, 'success')
    } catch (e) {
      notify(e?.response?.data?.message || 'Failed to update permission.', 'error')
    } finally {
      setPermBusy(false)
      setPermConfirm(null)
    }
  }

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

  // { user, activating: bool } pending confirmation — both activate and
  // deactivate go through the same confirmation step.
  const [statusConfirm, setStatusConfirm] = useState(null)
  const [statusBusy, setStatusBusy] = useState(false)

  const confirmStatusChange = async () => {
    if (!statusConfirm) return
    const { user: u, activating } = statusConfirm
    setStatusBusy(true)
    try {
      if (activating) await usersApi.activate(u.id)
      else await usersApi.deactivate(u.id)
      load()
      notify(`${u.name} was ${activating ? 'activated' : 'deactivated'}.`, 'success')
    } catch (e) {
      notify(e?.response?.data?.message || 'Failed', 'error')
    } finally {
      setStatusBusy(false)
      setStatusConfirm(null)
    }
  }
  const confirmDelete = async () => {
    if (!deleteFor) return
    setDeleteBusy(true)
    try {
      await usersApi.remove(deleteFor.id)
      load()
      notify(`${deleteFor.name}'s account was deleted.`, 'success')
    } catch (e) {
      notify(e?.response?.data?.message || 'Failed to delete account.', 'error')
    } finally {
      setDeleteBusy(false)
      setDeleteFor(null)
    }
  }

  const create = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await usersApi.create(createForm)
      setShowCreate(false); setCreateForm(emptyCreate); load()
      notify('User created.', 'success')
    } catch (err) {
      const errs = err?.response?.data?.errors
      notify(errs ? Object.values(errs).flat().join(' ') :
                    (err?.response?.data?.message || 'Create failed.'), 'error')
    } finally { setSaving(false) }
  }

  const submitReset = async (e) => {
    e.preventDefault()
    if (resetForm.password !== resetForm.password_confirmation) {
      notify('Passwords do not match.', 'error'); return
    }
    setSaving(true)
    try {
      await usersApi.resetPassword(resetFor.id, resetForm)
      setResetFor(null); setResetForm({ password: '', password_confirmation: '' })
      notify('Password reset successfully.', 'success')
    } catch (err) {
      const errs = err?.response?.data?.errors
      notify(errs ? Object.values(errs).flat().join(' ') :
                    (err?.response?.data?.message || 'Reset failed.'), 'error')
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
                    {isSuper && u.role === 'staff' && (
                      <button className="btn-icon" title="Manage Permissions" onClick={() => setPermsFor(u)}>
                        <i className="fas fa-user-shield"></i>
                      </button>
                    )}
                    {canResetPasswords && (
                      <button className="btn-icon" title="Reset Password" onClick={() => setResetFor(u)}>
                        <i className="fas fa-key"></i>
                      </button>
                    )}
                    {isSuper && (
                      u.status === 'active' ? (
                        <button className="btn-icon" title="Deactivate"
                                onClick={() => setStatusConfirm({ user: u, activating: false })}
                                disabled={me?.id === u.id}
                                style={me?.id === u.id ? { opacity: 0.3 } : {}}>
                          <i className="fas fa-user-slash"></i>
                        </button>
                      ) : (
                        <button className="btn-icon" title="Activate"
                                onClick={() => setStatusConfirm({ user: u, activating: true })}>
                          <i className="fas fa-user-check"></i>
                        </button>
                      )
                    )}
                    {/* Staff only see this for students/teachers — they can
                        never delete a peer staff account or a super admin. */}
                    {canDelete(me, u, hasPermission) && (
                      <button className="btn-icon" title="Delete Account"
                              onClick={() => setDeleteFor(u)}
                              style={{ color: 'var(--danger)' }}>
                        <i className="fas fa-trash"></i>
                      </button>
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
      {/* Manage Permissions Modal */}
      {permsFor && (
        <div className="modal-backdrop" onClick={() => setPermsFor(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-user-shield" style={{ color: 'var(--primary-blue)', marginRight: 8 }}></i>Permissions — {permsFor.name}</h3>
              <button className="btn-icon" onClick={() => setPermsFor(null)}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body">
              <p className="text-muted" style={{ marginBottom: 16 }}>
                Staff already have every collection and account management privilege
                except deletion. Grant these individually only for trusted staff.
              </p>
              {allPermissions.length === 0 && (
                <p className="text-muted">No permissions found.</p>
              )}
              {allPermissions.map(perm => {
                const checked = (permsFor.permissions || []).some(p => p.name === perm.name)
                return (
                  <label key={perm.id}
                         style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <input type="checkbox" checked={checked} disabled={permBusy}
                           onChange={e => requestPermissionToggle(perm, e.target.checked)} />
                    <span>{PERMISSION_LABELS[perm.name] || perm.name.replace(/_/g, ' ')}</span>
                  </label>
                )
              })}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setPermsFor(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!statusConfirm}
        icon={statusConfirm?.activating ? 'fa-user-check' : 'fa-user-slash'}
        confirmStyle={statusConfirm?.activating ? 'primary' : 'warning'}
        title={statusConfirm?.activating ? 'Activate this account?' : 'Deactivate this account?'}
        message={statusConfirm && (
          statusConfirm.activating
            ? `${statusConfirm.user.name} will regain access and be able to sign in again.`
            : `${statusConfirm.user.name} will be signed out and unable to sign in until reactivated.`
        )}
        confirmLabel={statusBusy ? 'Saving…' : (statusConfirm?.activating ? 'Activate' : 'Deactivate')}
        onConfirm={confirmStatusChange}
        onCancel={() => setStatusConfirm(null)}
      />

      <ConfirmModal
        open={!!permConfirm}
        icon="fa-user-shield"
        confirmStyle={permConfirm?.checked ? 'primary' : 'warning'}
        title={permConfirm?.checked ? 'Grant this permission?' : 'Revoke this permission?'}
        message={permConfirm && permsFor && (
          permConfirm.checked
            ? `Grant "${PERMISSION_LABELS[permConfirm.perm.name] || permConfirm.perm.name}" to ${permsFor.name}? They will be able to use it immediately.`
            : `Revoke "${PERMISSION_LABELS[permConfirm.perm.name] || permConfirm.perm.name}" from ${permsFor.name}?`
        )}
        confirmLabel={permConfirm?.checked ? 'Grant' : 'Revoke'}
        onConfirm={confirmPermissionToggle}
        onCancel={() => setPermConfirm(null)}
      />

      <ConfirmModal
        open={!!deleteFor}
        icon="fa-user-slash"
        confirmStyle="danger"
        title="Delete this account?"
        message={deleteFor && `Permanently delete ${deleteFor.name}'s account? This cannot be undone.`}
        confirmLabel={deleteBusy ? 'Deleting…' : 'Delete Account'}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteFor(null)}
      />
    </main>
  )
}
