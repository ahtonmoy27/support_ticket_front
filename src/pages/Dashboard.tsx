import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Inbox,
  Plus,
  RefreshCw,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react'
import { useAuth } from '../providers/auth'
import { useResource } from '../hooks/useResource'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import {
  Badge,
  Button,
  CardSkeleton,
  Empty,
  ErrorState,
  PageHeader,
  TableSkeleton,
  TicketTable,
} from '../components/ui'
import { label, pageOf } from '../lib/utils'
import type { ApiPage, Metrics, Ticket as TicketType } from '../types'
import { priorities, statuses } from '../types'

export default function Dashboard() {
  useDocumentTitle('Dashboard')
  const { user } = useAuth()
  const metrics = useResource<{ data: Metrics }>('/dashboard', 45000)
  const tickets = useResource<ApiPage<TicketType>>('/tickets?per_page=5')
  const m = metrics.data?.data
  const counts = m
    ? [
        {
          name: 'Open tickets',
          value: Number(m.by_status.open || 0),
          icon: Ticket,
          tone: 'green',
          to: '/tickets?status=open',
          text: 'Ready for the next step',
        },
        {
          name: 'Unassigned',
          value: m.unassigned,
          icon: Users,
          tone: 'blue',
          to: '/tickets?unassigned=1',
          text: 'Waiting for an owner',
        },
        {
          name: 'Approaching SLA',
          value: m.sla_warning,
          icon: Clock3,
          tone: 'amber',
          to: '/tickets?sla_state=warning',
          text: 'A timely reply matters',
        },
        {
          name: 'SLA breached',
          value: m.sla_breached,
          icon: ShieldCheck,
          tone: 'red',
          to: '/tickets?sla_state=breached',
          text: 'Needs your attention',
        },
      ]
    : []
  const priorityTotal = m
    ? priorities.reduce((sum, p) => sum + Number(m.by_priority[p] || 0), 0)
    : 0
  return (
    <>
      <PageHeader
        eyebrow="A CLEARER PICTURE"
        title={'Hello, ' + (user?.name.split(' ')[0] || 'there') + '.'}
        description="Every request is a chance to make someone's day a little easier."
        action={
          <Button
            variant="secondary"
            onClick={() => {
              metrics.refresh()
              tickets.refresh()
            }}
          >
            <RefreshCw size={16} />
            Refresh overview
          </Button>
        }
      />
      <section className="welcome-strip">
        <div>
          <span className="welcome-label">
            <span className="live-dot" />
            YOUR WORKSPACE, AT A GLANCE
          </span>
          <h2>Less noise. More meaningful support.</h2>
          <p>Stay on top of requests, keep commitments, and move conversations forward.</p>
          <Link to="/tickets/create" className="button light">
            <Plus size={17} />
            Create a ticket
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-card">
            <Inbox size={35} />
            <span>
              One place.
              <br />
              <strong>Every conversation.</strong>
            </span>
            <span className="art-check">✓</span>
          </div>
        </div>
      </section>
      {metrics.loading ? (
        <CardSkeleton count={4} />
      ) : metrics.error ? (
        <ErrorState error={metrics.error} retry={metrics.refresh} />
      ) : (
        m && (
          <>
            <section className="metrics-grid">
              {counts.map((c) => (
                <Link key={c.name} to={c.to} className={'metric-card ' + c.tone}>
                  <div className="metric-top">
                    <span>{c.name}</span>
                    <span className="metric-icon">
                      <c.icon size={20} />
                    </span>
                  </div>
                  <strong>{c.value}</strong>
                  <div className="metric-bottom">
                    <span>{c.text}</span>
                    <ArrowUpRight size={16} />
                  </div>
                </Link>
              ))}
            </section>
            <div className="dashboard-columns">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Tickets by priority</h2>
                    <p>All statuses in your permitted scope</p>
                  </div>
                  <span className="subtle-chip">{priorityTotal} total</span>
                </div>
                <div className="priority-bars">
                  {[...priorities].reverse().map((p) => {
                    const count = Number(m.by_priority[p] || 0)
                    return (
                      <Link to={'/tickets?priority=' + p} className="priority-row" key={p}>
                        <div>
                          <Badge type="priority" value={p} />
                          <strong>{count}</strong>
                        </div>
                        <div className="bar-track">
                          <span
                            className={p}
                            style={{
                              width: priorityTotal ? (count / priorityTotal) * 100 + '%' : '0%',
                            }}
                          />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Conversation progress</h2>
                    <p>A place for every next step</p>
                  </div>
                  <ArrowDownRight size={22} />
                </div>
                <div className="status-summary">
                  {statuses.map((s) => (
                    <Link to={'/tickets?status=' + s} key={s}>
                      <span>
                        <span className={'status-dot ' + s} />
                        {label(s)}
                      </span>
                      <strong>{Number(m.by_status[s] || 0)}</strong>
                      <ArrowRight size={14} />
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </>
        )
      )}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Latest tickets</h2>
            <p>The most recent requests you can access</p>
          </div>
          <Link to="/tickets" className="text-link">
            View all tickets
            <ArrowRight size={15} />
          </Link>
        </div>
        {tickets.loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : tickets.error ? (
          <ErrorState error={tickets.error} retry={tickets.refresh} />
        ) : tickets.data && pageOf(tickets.data).items.length ? (
          <TicketTable compact tickets={pageOf(tickets.data).items} />
        ) : (
          <Empty
            title="A fresh start"
            text="Your support requests will appear here."
            action={
              <Link className="button secondary" to="/tickets/create">
                Create your first ticket
              </Link>
            }
          />
        )}
      </section>
      <p className="page-note">
        Metrics refresh while this tab is visible. Dashboard totals may take up to 30 seconds to
        reflect changes.
      </p>
    </>
  )
}
