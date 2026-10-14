import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'

vi.mock('../providers/auth', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Admin', role: 'admin' } }),
}))
vi.mock('../hooks/useResource', () => ({
  useResource: (path: string) => ({
    loading: false,
    error: null,
    refresh: vi.fn(),
    data:
      path === '/dashboard'
        ? {
            data: {
              by_status: {},
              by_priority: {},
              unassigned: 2,
              sla_warning: 0,
              sla_breached: 0,
              by_agent: [
                { assigned_agent_id: 7, name: 'Assigned agent', total: 3 },
                { assigned_agent_id: null, name: 'Unassigned', total: 2 },
              ],
            },
          }
        : { data: [], meta: { current_page: 1, last_page: 1, per_page: 5, total: 0 } },
  }),
}))

afterEach(cleanup)

it('links scoped agent totals and the unassigned bucket to filtered queues', () => {
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )
  expect(screen.getByRole('heading', { name: 'Tickets by agent' })).toBeTruthy()
  expect(screen.getByRole('link', { name: /^Assigned agent\s*3$/ }).getAttribute('href')).toBe(
    '/tickets?assigned_agent_id=7',
  )
  expect(screen.getByRole('link', { name: /^Unassigned\s*2$/ }).getAttribute('href')).toBe(
    '/tickets?unassigned=1',
  )
})
