import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowUpRight, Bell, Check, RefreshCw, X } from 'lucide-react'
import { api } from '../lib/api'
import { getEcho } from '../lib/echo'
import { playNotificationSound } from '../lib/sound'
import { date, errorText, label, pageOf } from '../lib/utils'
import { useResource } from '../hooks/useResource'
import { useToast } from '../providers/toast'
import type { ApiPage, DeskNotification } from '../types'
import { Button, Tooltip } from './ui'

type BroadcastNotification = {
  id?: string
  event?: string
  event_id?: number
  ticket_number?: string
  ticket_id?: number
}

export default function NotificationBell({
  userId,
  unreadCount,
}: {
  userId: number
  unreadCount: number
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const seen = useRef(new Set<string>())
  const initialized = useRef(false)
  const notify = useToast()
  const location = useLocation()
  const { data, loading, error, refresh } = useResource<ApiPage<DeskNotification>>(
    '/notifications?per_page=8',
    15_000,
  )
  const items = data ? pageOf(data).items : []

  useEffect(() => {
    if (!data) return
    const incoming = pageOf(data).items
    let changed = false
    for (const n of [...incoming].reverse()) {
      const key = `event:${n.data.event_id}`
      if (initialized.current && !n.read_at && !seen.current.has(key)) {
        playNotificationSound()
        notify(
          `${label(n.data.event.replace('ticket.', '').replace('sla.', 'SLA '))} · Ticket #${n.data.ticket_id}`,
        )
        changed = true
      }
      seen.current.add(key)
    }
    initialized.current = true
    if (changed) window.dispatchEvent(new Event('desk:notifications-changed'))
  }, [data, notify])

  useEffect(() => {
    const echo = getEcho()
    if (!echo) return
    const name = `App.Models.User.${userId}`
    const channel = echo.private(name)
    channel.notification((n: BroadcastNotification) => {
      const key = n.event_id != null ? `event:${n.event_id}` : `broadcast:${n.id}`
      if (!seen.current.has(key)) {
        seen.current.add(key)
        playNotificationSound()
        const title = label((n.event || 'update').replace('ticket.', '').replace('sla.', 'SLA '))
        const ticket = n.ticket_number || n.ticket_id
        notify(`New notification: ${title}${ticket ? ` · Ticket #${ticket}` : ''}`)
      }
      window.dispatchEvent(new Event('desk:notifications-changed'))
    })
    return () => {
      channel.stopListening('.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated')
      echo.leave(name)
    }
  }, [userId, notify])

  useEffect(() => {
    window.addEventListener('desk:notifications-changed', refresh)
    return () => window.removeEventListener('desk:notifications-changed', refresh)
  }, [refresh])

  useEffect(() => {
    if (!open) return
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    function keyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', keyboard)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', keyboard)
    }
  }, [open])

  async function markRead(id?: string) {
    setBusy(id || 'all')
    try {
      await api(id ? `/notifications/${id}/read` : '/notifications/read-all', {
        method: id ? 'PATCH' : 'POST',
      })
      window.dispatchEvent(new Event('desk:notifications-changed'))
    } catch (caught) {
      notify(errorText(caught), 'error')
    } finally {
      setBusy(null)
    }
  }

  // Closing on navigation also covers links elsewhere in the workspace.
  const [openedAt, setOpenedAt] = useState(location.key)
  const visible = open && openedAt === location.key

  return (
    <div className="notification-center" ref={root}>
      <button
        type="button"
        ref={trigger}
        className="icon-link notification-trigger"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={visible}
        aria-controls="notification-dropdown"
        onClick={() => {
          setOpen(!visible)
          setOpenedAt(location.key)
          if (!visible) refresh()
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-count" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {visible && (
        <section
          id="notification-dropdown"
          className="notification-dropdown"
          aria-label="Recent notifications"
        >
          <div className="notification-dropdown-heading">
            <div>
              <h2>Notifications</h2>
              <p>{unreadCount} unread updates</p>
            </div>
            <Button
              variant="ghost"
              aria-label="Close notifications"
              onClick={() => {
                setOpen(false)
                trigger.current?.focus()
              }}
            >
              <X size={17} />
            </Button>
          </div>
          <div className="notification-dropdown-tools">
            <Button variant="ghost" busy={loading} onClick={refresh}>
              <RefreshCw size={14} /> Refresh
            </Button>
            <Button
              variant="ghost"
              disabled={!unreadCount || !!busy}
              busy={busy === 'all'}
              onClick={() => void markRead()}
            >
              <Check size={14} /> Mark all read
            </Button>
          </div>
          <div className="notification-dropdown-list">
            {error ? (
              <div className="notification-dropdown-empty" role="alert">
                <p>{errorText(error)}</p>
                <Button variant="secondary" onClick={refresh}>
                  Try again
                </Button>
              </div>
            ) : loading && !data ? (
              <p className="notification-dropdown-empty" role="status">
                Loading notifications…
              </p>
            ) : !items.length ? (
              <div className="notification-dropdown-empty">
                <Bell size={26} />
                <h3>You're all caught up</h3>
                <p>New ticket updates will appear here.</p>
              </div>
            ) : (
              items.map((n) => (
                <article
                  key={n.id}
                  className={`notification-preview${!n.read_at ? ' unread' : ''}`}
                >
                  <span className="notification-preview-icon">
                    <Bell size={16} />
                  </span>
                  <div>
                    <Link
                      to={'/tickets/' + n.data.ticket_id}
                      onClick={() => {
                        setOpen(false)
                        if (!n.read_at) void markRead(n.id)
                      }}
                    >
                      <strong>
                        {label(n.data.event.replace('ticket.', '').replace('sla.', 'SLA '))}
                      </strong>
                      <p>Ticket #{n.data.ticket_id}</p>
                    </Link>
                    <Tooltip
                      content={`Received ${date(n.created_at)} (Asia/Dhaka). ${n.read_at ? 'Read ' + date(n.read_at) + '.' : 'Unread notification.'}`}
                    >
                      <small>{date(n.created_at)}</small>
                    </Tooltip>
                  </div>
                  {!n.read_at && (
                    <Button
                      variant="ghost"
                      aria-label={`Mark notification for ticket ${n.data.ticket_id} read`}
                      disabled={!!busy}
                      busy={busy === n.id}
                      onClick={() => void markRead(n.id)}
                    >
                      <Check size={15} />
                    </Button>
                  )}
                </article>
              ))
            )}
          </div>
          <Link
            className="notification-dropdown-footer"
            to="/notifications"
            onClick={() => setOpen(false)}
          >
            View all notifications <ArrowUpRight size={15} />
          </Link>
        </section>
      )}
    </div>
  )
}
