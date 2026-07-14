import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getRetryAfterSeconds, useCountdown } from '../utils/rateLimit'
import { MDC_LOGO } from '../config/branding'

const DEPARTMENTS = [
  'CAST — College of Arts, Sciences & Teacher Education',
  'CCJ — College of Criminal Justice',
  'COE — College of Engineering',
  'CON — College of Nursing',
  'CABM-B — Business Management (Bachelor)',
  'CABM-H — Hospitality Management',
  'Graduate Studies',
]

export default function RegisterPage() {
  const [userType, setUserType] = useState('student')
  const [form, setForm] = useState({
    first_name: '', last_name: '', student_id: '', department: '',
    email: '', password: '', password_confirmation: '',
  })
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [retrySeconds, setRetrySeconds] = useState(0)
  const retryCountdown = useCountdown(retrySeconds)
  const { register } = useAuth()
  const navigate = useNavigate()

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!agree) { setError('You must agree to the Terms and Privacy Policy.'); return }
    if (form.password !== form.password_confirmation) { setError('Passwords do not match.'); return }
    setSubmitting(true)
    try {
      await register({
        name: `${form.first_name} ${form.last_name}`.trim(),
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        role: userType,
        student_id: userType === 'student' ? form.student_id : undefined,
        department: form.department || undefined,
      })
      navigate(userType === 'student' ? '/dashboard' : '/dashboard', { replace: true })
    } catch (err) {
      if (err?.response?.status === 429) {
        setRetrySeconds(getRetryAfterSeconds(err))
      } else {
        setRetrySeconds(0)
        let msg
        if (!err?.response) {
          msg = 'Could not reach the server. Check that the backend is running and try again.'
        } else {
          const errs = err.response.data?.errors
          msg = errs ? Object.values(errs).flat().join(' ')
            : err.response.data?.message || 'Registration failed. Please try again.'
        }
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <Link to="/" style={{display:'inline-flex', alignItems:'center', gap:6, fontSize:13, color:'inherit', opacity:0.85, textDecoration:'none', marginBottom:24}}>
          <i className="fas fa-arrow-left"></i> Back to Home
        </Link>
        <div className="auth-logo">
          <img src={MDC_LOGO} alt="MDC Logo" id="login-logo" />
        </div>
        <h1>TIPIGANAN</h1>
        <p>MDC Online Repository of Special and Rare Collections. Access digitally preserved thesis manuscripts from departments across Mater Dei College.</p>
        <div className="auth-features">
          <div className="auth-feature"><i className="fas fa-shield-alt"></i> Secure view-only PDF access</div>
          <div className="auth-feature"><i className="fas fa-search"></i> Powerful multi-field search</div>
          <div className="auth-feature"><i className="fas fa-bookmark"></i> Personal bookmark library</div>
          <div className="auth-feature"><i className="fas fa-university"></i> Multi-department repository</div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card" style={{maxWidth:480}}>
          {/* Only rendered on phones, where .auth-left (and the back link it
              carries) is hidden. */}
          <Link to="/" className="auth-back-mobile">
            <i className="fas fa-arrow-left"></i> Back to Home
          </Link>
          <h2>Create Account</h2>
          <p className="sub">Register as a student or teacher</p>

          {(retryCountdown > 0 || error) && (
            <div className="notice-banner warning" style={{marginBottom:16}}>
              <i className="fas fa-exclamation-circle"></i>
              <span>
                {retryCountdown > 0
                  ? `Too many attempts. Please try again in ${retryCountdown}s.`
                  : error}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{display:'flex', gap:12, marginBottom:20, background:'#F0F3FA', padding:6, borderRadius:12}}>
              <div onClick={() => setUserType('student')}
                   style={{flex:1, textAlign:'center', padding:'10px', borderRadius:8, cursor:'pointer',
                     background: userType==='student' ? '#fff' : 'transparent',
                     fontWeight:500, color: userType==='student' ? 'var(--primary-blue)' : 'var(--text-muted)',
                     boxShadow: userType==='student' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'}}>
                <i className="fas fa-user-graduate" style={{marginRight:6}}></i> Student
              </div>
              <div onClick={() => setUserType('teacher')}
                   style={{flex:1, textAlign:'center', padding:'10px', borderRadius:8, cursor:'pointer',
                     background: userType==='teacher' ? '#fff' : 'transparent',
                     fontWeight:500, color: userType==='teacher' ? 'var(--primary-blue)' : 'var(--text-muted)',
                     boxShadow: userType==='teacher' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'}}>
                <i className="fas fa-chalkboard-user" style={{marginRight:6}}></i> Teacher
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name <span className="req">*</span></label>
                <input type="text" className="form-control" value={form.first_name}
                       onChange={e => update('first_name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name <span className="req">*</span></label>
                <input type="text" className="form-control" value={form.last_name}
                       onChange={e => update('last_name', e.target.value)} required />
              </div>
            </div>

            {userType === 'student' && (
              <div className="form-group">
                <label className="form-label">Student ID <span className="req">*</span></label>
                <input type="text" className="form-control" placeholder="2026-00001"
                       value={form.student_id} onChange={e => update('student_id', e.target.value)}
                       required={userType==='student'} />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                Department {userType === 'student' ? <span className="req">*</span> : <span className="req">(optional)</span>}
              </label>
              <select className="form-control" value={form.department}
                      onChange={e => update('department', e.target.value)} required={userType==='student'}>
                <option value="">— Select Department —</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address <span className="req">*</span></label>
              <input type="email" className="form-control" placeholder="student@mdc.edu.ph"
                     value={form.email} onChange={e => update('email', e.target.value)} required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Password <span className="req">*</span></label>
                <input type="password" className="form-control" minLength={8}
                       pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}"
                       title="At least 8 characters, with an uppercase letter, a lowercase letter, and a number."
                       value={form.password} onChange={e => update('password', e.target.value)} required />
                <small className="text-muted" style={{ fontSize: 11 }}>At least 8 characters, with uppercase, lowercase, and a number.</small>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password <span className="req">*</span></label>
                <input type="password" className="form-control" minLength={8}
                       value={form.password_confirmation}
                       onChange={e => update('password_confirmation', e.target.value)} required />
              </div>
            </div>

            <div className="checkbox-row" style={{marginBottom:18}}>
              <label>
                <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} required />
                {' '}I agree to the <a href="#">Terms</a> and <a href="#">Privacy Policy</a>
              </label>
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting || retryCountdown > 0}>
              <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-user-plus'}`}></i>
              {retryCountdown > 0 ? ` Try again in ${retryCountdown}s` : submitting ? ' Creating account...' : ' Create Account'}
            </button>

            <div className="auth-foot">
              Already have an account? <Link to="/login">Sign in</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
