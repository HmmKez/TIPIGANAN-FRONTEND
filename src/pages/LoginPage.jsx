import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSubmitting(true)
    try {
      const u = await login(email, password)
      const isAdmin = u.role === 'super_admin' || u.role === 'staff' || u.role === 'admin'
      const from = location.state?.from?.pathname
      navigate(from || (isAdmin ? '/admin' : '/dashboard'), { replace: true })
    } catch (err) {
      // No `response` at all means the request never got an answer back
      // (server down, wrong port, CORS block) — a completely different
      // problem from a rejected login, and worth telling apart so it
      // doesn't look like a wrong password.
      const msg = !err?.response
        ? 'Could not reach the server. Check that the backend is running and try again.'
        : err?.response?.data?.message
          || err?.response?.data?.errors?.email?.[0]
          || 'Invalid credentials'
      setError(msg)
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
          <img src="https://sis.materdeicollege.com/img/MDC-Logo-clipped.png" alt="MDC Logo" id="login-logo" />
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
          <h2>Welcome Back</h2>
          <p className="sub">Sign in to access the repository</p>

          {error && (
            <div className="notice-banner warning" style={{marginBottom:16}}>
              <i className="fas fa-exclamation-circle"></i><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email <span className="req">*</span></label>
              <input type="email" className="form-control" placeholder="student@mdc.edu.ph"
                     value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password <span className="req">*</span></label>
              <input type="password" className="form-control" placeholder="Enter your password"
                     value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            <div className="checkbox-row">
              <label><input type="checkbox" /> Remember me</label>
              <a href="#">Forgot password?</a>
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-sign-in-alt'}`}></i>
              {submitting ? ' Signing in...' : ' Sign In'}
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
