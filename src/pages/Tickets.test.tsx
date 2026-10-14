import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import Tickets from './Tickets'
vi.mock('../providers/auth', () => ({ useAuth: () => ({ user: { id: 7, role: 'agent' } }) }))
vi.mock('../hooks/useResource', () => ({
  useResource: () => ({ data: null, loading: false, error: null }),
}))
function Location() {
  return <output data-testid="location">{useLocation().search}</output>
}
afterEach(cleanup)
describe('ticket queue filters', () => {
  it.each([
    ['Assigned to me', '?unassigned=1&page=3&priority=high', 'assigned_agent_id=7', 'unassigned'],
    [
      'Unassigned queue',
      '?assigned_agent_id=7&page=3&priority=high',
      'unassigned=1',
      'assigned_agent_id',
    ],
    [
      'All permitted tickets',
      '?assigned_agent_id=7&unassigned=1&page=3&priority=high',
      'priority=high',
      'assigned_agent_id',
    ],
  ])('switches %s atomically', (tab, query, included, excluded) => {
    render(
      <MemoryRouter initialEntries={['/tickets' + query]}>
        <Tickets />
        <Location />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: tab }))
    const next = screen.getByTestId('location').textContent!
    expect(next).toContain(included)
    expect(new URLSearchParams(next).has(excluded)).toBe(false)
    expect(new URLSearchParams(next).has('page')).toBe(false)
    if (tab === 'All permitted tickets')
      expect(new URLSearchParams(next).has('unassigned')).toBe(false)
  })
})
