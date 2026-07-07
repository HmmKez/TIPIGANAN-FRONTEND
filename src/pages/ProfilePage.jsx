import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { Loader, ErrorMessage } from '../components/Loader'
import { usersApi } from '../api'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
}

function roleLabel(role) {
  if (role === 'super_admin') return 'Super Administrator'
  if (role === 'staff') return 'Staff'
  if (role === 'teacher') return 'Teacher'
  return 'Student'
}

// The mockup's Security and Preferences tabs (2FA, login history table,
// active sessions, reading/notification preferences) have no backing
// columns or endpoints anywhere in the schema. Rather than build interactive
// UI that silently does nothing, these tabs show this honest placeholder
// instead until the backend supports them.
function ComingSoon({ label }) {
  return (
    <div className="panel">
      <div className="panel-body text-center" style={{ padding: '48px 20px' }}>
        <i className="fas fa-tools text-primary-blue" style={{ fontSize: 32, marginBottom: 12, display: 'block' }}></i>
        <p className="text-muted mb-0">{label} isn't available yet — there's no backend support for it currently.</p>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { logout } = useAuth()
  const [activeTab, setActiveTab] = useState('personal')
  const [data, setData] = useState(null) // { user, roles, permissions, favorites, history }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState(null)

  const load = () => {
    setLoading(true); setError(null)
    usersApi.profile()
      .then(res => {
        setData(res.data)
        setName(res.data.user?.name || '')
        setEmail(res.data.user?.email || '')
      })
      .catch(err => setError(err))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true); setProfileMsg(null)
    try {
      const res = await usersApi.updateProfile({ name, email })
      setData(prev => ({ ...prev, user: res.data.user }))
      // NOTE: AuthContext currently has no way to update its cached `user`
      // after an edit like this, so the sidebar name/avatar (from useAuth())
      // won't reflect the change until next login. A small `updateUser`
      // setter added to AuthContext would fix this — flagging rather than
      // reaching into that file unasked.
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' })
    } catch (err) {
      setProfileMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to update profile.' })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordMsg(null)
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' })
      return
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }
    setSavingPassword(true)
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      })
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' })
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to change password.' })
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) return <Loader />
  if (error) return <ErrorMessage error={error} onRetry={load} />
  if (!data) return null

  const { user, favorites = [], history = [] } = data

  // Merge real bookmark + view activity into one feed — both come straight
  // from GET /profile, no fabricated entries.
  const activityItems = [
    ...favorites.slice(0, 3).map(f => ({
      type: 'bookmark', icon: 'fa-bookmark', color: 'green',
      title: `Bookmarked "${f.thesis?.title}"`,
      time: new Date(f.created_at).toLocaleString(),
    })),
    ...history.slice(0, 3).map(h => ({
      type: 'view', icon: 'fa-eye', color: '',
      title: `Viewed "${h.thesis?.title}"`,
      time: new Date(h.viewed_at).toLocaleString(),
    })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5)

  return (
    <>
      <PageHeader
        breadcrumb={<><Link to="/dashboard">Dashboard</Link> <span>›</span> My Profile</>}
        title="My Profile"
        subtitle="Manage your account information and security."
      />

      <div className="tabs">
        <div className={`tab ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>Personal Info</div>
        <div className={`tab ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>Security</div>
        <div className={`tab ${activeTab === 'preferences' ? 'active' : ''}`} onClick={() => setActiveTab('preferences')}>Preferences</div>
        <div className={`tab ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>Activity</div>
      </div>

      {activeTab === 'personal' && (
        <div className="panel-grid-2">
          <div>
            <form className="panel" onSubmit={handleUpdateProfile}>
              <div className="panel-header"><div className="panel-title">Personal Information</div></div>
              <div className="panel-body">
                {profileMsg && (
                  <div className={`notice-banner ${profileMsg.type === 'error' ? 'warning' : 'success'}`} style={{ marginBottom: 16 }}>
                    <i className={`fas ${profileMsg.type === 'error' ? 'fa-exclamation-triangle' : 'fa-check-circle'}`}></i>
                    <span>{profileMsg.text}</span>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Full Name <span className="req">*</span></label>
                  <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
                  {/* Mockup splits First/Last Name, but users.name is a single
                      column in the schema — one field is what the backend
                      can actually store. */}
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address <span className="req">*</span></label>
                  <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                {/* Student ID, Department, and Contact Number from the mockup
                    have no columns in the users table — omitted rather than
                    shown as dead inputs that can't actually save. */}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={load}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                  <i className="fas fa-save"></i> {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>

            <form className="panel" onSubmit={handleChangePassword}>
              <div className="panel-header"><div className="panel-title">Change Password</div></div>
              <div className="panel-body">
                {passwordMsg && (
                  <div className={`notice-banner ${passwordMsg.type === 'error' ? 'warning' : 'success'}`} style={{ marginBottom: 16 }}>
                    <i className={`fas ${passwordMsg.type === 'error' ? 'fa-exclamation-triangle' : 'fa-check-circle'}`}></i>
                    <span>{passwordMsg.text}</span>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Current Password <span className="req">*</span></label>
                  <input type="password" className="form-control" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">New Password <span className="req">*</span></label>
                    <input type="password" className="form-control" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} />
                    <small className="text-muted" style={{ fontSize: 11 }}>Minimum 8 characters.</small>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New Password <span className="req">*</span></label>
                    <input type="password" className="form-control" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                  <i className="fas fa-key"></i> {savingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

          <div>
            <div className="panel">
              <div className="panel-body text-center">
                <div className="user-avatar" style={{ width: 90, height: 90, fontSize: 28, margin: '8px auto 16px', background: 'linear-gradient(135deg,#345FCF,#5A79E5)' }}>
                  {initials(user.name)}
                </div>
                <h3 style={{ fontSize: 17, marginBottom: 4 }}>{user.name}</h3>
                <div className="text-muted" style={{ fontSize: 13 }}>{user.email}</div>
                <span className={`badge badge-${user.role === 'student' ? 'student' : user.role === 'staff' ? 'staff' : 'admin'}`} style={{ marginTop: 10, display: 'inline-block' }}>
                  {roleLabel(user.role)}
                </span>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header"><div className="panel-title">Account Statistics</div></div>
              <div className="panel-body">
                <div className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span><i className="fas fa-bookmark"></i> Bookmarks</span>
                  <b>{favorites.length}</b>
                </div>
                <div className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span><i className="fas fa-eye"></i> Recently Viewed</span>
                  <b>{history.length}{history.length === 10 ? '+' : ''}</b>
                </div>
                <div className="flex-between" style={{ padding: '8px 0' }}>
                  <span><i className="fas fa-calendar-alt"></i> Member Since</span>
                  <b>{new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</b>
                </div>
                {/* "Last Login" dropped — not stored on the user record, and
                    audit-logs (which would have it) is staff/super_admin only. */}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && <ComingSoon label="Two-factor authentication and login history" />}
      {activeTab === 'preferences' && <ComingSoon label="Reading and notification preferences" />}

      {activeTab === 'activity' && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title"><i className="fas fa-history" style={{ color: 'var(--primary-blue)', marginRight: 6 }}></i>Recent Activity</div>
          </div>
          <div className="panel-body" style={{ padding: '14px 22px' }}>
            {activityItems.length === 0 ? (
              <p className="text-muted mb-0">No recent activity yet.</p>
            ) : (
              <ul className="activity-list">
                {activityItems.map((a, i) => (
                  <li key={i} className="activity-item">
                    <div className={`activity-icon ${a.color}`}><i className={`fas ${a.icon}`}></i></div>
                    <div className="activity-content">
                      <div className="activity-title" dangerouslySetInnerHTML={{ __html: a.title.replace(/"([^"]+)"/, '"<b>$1</b>"') }} />
                      <div className="activity-time">{a.time}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Active Sessions panel from the mockup dropped — sessions table
              exists in the schema but nothing in routes/api.php exposes it. */}
        </div>
      )}
    </>
  )
}