import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Clock3,
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
  TicketFormLink,
  Tooltip,
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
          name: 'Critical tickets',
          value: Number(m.by_priority.critical || 0),
          icon: ShieldCheck,
          tone: 'red',
          to: '/tickets?priority=critical',
          text: 'Across all statuses',
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
        {
          name: 'Resolved tickets',
          value: Number(m.by_status.resolved || 0),
          icon: Ticket,
          tone: 'green',
          to: '/tickets?status=resolved',
          text: 'Resolution completed',
        },
      ]
    : []
  const priorityTotal = m
    ? priorities.reduce((sum, p) => sum + Number(m.by_priority[p] || 0), 0)
    : 0
  const activeTotal = m
    ? ['open', 'in_progress', 'waiting_for_customer'].reduce(
        (sum, status) => sum + Number(m.by_status[status as keyof Metrics['by_status']] || 0),
        0,
      )
    : 0
  const health = [
    {
      name: 'Within SLA',
      count: Math.max(0, activeTotal - Number(m?.sla_warning || 0) - Number(m?.sla_breached || 0)),
      color: '#0f8f6b',
      filter: 'within',
    },
    {
      name: 'Approaching breach',
      count: Number(m?.sla_warning || 0),
      color: '#d49a36',
      filter: 'warning',
    },
    {
      name: 'SLA breached',
      count: Number(m?.sla_breached || 0),
      color: '#ce2f47',
      filter: 'breached',
    },
  ]
  const circumference = 2 * Math.PI * 52
  return (
    <>
      <PageHeader
        eyebrow="SUPPORT OPERATIONS"
        title="Dashboard"
        description={
          'Welcome back, ' +
          (user?.name.split(' ')[0] || 'there') +
          '. Here is your support overview.'
        }
        action={
          <>
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
            <TicketFormLink to="/tickets/create" className="button primary">
              <Plus size={16} /> New ticket
            </TicketFormLink>
          </>
        }
      />
      {metrics.loading ? (
        <CardSkeleton count={6} />
      ) : metrics.error ? (
        <ErrorState error={metrics.error} retry={metrics.refresh} />
      ) : (
        m && (
          <>
            <section className="metrics-grid">
              {counts.map((c) => (
                <Tooltip
                  key={c.name}
                  className="metric-tooltip"
                  focusable={false}
                  content={
                    <>
                      <strong>
                        {c.name}: {c.value}
                      </strong>
                      <p>{c.text}. Select to view matching tickets in your permitted scope.</p>
                    </>
                  }
                >
                  <Link to={c.to} className={'metric-card ' + c.tone}>
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
                </Tooltip>
              ))}
            </section>
            <div className="dashboard-columns">
              <section className="panel sla-overview-panel">
                <div className="panel-heading">
                  <div>
                    <h2>SLA health</h2>
                    <p>Active tickets in your permitted scope</p>
                  </div>
                </div>
                <div className="sla-health">
                  <svg
                    className="sla-health-ring"
                    viewBox="0 0 140 140"
                    role="img"
                    aria-label={`${activeTotal} active tickets. ${health.map((item) => `${item.name}: ${item.count}`).join('. ')}`}
                  >
                    <circle cx="70" cy="70" r="52" fill="none" stroke="#edf1f5" strokeWidth="14" />
                    {health.map((item, index) => (
                      <circle
                        key={item.filter}
                        cx="70"
                        cy="70"
                        r="52"
                        fill="none"
                        stroke={item.color}
                        strokeWidth="14"
                        strokeDasharray={`${activeTotal ? (item.count / activeTotal) * circumference : 0} ${circumference}`}
                        strokeDashoffset={
                          (-health
                            .slice(0, index)
                            .reduce((sum, previous) => sum + previous.count, 0) /
                            (activeTotal || 1)) *
                          circumference
                        }
                        transform="rotate(-90 70 70)"
                      />
                    ))}
                    <text x="70" y="69" textAnchor="middle">
                      {activeTotal}
                    </text>
                    <text className="ring-caption" x="70" y="87" textAnchor="middle">
                      ACTIVE TICKETS
                    </text>
                  </svg>
                  <div className="sla-health-legend">
                    {health.map((item) => (
                      <Link key={item.filter} to={'/tickets?sla_state=' + item.filter}>
                        <span className="health-dot" style={{ background: item.color }} />
                        <span>{item.name}</span>
                        <strong>{item.count}</strong>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
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
            <h2>Tickets by agent</h2>
            <p>All statuses in your permitted scope</p>
          </div>
        </div>
        {metrics.loading ? (
          <TableSkeleton rows={3} cols={2} />
        ) : metrics.error ? (
          <ErrorState error={metrics.error} retry={metrics.refresh} />
        ) : m?.by_agent?.length ? (
          <div className="status-summary">
            {m.by_agent.map((agent) => (
              <Link
                key={agent.assigned_agent_id ?? 'unassigned'}
                to={
                  agent.assigned_agent_id === null
                    ? '/tickets?unassigned=1'
                    : '/tickets?assigned_agent_id=' + agent.assigned_agent_id
                }
              >
                <span>{agent.name}</span>
                <strong>{agent.total}</strong>
                <ArrowRight size={14} />
              </Link>
            ))}
          </div>
        ) : (
          <Empty
            title="No agent totals yet"
            text="Assigned and unassigned ticket totals will appear here."
          />
        )}
      </section>
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
              <TicketFormLink className="button secondary" to="/tickets/create">
                Create your first ticket
              </TicketFormLink>
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
