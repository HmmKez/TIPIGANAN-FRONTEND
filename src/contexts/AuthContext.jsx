import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('tipiganan_user')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('tipiganan_token'))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Refresh user from backend on mount if we have a token
    if (token && !user) {
      setLoading(true)
      authApi.me()
        .then(res => {
          const u = res.data?.user || res.data
          setUser(u)
          localStorage.setItem('tipiganan_user', JSON.stringify(u))
        })
        .catch(() => { /* interceptor handles 401 */ })
        .finally(() => setLoading(false))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email, password) => {
    const res = await authApi.login(email, password)
    const { token: t, user: u } = res.data
    localStorage.setItem('tipiganan_token', t)
    localStorage.setItem('tipiganan_user', JSON.stringify(u))
    setToken(t); setUser(u)
    return u
  }

  const register = async (data) => {
    const res = await authApi.register(data)
    const { token: t, user: u } = res.data
    if (t) {
      localStorage.setItem('tipiganan_token', t)
      localStorage.setItem('tipiganan_user', JSON.stringify(u))
      setToken(t); setUser(u)
    }
    return u
  }

  const logout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    localStorage.removeItem('tipiganan_token')
    localStorage.removeItem('tipiganan_user')
    setToken(null); setUser(null)
  }

  const isAdmin = user && (user.role === 'super_admin' || user.role === 'staff' || user.role === 'admin')

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
