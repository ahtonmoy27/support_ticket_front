import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotificationBell from './NotificationBell'
import type { ApiPage, DeskNotification } from '../types'

const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  notify: vi.fn(),
  refresh: vi.fn(),
  leave: vi.fn(),
  stop: vi.fn(),
  listener: null as
    null | ((event: { event: string; event_id: number; ticket_id: number }) => void),
  data: null as ApiPage<DeskNotification> | null,
}))
vi.mock('../lib/api', async (original) => ({
  ...(await original<typeof import('../lib/api')>()),
  api: mocks.api,
}))
vi.mock('../providers/toast', () => ({ useToast: () => mocks.notify }))
vi.mock('../hooks/useResource', () => ({
  useResource: () => ({ data: mocks.data, loading: false, error: null, refresh: mocks.refresh }),
}))
vi.mock('../lib/echo', () => ({
  getEcho: () => ({
    private: () => ({
      notification: (fn: typeof mocks.listener) => {
        mocks.listener = fn
      },
      stopListening: mocks.stop,
    }),
    leave: mocks.leave,
  }),
}))

function feed(id: number): ApiPage<DeskNotification> {
  return {
    data: [
      {
        id: `n-${id}`,
        data: { event: 'ticket.assigned', event_id: id, ticket_id: 42 },
        read_at: null,
        created_at: '2026-10-15T08:00:00Z',
      },
    ],
    meta: { current_page: 1, last_page: 1, per_page: 8, total: 1 },
  }
}
function View() {
  return (
    <MemoryRouter>
      <NotificationBell userId={7} unreadCount={1} />
    </MemoryRouter>
  )
}
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mocks.data = null
  mocks.listener = null
})

it('opens the list, marks read with the existing endpoint, and dismisses on Escape/outside click', async () => {
  mocks.data = feed(1)
  mocks.api.mockResolvedValue({})
  render(<View />)
  expect(mocks.notify).not.toHaveBeenCalled()
  const bell = screen.getByRole('button', { name: 'Notifications, 1 unread' })
  fireEvent.click(bell)
  expect(screen.getByRole('region', { name: 'Recent notifications' })).toBeDefined()
  expect(screen.getByRole('link', { name: /Assigned/ }).getAttribute('href')).toBe('/tickets/42')
  fireEvent.click(screen.getByRole('button', { name: 'Mark notification for ticket 42 read' }))
  await waitFor(() =>
    expect(mocks.api).toHaveBeenCalledWith('/notifications/n-1/read', { method: 'PATCH' }),
  )
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('region', { name: 'Recent notifications' })).toBeNull()
  expect(document.activeElement).toBe(bell)
  fireEvent.click(bell)
  fireEvent.pointerDown(document.body)
  expect(screen.queryByRole('region', { name: 'Recent notifications' })).toBeNull()
})

it('shows each realtime event once and does not repeat it when polling catches up', () => {
  mocks.data = feed(1)
  const view = render(<View />)
  expect(mocks.notify).not.toHaveBeenCalled()
  const event = { event: 'ticket.assigned', event_id: 2, ticket_id: 42 }
  mocks.listener?.(event)
  mocks.listener?.(event)
  expect(mocks.notify).toHaveBeenCalledTimes(1)
  expect(mocks.refresh).toHaveBeenCalled()
  mocks.data = feed(2)
  view.rerender(<View />)
  expect(mocks.notify).toHaveBeenCalledTimes(1)
  mocks.data = feed(3)
  view.rerender(<View />)
  expect(mocks.notify).toHaveBeenCalledTimes(2)
  view.unmount()
  expect(mocks.leave).toHaveBeenCalledWith('App.Models.User.7')
})
