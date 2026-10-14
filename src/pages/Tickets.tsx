import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Filter, Plus, Search, X } from 'lucide-react'
import { useAuth } from '../providers/auth'
import { useResource } from '../hooks/useResource'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import {
  Empty,
  ErrorState,
  PageHeader,
  Pagination,
  TableSkeleton,
  TicketTable,
} from '../components/ui'
import { label, pageOf } from '../lib/utils'
import type { ApiPage, Category, Ticket, User } from '../types'
import { priorities, statuses } from '../types'

export default function Tickets() {
  useDocumentTitle('Tickets')
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') || '')
  const [advanced, setAdvanced] = useState(false)
  const categories = useResource<{ data: Category[] }>('/categories')
  const agents = useResource<ApiPage<User>>(
    user?.role === 'admin' ? '/admin/agents?page=' + (params.get('agent_page') || 1) : null,
  )
  const query = new URLSearchParams(params)
  query.delete('agent_page')
  const result = useResource<ApiPage<Ticket>>('/tickets?' + query.toString())
  const urlQuery = params.get('q') || ''
  useEffect(() => {
    setSearch(urlQuery)
  }, [urlQuery])
  useEffect(() => {
    if (search === urlQuery) return
    const timer = setTimeout(() => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          if (search) next.set('q', search)
          else next.delete('q')
          next.delete('page')
          return next
        },
        { replace: true },
      )
    }, 350)
    return () => clearTimeout(timer)
  }, [search, urlQuery, setParams])
  function filters(values: Record<string, string>) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      for (const [key, value] of Object.entries(values)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      if (Object.keys(values).some((key) => key !== 'page' && key !== 'agent_page'))
        next.delete('page')
      return next
    })
  }
  function filter(key: string, value: string) {
    filters({ [key]: value })
  }
  const page = result.data ? pageOf(result.data) : null
  return (
    <>
      <PageHeader
        title={user?.role === 'customer' ? 'My tickets' : 'Ticket workspace'}
        description="Every conversation, organized. Find what matters and take the next step."
        action={
          <Link className="button primary" to="/tickets/create">
            <Plus size={17} />
            New ticket
          </Link>
        }
      />
      <section className="panel">
        <div className="list-tabs">
          <button
            className={
              !params.get('assigned_agent_id') && !params.get('unassigned') ? 'selected' : ''
            }
            onClick={() => {
              filters({ assigned_agent_id: '', unassigned: '' })
            }}
          >
            {user?.role === 'customer' ? 'My requests' : 'All permitted tickets'}
          </button>
          {user?.role === 'agent' && (
            <button
              className={params.get('assigned_agent_id') ? 'selected' : ''}
              onClick={() => {
                filters({ unassigned: '', assigned_agent_id: String(user.id) })
              }}
            >
              Assigned to me
            </button>
          )}
          {user?.role !== 'customer' && (
            <button
              className={params.get('unassigned') ? 'selected' : ''}
              onClick={() => {
                filters({ assigned_agent_id: '', unassigned: '1' })
              }}
            >
              Unassigned queue
            </button>
          )}
          <span className="tab-total">{page?.total ?? '…'} tickets</span>
        </div>
        <div className="filter-bar">
          <div className="search-box">
            <Search size={17} />
            <input
              aria-label="Search tickets"
              placeholder="Search by ticket number or keyword…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Filter status"
            value={params.get('status') || ''}
            onChange={(e) => filter('status', e.target.value)}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter priority"
            value={params.get('priority') || ''}
            onChange={(e) => filter('priority', e.target.value)}
          >
            <option value="">All priorities</option>
            {priorities.map((p) => (
              <option key={p} value={p}>
                {label(p)}
              </option>
            ))}
          </select>
          <button
            className={'button secondary ' + (advanced ? 'selected' : '')}
            onClick={() => setAdvanced((v) => !v)}
          >
            <Filter size={16} />
            Filters
          </button>
        </div>
        {advanced && (
          <div className="advanced-filters">
            <label>
              Category
              <select
                value={params.get('category_id') || ''}
                onChange={(e) => filter('category_id', e.target.value)}
              >
                <option value="">All categories</option>
                {categories.data?.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              SLA state
              <select
                value={params.get('sla_state') || ''}
                onChange={(e) => filter('sla_state', e.target.value)}
              >
                <option value="">Any SLA state</option>
                <option value="within">Within SLA</option>
                <option value="warning">Approaching breach</option>
                <option value="breached">Breached</option>
              </select>
            </label>
            <label>
              Created from (UTC)
              <input
                type="date"
                value={params.get('from') || ''}
                onChange={(e) => filter('from', e.target.value)}
              />
            </label>
            <label>
              Created through (UTC)
              <input
                type="date"
                min={params.get('from') || undefined}
                value={params.get('to') || ''}
                onChange={(e) => filter('to', e.target.value)}
              />
            </label>
            {user?.role === 'admin' && (
              <>
                <label>
                  Assigned agent
                  <select
                    value={params.get('assigned_agent_id') || ''}
                    onChange={(e) => filter('assigned_agent_id', e.target.value)}
                  >
                    <option value="">Any agent</option>
                    {agents.data &&
                      pageOf(agents.data).items.map((a) => (
                        <option value={a.id} key={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                  {agents.data && pageOf(agents.data).last > 1 && (
                    <span className="inline-pages">
                      <button
                        type="button"
                        onClick={() =>
                          filter(
                            'agent_page',
                            String(Math.max(1, pageOf(agents.data!).current - 1)),
                          )
                        }
                      >
                        Previous agents
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          filter(
                            'agent_page',
                            String(
                              Math.min(pageOf(agents.data!).last, pageOf(agents.data!).current + 1),
                            ),
                          )
                        }
                      >
                        Next agents
                      </button>
                    </span>
                  )}
                </label>
                <label>
                  Customer ID
                  <input
                    type="number"
                    min="1"
                    placeholder="Optional customer ID"
                    value={params.get('customer_id') || ''}
                    onChange={(e) => filter('customer_id', e.target.value)}
                  />
                </label>
              </>
            )}
            <label>
              Rows per page
              <select
                value={params.get('per_page') || '25'}
                onChange={(e) => filter('per_page', e.target.value)}
              >
                {[10, 25, 50, 100].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        {params.size > 0 && (
          <div className="active-filters">
            <span>Filtered results</span>
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setParams({})
              }}
            >
              <X size={13} />
              Clear filters
            </button>
          </div>
        )}
        {result.loading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : result.error ? (
          <ErrorState error={result.error} retry={result.refresh} />
        ) : page && page.items.length ? (
          <>
            <TicketTable tickets={page.items} />
            <Pagination page={page} change={(n) => filter('page', String(n))} />
          </>
        ) : (
          <Empty
            title="No tickets found"
            text="Try another filter, or start a new support conversation."
            action={
              <Link to="/tickets/create" className="button secondary">
                Create a ticket
              </Link>
            }
          />
        )}
      </section>
      <p className="page-note">
        Only tickets permitted for your account are shown. SLA filters apply to active tickets.
      </p>
    </>
  )
}
