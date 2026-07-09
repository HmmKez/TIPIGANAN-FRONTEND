import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import RequireAdmin from './components/RequireAdmin'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { Loader } from './components/Loader'

// Every page is its own chunk, fetched only when a user actually navigates
// there, instead of one bundle containing the whole app up front.
const PdfViewer               = lazy(() => import('./pages/PdfViewer'))
const AdminDashboardPage       = lazy(() => import('./pages/AdminDashboardPage'))
const CollectionManagementPage = lazy(() => import('./pages/CollectionManagementPage'))
const ThesisUploadPage         = lazy(() => import('./pages/ThesisUploadPage'))
const ThesisEditPage           = lazy(() => import('./pages/ThesisEditPage'))
const CategoryManagementPage   = lazy(() => import('./pages/CategoryManagementPage'))
const UserManagementPage       = lazy(() => import('./pages/UserManagementPage'))
const AuditLogsPage            = lazy(() => import('./pages/AuditLogsPage'))
const ReportsPage              = lazy(() => import('./pages/ReportsPage'))
const ReportedItemsPage        = lazy(() => import('./pages/ReportedItemsPage'))
const ThesisDetail             = lazy(() => import('./pages/ThesisDetail'))
const LoginPage                = lazy(() => import('./pages/LoginPage'))
const RegisterPage             = lazy(() => import('./pages/RegisterPage'))
const LandingPage              = lazy(() => import('./pages/LandingPage'))
const BrowsePage                = lazy(() => import('./pages/BrowsePage'))
const SearchPage                = lazy(() => import('./pages/SearchPage'))
const DashboardPage             = lazy(() => import('./pages/DashboardPage'))
const BookmarksPage             = lazy(() => import('./pages/BookmarksPage'))
const ProfilePage               = lazy(() => import('./pages/ProfilePage'))
const ReadingHistoryPage        = lazy(() => import('./pages/ReadingHistoryPage'))

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

// Browse, Search, and Thesis Detail are viewable by guests — the backend
// already allows public access to /theses, /theses/{id}, and /search.
// Only actually opening a PDF (the /viewer route) requires login.
function PublicLayout({ children }) {
  return <Layout>{children}</Layout>
}

function HomeRedirect() {
  const { user, token } = useAuth()
  if (!token || !user) return <Navigate to="/login" replace />
  const isAdmin = user.role === 'super_admin' || user.role === 'staff' || user.role === 'admin'
  return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
}

export default function App() {
  return (
    <Suspense fallback={<Loader label="Loading page…" />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/LoginPage" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Public browsing — guests can browse, search, and view thesis details */}
        <Route path="/theses/:id" element={<PublicLayout><ThesisDetail /></PublicLayout>} />
        <Route path="/browse"     element={<PublicLayout><BrowsePage /></PublicLayout>} />
        <Route path="/search"     element={<PublicLayout><SearchPage /></PublicLayout>} />

        {/* Student area */}
        <Route path="/dashboard"  element={<InLayout><DashboardPage /></InLayout>} />

        <Route path="/viewer/:token" element={<ProtectedRoute><PdfViewer /></ProtectedRoute>} />
        <Route path="/bookmarks" element={<InLayout><BookmarksPage /></InLayout>} />
        <Route path="/favorites" element={<InLayout><BookmarksPage /></InLayout>} />
        <Route path="/history"   element={<InLayout><ReadingHistoryPage /></InLayout>} />
        <Route path="/profile"   element={<InLayout><ProfilePage /></InLayout>} />

        {/* Admin area */}
        <Route path="/admin"             element={<Admin><AdminDashboardPage /></Admin>} />
        <Route path="/admin/collections" element={<Admin><CollectionManagementPage /></Admin>} />
        <Route path="/admin/upload"      element={<Admin><ThesisUploadPage /></Admin>} />
        <Route path="/admin/theses/:id/edit" element={<Admin><ThesisEditPage /></Admin>} />
        <Route path="/admin/categories"  element={<Admin><CategoryManagementPage /></Admin>} />
        <Route path="/admin/users"       element={<Admin><UserManagementPage /></Admin>} />
        <Route path="/admin/audit-logs"  element={<Admin><AuditLogsPage /></Admin>} />
        <Route path="/admin/reports"     element={<Admin><ReportsPage /></Admin>} />
        <Route path="/admin/reported-items" element={<Admin><ReportedItemsPage /></Admin>} />
      </Routes>
    </Suspense>
  )
}
