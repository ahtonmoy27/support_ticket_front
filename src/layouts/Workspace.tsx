import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  BookOpen,
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
import { Button, PageSkeleton, TicketFormLink } from '../components/ui'
import { api } from '../lib/api'
import NotificationBell from '../components/NotificationBell'
import { CommandPalette } from '../components/CommandPalette'
import { errorText, initials, label } from '../lib/utils'

const UNREAD_POLL_MS = 60_000

export default function Workspace() {
  const { user, logout } = useAuth()
  const notify = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  function matchesScope(to: string) {
    if (to === '/tickets') return !query.get('assigned_agent_id') && !query.get('unassigned')
    return [...new URLSearchParams(to.split('?')[1])].every(
      ([key, value]) => query.get(key) === value,
    )
  }
  const [mobile, setMobile] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [search, setSearch] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Global Ctrl+K / Cmd+K Command Palette trigger
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const fetchUnread = useCallback(() => {
    api<{ count: number }>('/notifications/unread-count')
      .then((d) => setUnreadCount(d.count))
      .catch(() => {
        // Silently ignore – notification badge is non-critical
      })
  }, [])

  useEffect(() => {
    fetchUnread()
    const timer = setInterval(fetchUnread, UNREAD_POLL_MS)
    window.addEventListener('desk:notifications-changed', fetchUnread)
    return () => {
      clearInterval(timer)
      window.removeEventListener('desk:notifications-changed', fetchUnread)
    }
  }, [fetchUnread])

  // Close sidebar on Escape
  useEffect(() => {
    if (!mobile) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobile(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [mobile])

  // Prevent body scroll while mobile nav is open
  useEffect(() => {
    document.body.style.overflow = mobile ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobile])

  const closeMobile = useCallback(() => {
    setMobile(false)
  }, [])

  const openMobile = useCallback(() => {
    setMobile(true)
  }, [])

  const navLinks = useMemo(
    () => [
      { to: '/dashboard', text: 'Overview', icon: LayoutDashboard },
      {
        to: '/tickets',
        text: user?.role === 'customer' ? 'My tickets' : 'All tickets',
        icon: Ticket,
        end: true as const,
      },
      ...(user?.role === 'agent'
        ? [
            { to: `/tickets?assigned_agent_id=${user.id}`, text: 'Assigned to me', icon: Users },
            { to: '/tickets?unassigned=1', text: 'Available queue', icon: Folder },
          ]
        : []),
      {
        to: '/notifications',
        text: 'Notifications',
        icon: Bell,
        badge: unreadCount > 0 ? unreadCount : undefined,
      },
    ],
    [user?.role, user?.id, unreadCount],
  )

  const adminLinks = useMemo(
    () => [
      { to: '/admin/agents', text: 'Support agents', icon: Users },
      { to: '/admin/categories', text: 'Categories', icon: Folder },
      { to: '/admin/sla-policies', text: 'SLA & business hours', icon: Clock3 },
      { to: '/admin/imports', text: 'Ticket imports', icon: FileUp },
    ],
    [],
  )

  const signOut = useCallback(async () => {
    setLeaving(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (e) {
      notify(errorText(e), 'error')
    } finally {
      setLeaving(false)
    }
  }, [logout, navigate, notify])

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (search.trim()) navigate(`/tickets?q=${encodeURIComponent(search.trim())}`)
    },
    [search, navigate],
  )

  if (!user) return null

  return (
    <div className="app-shell">
      {/* Backdrop – closes sidebar when tapped on mobile */}
      {mobile && (
        <button className="sidebar-backdrop" aria-label="Close navigation" onClick={closeMobile} />
      )}

      <aside className={`sidebar${mobile ? ' is-open' : ''}`} aria-label="Primary navigation">
        <Link to="/dashboard" className="brand">
          <span className="brand-symbol">
            <MessageSquare size={22} />
          </span>
          <span>
            Support<span className="brand-light">Desk</span>
            <small>MAKE EVERY REPLY COUNT</small>
          </span>
        </Link>

        <button className="mobile-close" aria-label="Close menu" onClick={closeMobile}>
          <X size={20} />
        </button>

        <div className="workspace-switch">
          <span className="workspace-mark">S</span>
          <div>
            <strong>Support workspace</strong>
            <small>{label(user.role)} access</small>
          </div>
          <ChevronRight size={16} aria-hidden="true" />
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navLinks.map((l) => (
            <NavLink
              key={l.text}
              to={l.to}
              end={l.end}
              onClick={() => setMobile(false)}
              aria-current={matchesScope(l.to) ? undefined : false}
              className={({ isActive }) =>
                'nav-link ' + (isActive && matchesScope(l.to) ? 'active' : '')
              }
            >
              <l.icon size={19} aria-hidden="true" />
              <span>{l.text}</span>
              {l.badge !== undefined && (
                <span className="nav-badge" aria-label={`${l.badge} unread`}>
                  {l.badge > 99 ? '99+' : l.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {user.role === 'admin' && (
          <>
            <div className="nav-label">ADMINISTRATION</div>
            <nav aria-label="Administration">
              {adminLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={closeMobile}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                >
                  <l.icon size={19} aria-hidden="true" />
                  <span>{l.text}</span>
                </NavLink>
              ))}
            </nav>
          </>
        )}

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <LifeBuoy size={21} aria-hidden="true" />
            <strong>A little clarity goes a long way.</strong>
            <p>Keep conversations in one place. Give every customer a clear next step.</p>
          </div>
          <div className="profile">
            <span className="avatar" aria-hidden="true">
              {initials(user.name)}
            </span>
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
              aria-expanded={mobile}
              onClick={openMobile}
            >
              <Menu size={21} />
            </Button>
            <span className="topbar-crumb" aria-hidden="true">
              Workspace <ChevronRight size={13} /> <strong>Support center</strong>
            </span>
          </div>

          <form
            className="global-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault()
              setPaletteOpen(true)
            }}
            onClick={() => setPaletteOpen(true)}
            style={{ cursor: 'pointer' }}
          >
            <Search size={16} aria-hidden="true" />
            <input
              aria-label="Search all permitted tickets"
              placeholder="Search tickets or commands (Ctrl+K)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setPaletteOpen(true)}
              style={{ cursor: 'pointer' }}
            />
            <kbd>⌘K</kbd>
          </form>

          <div className="topbar-right">
            <span className="secure-label">
              <ShieldCheck size={15} aria-hidden="true" />
              Private workspace
            </span>
            <NotificationBell userId={user.id} unreadCount={unreadCount} />
            <TicketFormLink to="/tickets/create" className="button primary small">
              <Plus size={17} />
              <span>New ticket</span>
            </TicketFormLink>
          </div>
        </header>

        <main className="page-content">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet key={`${user.id}:${user.role}`} />
          </Suspense>
        </main>

        <footer className="workspace-footer">
          <span>
            <Settings2 size={13} aria-hidden="true" />
            Support Desk · {label(user.role)} workspace
          </span>
          <span>Times shown in Asia/Dhaka</span>
        </footer>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </div>
  )
}
