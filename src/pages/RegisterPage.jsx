import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../api/auth'
import { getRetryAfterSeconds, useCountdown } from '../utils/rateLimit'
import { MDC_LOGO } from '../config/branding'

/**
 * Account registration, in one of two forms depending on the backend.
 *
 *   single  The standard form: choose Student or Teacher, enter the school ID
 *           number, email and password, done. Used whenever ID verification is
 *           switched off — the default, and the state until the school's own
 *           records are available.
 *
 *   verify  Two steps: the ID number is checked against the school's records
 *           first, and only then is the person asked to set up the account, with
 *           their first name and role shown back to them. The role comes from
 *           the school rather than from a toggle here.
 *
 * The backend is asked which applies before anything is shown. The page used to
 * show the two-step form unconditionally, which made every registrant pass a
 * check that verified nothing — and meant the live page no longer matched the
 * form documented in the capstone paper.
 */
export default function RegisterPage() {
  const [mode, setMode] = useState('loading') // loading | single | verify

  // Two-step mode only: which step, and what the school's records said.
  const [step, setStep] = useState('id')
  const [verified, setVerified] = useState(null)

  // Single-step mode: the person chooses their own role.
  const [userType, setUserType] = useState('student')

  // No name is collected. An account is identified by the school's 5-digit ID
  // number, which is also what the person signs in with.
  const [form, setForm] = useState({
    id_number: '', email: '', password: '', password_confirmation: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [retrySeconds, setRetrySeconds] = useState(0)
  const retryCountdown = useCountdown(retrySeconds)
  const { register } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    authApi.registrationOptions()
      .then(({ data }) => setMode(data?.verification_required ? 'verify' : 'single'))
      // If the question itself fails, fall back to the standard form. That is
      // safe even when verification is on: the server re-checks the ID and
      // assigns the role itself on submit, whatever this page sent.
      .catch(() => setMode('single'))
  }, [])

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  /**
   * Turn a failed request into one sentence for the banner. Validation errors
   * are preferred over the generic message because the backend words them for
   * the person reading them.
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
    if (form.password !== form.password_confirmation) { setError('Passwords do not match.'); return }
    setSubmitting(true)
    try {
      await register({
        id_number: form.id_number,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        // Ignored by the backend whenever verification is on — it takes the
        // role from the school's records, never from here.
        role: verified?.role || userType,
      })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err?.response?.status === 429) {
        setRetrySeconds(getRetryAfterSeconds(err))
      } else {
        setRetrySeconds(0)
        setError(describeError(err))
        // In two-step mode, a rejection naming the ID number means the ID
        // itself is the problem, so go back to the step that can fix it.
        if (mode === 'verify' && err?.response?.data?.errors?.id_number) {
          setStep('id')
          setVerified(null)
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  const roleLabel = (role) => (role === 'teacher' ? 'Teacher' : 'Student')

  // ---------------------------------------------------------------- pieces

  // Colours come from theme tokens, never literals, so this reads correctly
  // in dark mode: the selected pill is --bg-white on a --bg-hover track.
  const roleToggle = () => (
    <div style={{display:'flex', gap:12, marginBottom:20, background:'var(--bg-hover)', padding:6, borderRadius:12}}>
      {['student', 'teacher'].map(type => (
        <div key={type} onClick={() => setUserType(type)}
             style={{flex:1, textAlign:'center', padding:'10px', borderRadius:8, cursor:'pointer',
               background: userType === type ? 'var(--bg-white)' : 'transparent',
               fontWeight:500, color: userType === type ? 'var(--primary-blue)' : 'var(--text-muted)',
               boxShadow: userType === type ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'}}>
          <i className={`fas ${type === 'student' ? 'fa-user-graduate' : 'fa-chalkboard-user'}`} style={{marginRight:6}}></i>
          {' '}{roleLabel(type)}
        </div>
      ))}
    </div>
  )

  // type stays "text" so a leading zero survives — type="number" would turn
  // ID 01234 into 1234. inputMode gives phones the number pad anyway.
  const idInput = (props = {}) => (
    <input type="text" className="form-control" placeholder="e.g. 12345"
           inputMode="numeric" pattern="\d{5}" maxLength={5}
           title="Your 5-digit school ID number"
           value={form.id_number}
           onChange={e => update('id_number', e.target.value.replace(/\D/g, ''))}
           required {...props} />
  )

  const accountFields = () => (
    <>
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

      {/* The "I agree to the Terms and Privacy Policy" checkbox was removed
          (2026-10-12): the library has no terms or privacy policy yet, so the
          box was required while both links went nowhere. Put it back, with
          real links, once those documents exist. The server never checked it. */}

      <button type="submit" className="btn btn-primary" disabled={submitting || retryCountdown > 0}>
        <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-user-plus'}`}></i>
        {retryCountdown > 0 ? ` Try again in ${retryCountdown}s` : submitting ? ' Creating account...' : ' Create Account'}
      </button>

      <div className="auth-foot">
        Already have an account? <Link to="/login">Sign in</Link>
      </div>
    </>
  )

  const errorBanner = () => (retryCountdown > 0 || error) && (
    <div className="notice-banner warning" style={{marginBottom:16}}>
      <i className="fas fa-exclamation-circle"></i>
      <span>
        {retryCountdown > 0
          ? `Too many attempts. Please try again in ${retryCountdown}s.`
          : error}
      </span>
    </div>
  )

  // ----------------------------------------------------------------- forms

  const singleStepForm = () => (
    <>
      <h2>Create Account</h2>
      <p className="sub">Register as a student or teacher</p>
      {errorBanner()}
      <form onSubmit={handleSubmit}>
        {roleToggle()}
        <div className="form-group">
          <label className="form-label">
            {roleLabel(userType)} ID Number <span className="req">*</span>
          </label>
          {idInput()}
          <small className="text-muted" style={{ fontSize: 11 }}>
            Your 5-digit school ID. This is what you'll use to sign in.
          </small>
        </div>
        {accountFields()}
      </form>
    </>
  )

  const twoStepForm = () => (
    <>
      <h2>Create Account</h2>
      <p className="sub">
        {step === 'id' ? 'Start with your school ID number' : 'Set up your sign-in details'}
      </p>

      {/* Two bars rather than a percentage bar — with only two steps, a
          percentage reads as decoration. */}
      <div style={{display:'flex', gap:6, marginBottom:18}}>
        <span style={{flex:1, height:3, borderRadius:2, background:'var(--primary-blue)'}}></span>
        <span style={{flex:1, height:3, borderRadius:2,
                      background: step === 'details' ? 'var(--primary-blue)' : 'var(--border)'}}></span>
      </div>

      {errorBanner()}

      {step === 'id' ? (
        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label className="form-label">School ID Number <span className="req">*</span></label>
            {idInput({ autoFocus: true })}
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
          ) : roleToggle()}

          <div className="form-group">
            <label className="form-label">ID Number</label>
            <div style={{display:'flex', gap:8, alignItems:'flex-start'}}>
              <input type="text" className="form-control" value={form.id_number} readOnly
                     style={{flex:1, minWidth:0, background:'var(--bg-hover)', cursor:'not-allowed'}} />
              {/* .btn is width:100% by default, which inside a flex row makes
                  the button swallow the whole line — reset it explicitly. */}
              <button type="button" className="btn btn-secondary"
                      style={{flex:'none', width:'auto', whiteSpace:'nowrap'}}
                      onClick={() => { setStep('id'); setVerified(null); setError('') }}>
                Change
              </button>
            </div>
          </div>

          {accountFields()}
        </form>
      )}
    </>
  )

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <Link to="/" className="auth-back">
          <i className="fas fa-arrow-left"></i> Back to Home
        </Link>
        <div className="auth-logo">
          <img src={MDC_LOGO} alt="MDC Logo" id="login-logo" />
        </div>
        <h1>TIPIGANAN</h1>
        <p>MDC Online Repository of Special and Rare Collections. Access digitally preserved thesis manuscripts from departments across Mater Dei College.</p>
        {/* Who may register, then what an account adds over browsing as a guest. */}
        <div className="auth-features">
          <div className="auth-features-note">For current Mater Dei College students and teachers, using your school ID number.</div>
          <div className="auth-features-title">With an account you can:</div>
          <div className="auth-feature"><i className="fas fa-book-open"></i> Read the full thesis, not just the abstract</div>
          <div className="auth-feature"><i className="fas fa-lock-open"></i> See restricted collections</div>
          <div className="auth-feature"><i className="fas fa-bookmark"></i> Save theses to your bookmarks</div>
          <div className="auth-feature"><i className="fas fa-flag"></i> Report a problem with a thesis</div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card" style={{maxWidth:480}}>
          {/* Only rendered on phones, where .auth-left (and the back link it
              carries) is hidden. */}
          <Link to="/" className="auth-back-mobile">
            <i className="fas fa-arrow-left"></i> Back to Home
          </Link>

          {mode === 'loading' && (
            <>
              <h2>Create Account</h2>
              <p className="sub"><i className="fas fa-spinner fa-spin"></i> Loading…</p>
            </>
          )}
          {mode === 'single' && singleStepForm()}
          {mode === 'verify' && twoStepForm()}
        </div>
      </div>
    </div>
  )
}
