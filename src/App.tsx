import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './providers/auth'
import { ErrorBoundary, ErrorState, Loading, PageSkeleton } from './components/ui'
import Workspace from './layouts/Workspace'

// Lazy load route pages for optimal bundle splitting
const AuthPage = lazy(() => import('./pages/Auth'))
const PasswordReset = lazy(() => import('./pages/PasswordReset'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Tickets = lazy(() => import('./pages/Tickets'))
const TicketForm = lazy(() => import('./pages/TicketForm'))
const TicketDetail = lazy(() => import('./pages/TicketDetail'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Agents = lazy(() => import('./pages/AdminPeople').then((m) => ({ default: m.Agents })))
const Categories = lazy(() =>
  import('./pages/AdminPeople').then((m) => ({ default: m.Categories })),
)
const SlaPolicies = lazy(() => import('./pages/SlaPolicies'))
const Imports = lazy(() => import('./pages/Imports').then((m) => ({ default: m.Imports })))
const ImportDetail = lazy(() =>
  import('./pages/Imports').then((m) => ({ default: m.ImportDetail })),
)

function Protected() {
  const { user } = useAuth()
  const location = useLocation()
  return user ? (
    <Workspace key={user.id} />
  ) : (
    <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  )
}

function AdminOnly() {
  const { user } = useAuth()
  return user?.role === 'admin' ? (
    <Outlet />
  ) : (
    <ErrorState error={new Error('Administrator access is required for this page.')} />
  )
}

export default function App() {
  const auth = useAuth()

  if (auth.loading) {
    return (
      <div className="bootstrap-screen">
        <Loading label="Opening Support Desk…" />
      </div>
    )
  }

  if (auth.error) {
    return (
      <div className="bootstrap-screen">
        <ErrorState error={auth.error} retry={auth.retry} />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<Navigate to={auth.user ? '/dashboard' : '/login'} replace />} />
          <Route path="/login" element={<AuthPage key="login" />} />
          <Route path="/register" element={<AuthPage key="register" register />} />
          <Route path="/forgot-password" element={<PasswordReset />} />
          <Route element={<Protected />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/tickets/create" element={<TicketForm />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route path="/tickets/:id/edit" element={<TicketForm />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route element={<AdminOnly />}>
              <Route path="/admin/agents" element={<Agents />} />
              <Route path="/admin/categories" element={<Categories />} />
              <Route path="/admin/sla-policies" element={<SlaPolicies />} />
              <Route path="/admin/imports" element={<Imports />} />
              <Route path="/admin/imports/:id" element={<ImportDetail />} />
            </Route>
            <Route
              path="*"
              element={<ErrorState error={new Error('This page does not exist.')} />}
            />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
