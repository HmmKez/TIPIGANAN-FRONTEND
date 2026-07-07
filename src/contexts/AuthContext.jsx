import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../api/auth'

const AuthContext = createContext(null)

function readPermissions() {
  try {
    const raw = localStorage.getItem('tipiganan_permissions')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('tipiganan_user')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('tipiganan_token'))
  const [permissions, setPermissions] = useState(readPermissions)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Refresh user from backend on mount if we have a token
    if (token && !user) {
      setLoading(true)
      authApi.me()
        .then(res => {
          const u = res.data?.user || res.data
          const p = res.data?.permissions || []
          setUser(u); setPermissions(p)
          localStorage.setItem('tipiganan_user', JSON.stringify(u))
          localStorage.setItem('tipiganan_permissions', JSON.stringify(p))
        })
        .catch(() => { /* interceptor handles 401 */ })
        .finally(() => setLoading(false))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email, password) => {
    const res = await authApi.login(email, password)
    const { token: t, user: u, permissions: p } = res.data
    localStorage.setItem('tipiganan_token', t)
    localStorage.setItem('tipiganan_user', JSON.stringify(u))
    localStorage.setItem('tipiganan_permissions', JSON.stringify(p || []))
    setToken(t); setUser(u); setPermissions(p || [])
    return u
  }

  const register = async (data) => {
    const res = await authApi.register(data)
    const { token: t, user: u, permissions: p } = res.data
    if (t) {
      localStorage.setItem('tipiganan_token', t)
      localStorage.setItem('tipiganan_user', JSON.stringify(u))
      localStorage.setItem('tipiganan_permissions', JSON.stringify(p || []))
      setToken(t); setUser(u); setPermissions(p || [])
    }
    return u
  }

  const logout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    localStorage.removeItem('tipiganan_token')
    localStorage.removeItem('tipiganan_user')
    localStorage.removeItem('tipiganan_permissions')
    setToken(null); setUser(null); setPermissions([])
  }

  const isAdmin = user && (user.role === 'super_admin' || user.role === 'staff' || user.role === 'admin')
  const hasPermission = (name) => user?.role === 'super_admin' || permissions.includes(name)

  return (
    <AuthContext.Provider value={{ user, token, permissions, loading, login, register, logout, isAdmin, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
