import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Bell, Check } from 'lucide-react'
import { useResource } from '../hooks/useResource'
import { useToast } from '../providers/toast'
import { api } from '../lib/api'
import { date, errorText, label, pageOf } from '../lib/utils'
import { Button, Empty, ErrorState, PageHeader, Pagination, TableSkeleton } from '../components/ui'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type { ApiPage, DeskNotification } from '../types'

export default function Notifications() {
  useDocumentTitle('Notifications')
  const [page, setPage] = useState(1)
  const result = useResource<ApiPage<DeskNotification>>('/notifications?page=' + page, 60000)
  useEffect(() => {
    window.addEventListener('desk:notifications-changed', result.refresh)
    return () => window.removeEventListener('desk:notifications-changed', result.refresh)
  }, [result.refresh])
  const notify = useToast()
  const [markingAll, setMarkingAll] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const hasUnread = result.data ? pageOf(result.data).items.some((n) => !n.read_at) : false

  async function markAllRead() {
    setMarkingAll(true)
    try {
      await api('/notifications/read-all', { method: 'POST' })
      result.refresh()
      window.dispatchEvent(new Event('desk:notifications-changed'))
      notify('All notifications marked as read', 'success')
    } catch (err) {
      notify(errorText(err), 'error')
    } finally {
      setMarkingAll(false)
    }
  }

  async function read(id: string) {
    setBusy(id)
    try {
      await api('/notifications/' + id + '/read', { method: 'PATCH' })
      result.refresh()
      window.dispatchEvent(new Event('desk:notifications-changed'))
    } catch (err) {
      notify(errorText(err), 'error')
    } finally {
      setBusy(null)
    }
  }
  return (
    <>
      <PageHeader
        title="Your notifications"
        description="The important updates, without the noise."
        action={
          hasUnread ? (
            <Button variant="secondary" busy={markingAll} onClick={markAllRead}>
              <Check size={16} />
              Mark all as read
            </Button>
          ) : undefined
        }
      />
      <section className="panel">
        {result.loading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : result.error ? (
          <ErrorState error={result.error} retry={result.refresh} />
        ) : (
          result.data && (
            <>
              {pageOf(result.data).items.length ? (
                <div className="notification-list">
                  {pageOf(result.data).items.map((n) => (
                    <article key={n.id} className={n.read_at ? 'read' : 'unread'}>
                      <span className="notification-icon">
                        <Bell size={19} />
                      </span>
                      <div>
                        <strong>
                          {label(n.data.event.replace('ticket.', '').replace('sla.', 'SLA '))}
                        </strong>
                        <p>
                          Ticket #{n.data.ticket_id} · {date(n.created_at)}
                        </p>
                        <Link className="text-link" to={'/tickets/' + n.data.ticket_id}>
                          View ticket
                          <ArrowUpRight size={14} />
                        </Link>
                      </div>
                      {!n.read_at && (
                        <Button variant="secondary" busy={busy === n.id} onClick={() => read(n.id)}>
                          <Check size={14} />
                          Mark read
                        </Button>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  title="You're all caught up"
                  text="New updates will appear here as background jobs deliver them."
                />
              )}
              <Pagination page={pageOf(result.data)} change={setPage} />
            </>
          )
        )}
      </section>
      <p className="page-note">Updates are asynchronous. Refreshes every minute while visible.</p>
    </>
  )
}
