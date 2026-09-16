import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../api/auth'
import { getRetryAfterSeconds, useCountdown } from '../utils/rateLimit'
import { MDC_LOGO } from '../config/branding'

/**
 * Registration in two steps: prove the ID number belongs to a real, current
 * student or teacher, then set up the account.
 *
 * The split is not cosmetic. The role used to be self-declared here — anyone
 * could tick "Teacher" and get teacher-level access — and it now comes from the
 * school's records instead. Showing the person their own first name after the
 * check is what makes that verification visible rather than silent.
 *
 * When the backend has directory checking switched off (the default, and the
 * state until the school provides access), step one answers
 * `verification_required: false` and this falls back to the original one-step
 * form, role toggle and all.
 */
export default function RegisterPage() {
  const [step, setStep] = useState('id')

  // What the school's records said about this ID. Null means unverified, which
  // happens only when directory checking is switched off on the backend.
  const [verified, setVerified] = useState(null)

  // Only used in the fallback path, where the person still picks their own role.
  const [userType, setUserType] = useState('student')

  // No name is collected. An account is identified by the school's 5-digit ID
  // number, which is the key the school's records are looked up by.
  const [form, setForm] = useState({
    id_number: '', email: '', password: '', password_confirmation: '',
  })
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [retrySeconds, setRetrySeconds] = useState(0)
  const retryCountdown = useCountdown(retrySeconds)
  const { register } = useAuth()
  const navigate = useNavigate()

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  /**
   * Turn a failed request into one sentence for the banner. Validation errors
   * are preferred over the generic message because the backend words them for
   * the person reading them — "no longer active in the school records" tells
   * library staff far more than "registration failed".
   */
  const describeError = (err) => {
    if (!err?.response) {
      return 'Could not reach the server. Check that the backend is running and try again.'
    }
    const errs = err.response.data?.errors
    return errs
      ? Object.values(errs).flat().join(' ')
      : err.response.data?.message || 'Something went wrong. Please try again.'
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { data } = await authApi.verifyIdNumber(form.id_number)

      // Directory checking switched off: keep the original behaviour, where the
      // person chooses their own role and nothing is verified.
      setVerified(data.verification_required ? data : null)
      setStep('details')
      setRetrySeconds(0)
    } catch (err) {
      if (err?.response?.status === 429) {
        setRetrySeconds(getRetryAfterSeconds(err))
      } else {
        setRetrySeconds(0)
        setError(describeError(err))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!agree) { setError('You must agree to the Terms and Privacy Policy.'); return }
    if (form.password !== form.password_confirmation) { setError('Passwords do not match.'); return }
    setSubmitting(true)
    try {
      await register({
        id_number: form.id_number,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        // Ignored by the backend whenever verification is on — it takes the role
        // from the school's records, never from here. Still sent so the
        // switched-off path keeps working unchanged.
        role: verified?.role || userType,
      })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err?.response?.status === 429) {
        setRetrySeconds(getRetryAfterSeconds(err))
      } else {
        setRetrySeconds(0)
        setError(describeError(err))
        // A rejection naming the ID number means the problem is the ID itself —
        // claimed in the meantime, or the records changed between the two steps
        // — so send them back to the step that can actually fix it.
        if (err?.response?.data?.errors?.id_number) {
          setStep('id')
          setVerified(null)
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  const roleLabel = (role) => (role === 'teacher' ? 'Teacher' : 'Student')

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
          <p className="sub">
            {step === 'id'
              ? 'Start with your school ID number'
              : 'Set up your sign-in details'}
          </p>

          {/* Two bars rather than a percentage bar — with only two steps, a
              percentage reads as decoration. */}
          <div style={{display:'flex', gap:6, marginBottom:18}}>
            <span style={{flex:1, height:3, borderRadius:2, background:'var(--primary-blue)'}}></span>
            <span style={{flex:1, height:3, borderRadius:2,
                          background: step === 'details' ? 'var(--primary-blue)' : 'var(--border)'}}></span>
          </div>

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

          {step === 'id' ? (
            <form onSubmit={handleVerify}>
              <div className="form-group">
                <label className="form-label">School ID Number <span className="req">*</span></label>
                {/* type stays "text" so a leading zero survives — type="number"
                    would turn ID 01234 into 1234. inputMode gives phones the
                    number pad anyway. */}
                <input type="text" className="form-control" placeholder="e.g. 12345"
                       inputMode="numeric" pattern="\d{5}" maxLength={5}
                       title="Your 5-digit school ID number"
                       value={form.id_number}
                       onChange={e => update('id_number', e.target.value.replace(/\D/g, ''))}
                       autoFocus required />
                <small className="text-muted" style={{ fontSize: 11 }}>
                  We'll check this against the school's records. It's also what you'll use to sign in.
                </small>
              </div>

              <button type="submit" className="btn btn-primary"
                      disabled={submitting || retryCountdown > 0 || form.id_number.length !== 5}>
                <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-arrow-right'}`}></i>
                {retryCountdown > 0
                  ? ` Try again in ${retryCountdown}s`
                  : submitting ? ' Checking...' : ' Continue'}
              </button>

              <div className="auth-foot">
                Already have an account? <Link to="/login">Sign in</Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit}>
              {verified ? (
                <div className="notice-banner success" style={{marginBottom:18, alignItems:'flex-start'}}>
                  <i className="fas fa-circle-check"></i>
                  <span>
                    <strong>
                      {verified.first_name ? `Welcome, ${verified.first_name}` : 'ID number confirmed'}
                    </strong>
                    <br />
                    Registering as a {roleLabel(verified.role)}
                    {verified.program ? ` · ${verified.program}` : ''}
                  </span>
                </div>
              ) : (
                // Fallback: directory checking is switched off, so the role is
                // still self-declared and has to be asked for.
                // Colours come from the theme tokens, never literals — the
                // selected pill sits on --bg-white against a --bg-hover track,
                // which reads correctly in both themes.
                <div style={{display:'flex', gap:12, marginBottom:20, background:'var(--bg-hover)', padding:6, borderRadius:12}}>
                  <div onClick={() => setUserType('student')}
                       style={{flex:1, textAlign:'center', padding:'10px', borderRadius:8, cursor:'pointer',
                         background: userType==='student' ? 'var(--bg-white)' : 'transparent',
                         fontWeight:500, color: userType==='student' ? 'var(--primary-blue)' : 'var(--text-muted)',
                         boxShadow: userType==='student' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'}}>
                    <i className="fas fa-user-graduate" style={{marginRight:6}}></i> Student
                  </div>
                  <div onClick={() => setUserType('teacher')}
                       style={{flex:1, textAlign:'center', padding:'10px', borderRadius:8, cursor:'pointer',
                         background: userType==='teacher' ? 'var(--bg-white)' : 'transparent',
                         fontWeight:500, color: userType==='teacher' ? 'var(--primary-blue)' : 'var(--text-muted)',
                         boxShadow: userType==='teacher' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'}}>
                    <i className="fas fa-chalkboard-user" style={{marginRight:6}}></i> Teacher
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">ID Number</label>
                <div style={{display:'flex', gap:8, alignItems:'flex-start'}}>
                  {/* --bg-hover, not a literal: .form-control takes its text
                      colour from the theme, so hardcoding a light background
                      here left white text on a near-white box in dark mode. */}
                  <input type="text" className="form-control" value={form.id_number} readOnly
                         style={{flex:1, minWidth:0, background:'var(--bg-hover)', cursor:'not-allowed'}} />
                  {/* .btn is width:100% by default, which inside a flex row makes
                      the button swallow the whole line and squeeze the field to
                      nothing — so the width has to be reset here explicitly. */}
                  <button type="button" className="btn btn-secondary"
                          style={{flex:'none', width:'auto', whiteSpace:'nowrap'}}
                          onClick={() => { setStep('id'); setVerified(null); setError('') }}>
                    Change
                  </button>
                </div>
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
          )}
        </div>
      </div>
    </div>
  )
}
