import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getRetryAfterSeconds, useCountdown } from '../utils/rateLimit'
import { MDC_LOGO } from '../config/branding'

export default function LoginPage() {
  const [idNumber, setIdNumber] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [retrySeconds, setRetrySeconds] = useState(0)
  const retryCountdown = useCountdown(retrySeconds)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSubmitting(true)
    try {
      const u = await login(idNumber, password)
      const isAdmin = u.role === 'super_admin' || u.role === 'staff' || u.role === 'admin'
      const from = location.state?.from?.pathname
      navigate(from || (isAdmin ? '/admin' : '/dashboard'), { replace: true })
    } catch (err) {
      if (err?.response?.status === 429) {
        setRetrySeconds(getRetryAfterSeconds(err))
      } else {
        setRetrySeconds(0)
        // No `response` at all means the request never got an answer back
        // (server down, wrong port, CORS block) — a completely different
        // problem from a rejected login, and worth telling apart so it
        // doesn't look like a wrong password.
        const msg = !err?.response
          ? 'Could not reach the server. Check that the backend is running and try again.'
          : err?.response?.data?.message
            || err?.response?.data?.errors?.id_number?.[0]
            || 'Invalid credentials'
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
        <div className="auth-card">
          {/* Only rendered on phones, where .auth-left (and the back link it
              carries) is hidden. */}
          <Link to="/" className="auth-back-mobile">
            <i className="fas fa-arrow-left"></i> Back to Home
          </Link>
          <h2>Welcome Back</h2>
          <p className="sub">Sign in to access the repository</p>

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
            <div className="form-group">
              <label className="form-label">ID Number <span className="req">*</span></label>
              {/* inputMode=numeric brings up the number pad on a phone, while
                  type stays "text" so a leading zero is preserved — type=number
                  would strip it and turn ID 01234 into 1234. */}
              <input type="text" className="form-control" placeholder="e.g. 12345"
                     inputMode="numeric" pattern="\d{5}" maxLength={5}
                     title="Your 5-digit school ID number"
                     autoComplete="username"
                     value={idNumber}
                     onChange={e => setIdNumber(e.target.value.replace(/\D/g, ''))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password <span className="req">*</span></label>
              <input type="password" className="form-control" placeholder="Enter your password"
                     value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            <div className="checkbox-row">
              <label><input type="checkbox" /> Remember me</label>
            </div>

            {/* There is no self-service password reset, by deliberate design —
                resets are staff-assisted only. The old "Forgot password?" link
                pointed at href="#", so it did nothing at all while promising a
                flow that does not exist. Telling people where to actually go is
                both honest and more useful than a dead link. */}
            <div className="auth-help">
              <i className="fas fa-circle-info"></i>
              <span>
                Forgot your password or account details? Visit the school library
                and ask the staff to help you reset it.
              </span>
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting || retryCountdown > 0}>
              <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-sign-in-alt'}`}></i>
              {retryCountdown > 0 ? ` Try again in ${retryCountdown}s` : submitting ? ' Signing in...' : ' Sign In'}
            </button>

            <div className="auth-foot">
              New to TIPIGANAN? <Link to="/register">Create an account</Link>
            </div>
          </form>

          <div className="auth-foot" style={{marginTop:30, fontSize:11}}>
            <i className="fas fa-lock"></i> Protected by encrypted authentication
          </div>
        </div>
      </div>
    </div>
  )
}
