import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import NotificationBell from './NotificationBell'
import { ToastProvider } from '../providers/toast'

const realtime = vi.hoisted(() => ({
  listener: null as
    | null
    | ((event: {
        event: string
        event_id: number
        ticket_id: number
        ticket_number: string
      }) => void),
  refresh: vi.fn(),
  leave: vi.fn(),
}))
vi.mock('../hooks/useResource', () => ({
  useResource: () => ({
    data: { data: [], meta: { current_page: 1, last_page: 1, total: 0, per_page: 8 } },
    loading: false,
    error: null,
    refresh: realtime.refresh,
  }),
}))
vi.mock('../lib/echo', () => ({
  getEcho: () => ({
    private: () => ({
      notification: (listener: typeof realtime.listener) => {
        realtime.listener = listener
      },
      stopListening: vi.fn(),
    }),
    leave: realtime.leave,
  }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  realtime.listener = null
})

it('renders an actual toast immediately on broadcast without waiting for polling and deduplicates redelivery', () => {
  const view = render(
    <MemoryRouter>
      <ToastProvider>
        <NotificationBell userId={1} unreadCount={0} />
      </ToastProvider>
    </MemoryRouter>,
  )
  const event = {
    event: 'ticket.created',
    event_id: 100,
    ticket_id: 8,
    ticket_number: 'TKT-2026-000008',
  }
  expect(screen.queryByRole('status')).toBeNull()
  act(() => {
    realtime.listener?.(event)
  })
  expect(screen.getByRole('status').textContent).toContain(
    'New notification: Created · Ticket #TKT-2026-000008',
  )
  act(() => {
    realtime.listener?.(event)
  })
  expect(screen.getAllByRole('status')).toHaveLength(1)
  expect(realtime.refresh).toHaveBeenCalled()
  view.unmount()
  expect(realtime.leave).toHaveBeenCalledWith('App.Models.User.1')
})
