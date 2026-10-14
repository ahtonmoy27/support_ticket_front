import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import TicketDetail from './TicketDetail'
import type { Ticket } from '../types'

const fixture = vi.hoisted(
  () =>
    ({
      id: 42,
      ticket_number: 'TKT-2026-000042',
      subject: 'Customer request',
      description: 'Created on behalf of a customer',
      priority: 'medium',
      status: 'resolved',
      customer_id: 1,
      customer: { id: 1, name: 'Customer' },
      created_by: 2,
      creator: { id: 2, name: 'Admin Creator' },
      assigned_agent_id: null,
      category_id: 1,
      sla_started_at: '2026-10-14T09:00:00Z',
      sla_warning_at: '2026-10-15T09:00:00Z',
      sla_due_at: '2026-10-15T12:00:00Z',
      sla_breached_at: null,
      resolved_at: '2026-10-14T10:00:00Z',
      closed_at: null,
      sla_state: 'met',
      created_at: '2026-10-14T09:00:00Z',
      updated_at: '2026-10-14T10:00:00Z',
    }) satisfies Ticket,
)
vi.mock('../providers/auth', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Customer', role: 'customer', is_active: true } }),
}))
vi.mock('../providers/toast', () => ({ useToast: () => vi.fn() }))
vi.mock('../hooks/useResource', () => ({
  useResource: (path: string | null) => ({
    data:
      path === '/tickets/42'
        ? { data: fixture }
        : { data: [], meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 } },
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}))
afterEach(cleanup)
it('displays the creator separately from the requesting customer', () => {
  render(
    <MemoryRouter initialEntries={['/tickets/42']}>
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetail />} />
      </Routes>
    </MemoryRouter>,
  )
  expect(screen.getByText('Created by')).toBeDefined()
  expect(screen.getByText('Admin Creator')).toBeDefined()
  expect(screen.getByText('Customer', { selector: 'strong' })).toBeDefined()
})
