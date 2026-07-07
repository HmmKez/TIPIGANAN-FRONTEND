import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Minimal login form. Only exists here because Read Online requires a
// token — a fuller login page is presumably being built by another
// team member.

export default function Login() {
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const next = sp.get('next') || '/browse'
  const { login } = useAuth()

  const [email, setEmail] = useState('student@tipiganan.com')
  const [password, setPassword] = useState('password')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setErr(null); setBusy(true)
    try {
      await login(email, password)
      nav(next)
    } catch (ex) {
      setErr(ex?.response?.data?.message || 'Login failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="brand center">
          <i className="fas fa-book-open" />
          <span>TIPIGANAN</span>
        </div>
        <h2>Sign in</h2>
        <p className="text-muted">Sign in to open thesis documents.</p>

        <label>Email
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>
        <label>Password
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </label>

        {err && <div className="error">{err}</div>}

        <button className="btn btn-primary block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="text-muted small">
          <Link to="/browse">← Continue browsing without signing in</Link>
        </div>
      </form>
    </div>
  )
}