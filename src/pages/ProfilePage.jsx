import { useEffect, useRef, useState } from 'react'
import { userLabel } from '../utils/userLabel'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { Loader, ErrorMessage } from '../components/Loader'
import { usersApi } from '../api'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../components/Toast'
import { avatarUrl } from '../utils/avatar'
import { boldQuoted } from '../utils/boldQuoted'

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

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: 'fa-sun' },
  { value: 'dark', label: 'Dark', icon: 'fa-moon' },
  { value: 'system', label: 'System', icon: 'fa-desktop' },
]

export default function ProfilePage() {
  const { logout, updateUser } = useAuth()
  const { theme, setTheme, reduceMotion, setReduceMotion } = useTheme()
  const { notify } = useToast()
  const [activeTab, setActiveTab] = useState('personal')
  const [data, setData] = useState(null) // { user, roles, permissions, favorites, history }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef(null)

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
      updateUser(res.data.user)
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

  const handleAvatarPick = () => avatarInputRef.current?.click()

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // reset so picking the same file again still fires onChange
    if (!file) return
    if (!file.type.startsWith('image/')) {
      notify('Please choose an image file.', 'error')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      notify('Image must be 2MB or smaller.', 'error')
      return
    }
    setUploadingAvatar(true)
    try {
      const res = await usersApi.uploadAvatar(file)
      setData(prev => ({ ...prev, user: res.data.user }))
      updateUser(res.data.user)
      notify('Profile picture updated.', 'success')
    } catch (err) {
      notify(err?.response?.data?.message || 'Failed to upload profile picture.', 'error')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleAvatarRemove = async () => {
    setUploadingAvatar(true)
    try {
      const res = await usersApi.removeAvatar()
      setData(prev => ({ ...prev, user: res.data.user }))
      updateUser(res.data.user)
      notify('Profile picture removed.', 'success')
    } catch (err) {
      notify(err?.response?.data?.message || 'Failed to remove profile picture.', 'error')
    } finally {
      setUploadingAvatar(false)
    }
  }

  if (loading) return <Loader />
  if (error) return <ErrorMessage error={error} onRetry={load} />
  if (!data) return null

  const { user, roles = [], permissions = [], favorites = [], history = [] } = data

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
        <div className="panel-grid-2" style={{ alignItems: 'start' }}>
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
          </div>

          <div>
            <div className="panel">
              <div className="panel-body text-center">
                <div className="avatar-upload-wrap">
                  {avatarUrl(user) ? (
                    <img src={avatarUrl(user)} alt="" className="user-avatar user-avatar-img" style={{ width: 90, height: 90 }} />
                  ) : (
                    <div className="user-avatar" style={{ width: 90, height: 90, fontSize: 28, margin: 0, background: 'linear-gradient(135deg,#345FCF,#5A79E5)' }}>
                      {initials(userLabel(user))}
                    </div>
                  )}
                  <button type="button" className="avatar-upload-btn" title="Change profile picture"
                          onClick={handleAvatarPick} disabled={uploadingAvatar}>
                    <i className={`fas ${uploadingAvatar ? 'fa-spinner fa-spin' : 'fa-camera'}`}></i>
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                </div>
                {avatarUrl(user) && (
                  <button type="button" onClick={handleAvatarRemove} disabled={uploadingAvatar}
                          className="text-muted" style={{ background: 'none', border: 'none', fontSize: 11.5, cursor: 'pointer', marginBottom: 8, textDecoration: 'underline' }}>
                    Remove photo
                  </button>
                )}
                <h3 style={{ fontSize: 17, marginBottom: 4 }}>{userLabel(user)}</h3>
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

      {activeTab === 'security' && (
        <div className="panel-grid-2" style={{ alignItems: 'start' }}>
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
                  <input type="password" className="form-control" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8}
                         pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}"
                         title="At least 8 characters, with an uppercase letter, a lowercase letter, and a number." />
                  <small className="text-muted" style={{ fontSize: 11 }}>At least 8 characters, with uppercase, lowercase, and a number.</small>
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

          <div>
            <div className="panel">
              <div className="panel-header"><div className="panel-title">Roles</div></div>
              <div className="panel-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {roles.length === 0 ? (
                  <p className="text-muted mb-0">No roles assigned.</p>
                ) : roles.map(r => (
                  <span key={r} className={`badge badge-${r === 'student' ? 'student' : r === 'staff' || r === 'super_admin' ? 'staff' : 'admin'}`}>
                    {roleLabel(r)}
                  </span>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-header"><div className="panel-title">Permissions</div></div>
              <div className="panel-body">
                {permissions.length === 0 ? (
                  <p className="text-muted mb-0">
                    {user.role === 'super_admin' ? 'Super Administrator has full access — no individual grants needed.' : 'No individually granted permissions.'}
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {permissions.map(p => (
                      <span key={p} className="badge badge-staff">{p.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'preferences' && (
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Appearance</div></div>
          <div className="panel-body">
            <div className="form-group">
              <label className="form-label">Theme</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {THEME_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    className={`btn ${theme === opt.value ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flexDirection: 'column', gap: 6, padding: '14px 24px', minWidth: 96 }}
                  >
                    <i className={`fas ${opt.icon}`} style={{ fontSize: 18 }}></i>
                    {opt.label}
                  </button>
                ))}
              </div>
              <small className="text-muted" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
                "System" follows your device's light/dark setting automatically.
              </small>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Motion</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={reduceMotion} onChange={e => setReduceMotion(e.target.checked)} />
                Reduce interface animations and transitions
              </label>
            </div>
          </div>
        </div>
      )}

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
                      <div className="activity-title">{boldQuoted(a.title)}</div>
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