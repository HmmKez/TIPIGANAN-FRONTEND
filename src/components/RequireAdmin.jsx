// Simple route guard for admin pages. Reads role from localStorage user
// (populated by your login page). Redirects non-admins to the student dashboard.

import { Navigate } from 'react-router-dom'

export default function RequireAdmin({ children }) {
  const token = localStorage.getItem('tipiganan_token')
  let user = null
  try { user = JSON.parse(localStorage.getItem('tipiganan_user') || 'null') } catch {}

  if (!token || !user) return <Navigate to="/login" replace />
  if (user.role !== 'staff' && user.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />
  }
  return children
}
