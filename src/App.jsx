import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'

import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import LandingPage from './pages/LandingPage'
import SearchPage from './pages/SearchPage'
import BrowsePage from './pages/BrowsePage'
import DashboardPage from './pages/DashboardPage'

function InLayout({ children, adminOnly = false }) {
  return (
    <ProtectedRoute adminOnly={adminOnly}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  )
}

function HomeRedirect() {
  const { user, token } = useAuth()
  if (!token || !user) return <Navigate to="/login" replace />
  const isAdmin = user.role === 'super_admin' || user.role === 'staff' || user.role === 'admin'
  return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
}

function PlaceholderPage({ title, subtitle = 'This page is ready to be connected to its final screen.' }) {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="breadcrumb"><span>TIPIGANAN</span></div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body text-center">
          <i className="fas fa-layer-group text-primary-blue" style={{fontSize: 34, marginBottom: 12}}></i>
          <p className="text-muted mb-0">The route is working. Build the page content here next.</p>
        </div>
      </div>
    </>
  )
}

export default function App() {
  return (
     <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/home" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/LoginPage" element={<Navigate to="/login" replace />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Student area */}
      <Route path="/dashboard" element={<InLayout><PlaceholderPage title="Dashboard" /></InLayout>} />
      <Route path="/browse" element={<InLayout><BrowsePage /></InLayout>} />
      <Route path="/search" element={<InLayout><PlaceholderPage title="Search" /></InLayout>} />
      <Route path="/theses/:id" element={<InLayout><PlaceholderPage title="Thesis Details" /></InLayout>} />
      <Route path="/theses/:id/view" element={<ProtectedRoute><PlaceholderPage title="PDF Viewer" /></ProtectedRoute>} />
      <Route path="/bookmarks" element={<InLayout><PlaceholderPage title="My Bookmarks" /></InLayout>} />
      <Route path="/history" element={<InLayout><PlaceholderPage title="Reading History" /></InLayout>} />
      <Route path="/profile" element={<InLayout><PlaceholderPage title="My Profile" /></InLayout>} />

      {/* Admin area */}
      <Route path="/admin" element={<InLayout adminOnly><PlaceholderPage title="Admin Dashboard" /></InLayout>} />
      <Route path="/admin/theses" element={<InLayout adminOnly><PlaceholderPage title="Collection Management" /></InLayout>} />
      <Route path="/admin/upload" element={<InLayout adminOnly><PlaceholderPage title="Upload Item" /></InLayout>} />
      <Route path="/admin/categories" element={<InLayout adminOnly><PlaceholderPage title="Category Management" /></InLayout>} />
      <Route path="/admin/users" element={<InLayout adminOnly><PlaceholderPage title="User Management" /></InLayout>} />
      <Route path="/admin/audit-logs" element={<InLayout adminOnly><PlaceholderPage title="Audit Logs" /></InLayout>} />
      <Route path="/admin/reports" element={<InLayout adminOnly><PlaceholderPage title="Reports & Analytics" /></InLayout>} />

      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  )
}
