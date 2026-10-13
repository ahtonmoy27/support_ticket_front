import { Component } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './providers/auth'
import { ErrorState, Loading } from './components/ui'
import Workspace from './layouts/Workspace'
import AuthPage from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Tickets from './pages/Tickets'
import TicketForm from './pages/TicketForm'
import TicketDetail from './pages/TicketDetail'
import Notifications from './pages/Notifications'
import { Agents, Categories } from './pages/AdminPeople'
import SlaPolicies from './pages/SlaPolicies'
import { Imports, ImportDetail } from './pages/Imports'
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
class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    return this.state.error ? (
      <ErrorState error={this.state.error} retry={() => window.location.reload()} />
    ) : (
      this.props.children
    )
  }
}
export default function App() {
  const auth = useAuth()
  if (auth.loading)
    return (
      <div className="bootstrap-screen">
        <Loading label="Opening Support Desk…" />
      </div>
    )
  if (auth.error)
    return (
      <div className="bootstrap-screen">
        <ErrorState error={auth.error} retry={auth.retry} />
      </div>
    )
  return (
    <Boundary>
      <Routes>
        <Route path="/" element={<Navigate to={auth.user ? '/dashboard' : '/login'} replace />} />
        <Route path="/login" element={<AuthPage key="login" />} />
        <Route path="/register" element={<AuthPage key="register" register />} />
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
          <Route path="*" element={<ErrorState error={new Error('This page does not exist.')} />} />
        </Route>
      </Routes>
    </Boundary>
  )
}
