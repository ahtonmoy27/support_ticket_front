import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronRight,
  Clock3,
  FileUp,
  Folder,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Ticket,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../providers/auth'
import { useToast } from '../providers/toast'
import { Button } from '../components/ui'
import { errorText, initials, label } from '../lib/utils'
export default function Workspace() {
  const { user, logout } = useAuth()
  const notify = useToast()
  const navigate = useNavigate()
  const [mobile, setMobile] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [search, setSearch] = useState('')
  if (!user) return null
  const links = [
    { to: '/dashboard', text: 'Overview', icon: LayoutDashboard },
    {
      to: '/tickets',
      text: user.role === 'customer' ? 'My tickets' : 'All tickets',
      icon: Ticket,
      end: true,
    },
    ...(user.role === 'agent'
      ? [
          { to: '/tickets?assigned_agent_id=' + user.id, text: 'Assigned to me', icon: Users },
          { to: '/tickets?unassigned=1', text: 'Available queue', icon: Folder },
        ]
      : []),
    { to: '/notifications', text: 'Notifications', icon: Bell },
  ]
  async function signOut() {
    setLeaving(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (e) {
      notify(errorText(e), 'error')
    } finally {
      setLeaving(false)
    }
  }
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={'sidebar ' + (mobile ? 'is-open' : '')}>
        <Link to="/dashboard" className="brand">
          <span className="brand-symbol">
            <MessageSquare size={22} />
          </span>
          <span>
            Support<span className="brand-light">Desk</span>
            <small>MAKE EVERY REPLY COUNT</small>
          </span>
        </Link>
        <button className="mobile-close" aria-label="Close menu" onClick={() => setMobile(false)}>
          <X size={20} />
        </button>
        <div className="workspace-switch">
          <span className="workspace-mark">S</span>
          <div>
            <strong>Support workspace</strong>
            <small>{label(user.role)} access</small>
          </div>
          <ChevronRight size={16} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {links.map((l) => (
            <NavLink
              key={l.text}
              to={l.to}
              end={l.end}
              onClick={() => setMobile(false)}
              className={({ isActive }) => 'nav-link ' + (isActive ? 'active' : '')}
            >
              <l.icon size={19} />
              <span>{l.text}</span>
            </NavLink>
          ))}
        </nav>
        {user.role === 'admin' && (
          <>
            <div className="nav-label">ADMINISTRATION</div>
            <nav aria-label="Administration">
              {[
                { to: '/admin/agents', text: 'Support agents', icon: Users },
                { to: '/admin/categories', text: 'Categories', icon: Folder },
                { to: '/admin/sla-policies', text: 'SLA & business hours', icon: Clock3 },
                { to: '/admin/imports', text: 'Ticket imports', icon: FileUp },
              ].map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobile(false)}
                  className={({ isActive }) => 'nav-link ' + (isActive ? 'active' : '')}
                >
                  <l.icon size={19} />
                  <span>{l.text}</span>
                </NavLink>
              ))}
            </nav>
          </>
        )}
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <LifeBuoy size={21} />
            <strong>A little clarity goes a long way.</strong>
            <p>Keep conversations in one place. Give every customer a clear next step.</p>
          </div>
          <div className="profile">
            <span className="avatar">{initials(user.name)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{label(user.role)}</small>
            </div>
            <Button variant="ghost" aria-label="Log out" busy={leaving} onClick={signOut}>
              <LogOut size={17} />
            </Button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <Button
              variant="ghost"
              className="mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </Button>
            <span className="topbar-crumb">
              Workspace <ChevronRight size={13} /> <strong>Support center</strong>
            </span>
          </div>
          <form
            className="global-search"
            onSubmit={(e) => {
              e.preventDefault()
              navigate('/tickets?q=' + encodeURIComponent(search))
            }}
          >
            <Search size={16} />
            <input
              aria-label="Search all permitted tickets"
              placeholder="Search tickets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd>↵</kbd>
          </form>
          <div className="topbar-right">
            <span className="secure-label">
              <ShieldCheck size={15} />
              Private workspace
            </span>
            <Link to="/notifications" className="icon-link" aria-label="Notifications">
              <Bell size={20} />
            </Link>
            <Link to="/tickets/create" className="button primary small">
              <Plus size={17} />
              <span>New ticket</span>
            </Link>
          </div>
        </header>
        <main className="page-content">
          <Outlet key={user.id + ':' + user.role} />
        </main>
        <footer className="workspace-footer">
          <span>
            <Settings2 size={13} />
            Support Desk · {label(user.role)} workspace
          </span>
          <span>Times shown in Asia/Dhaka</span>
        </footer>
      </div>
    </div>
  )
}
