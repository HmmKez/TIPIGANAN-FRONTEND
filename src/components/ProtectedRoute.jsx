import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, token, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>
        <div style={{textAlign:'center'}}>
          <i className="fas fa-spinner fa-spin" style={{fontSize:32, color:'var(--primary-blue)'}}></i>
          <p style={{marginTop:12, color:'var(--text-muted)'}}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (adminOnly) {
    const isAdmin = user.role === 'super_admin' || user.role === 'staff' || user.role === 'admin'
    if (!isAdmin) return <Navigate to="/dashboard" replace />
  }

  return children
}
