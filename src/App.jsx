import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import RequireAdmin from './components/RequireAdmin'
import PdfViewer from './pages/PdfViewer'

import AdminDashboardPage       from './pages/AdminDashboardPage'
import CollectionManagementPage from './pages/CollectionManagementPage'
import ThesisUploadPage         from './pages/ThesisUploadPage'
import CategoryManagementPage   from './pages/CategoryManagementPage'
import UserManagementPage       from './pages/UserManagementPage'
import AuditLogsPage            from './pages/AuditLogsPage'
import ReportsPage              from './pages/ReportsPage'

import ThesisDetail from './pages/ThesisDetail'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import LandingPage from './pages/LandingPage'
import BrowsePage from './pages/BrowsePage'
import DashboardPage from './pages/DashboardPage'
import BookmarksPage from './pages/BookmarksPage'
import ProfilePage from './pages/ProfilePage'
import ReadingHistoryPage from './pages/ReadingHistoryPage'

function InLayout({ children, adminOnly = false }) {
  return (
    <ProtectedRoute adminOnly={adminOnly}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  )
}

function Admin({ children }) {
  return (
    <RequireAdmin>
      <Layout>{children}</Layout>
    </RequireAdmin>
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
      <Route path="/theses/:id" element={<InLayout><ThesisDetail /></InLayout>} />
      <Route path="/dashboard"  element={<InLayout><DashboardPage /></InLayout>} />
      <Route path="/browse"     element={<InLayout><BrowsePage /></InLayout>} />
      <Route path="/search"     element={<InLayout><PlaceholderPage title="Search" /></InLayout>} />

      <Route path="/viewer/:token" element={<ProtectedRoute><PdfViewer /></ProtectedRoute>} />
      <Route path="/bookmarks" element={<InLayout><BookmarksPage /></InLayout>} />
      <Route path="/favorites" element={<InLayout><BookmarksPage /></InLayout>} />
      <Route path="/history"   element={<InLayout><ReadingHistoryPage /></InLayout>} />
      <Route path="/profile"   element={<InLayout><ProfilePage /></InLayout>} />

      {/* Admin area */}
      <Route path="/admin"             element={<Admin><AdminDashboardPage /></Admin>} />
      <Route path="/admin/collections" element={<Admin><CollectionManagementPage /></Admin>} />
      <Route path="/admin/upload"      element={<Admin><ThesisUploadPage /></Admin>} />
      <Route path="/admin/categories"  element={<Admin><CategoryManagementPage /></Admin>} />
      <Route path="/admin/users"       element={<Admin><UserManagementPage /></Admin>} />
      <Route path="/admin/audit-logs"  element={<Admin><AuditLogsPage /></Admin>} />
      <Route path="/admin/reports"     element={<Admin><ReportsPage /></Admin>} />
    </Routes>
  )
}