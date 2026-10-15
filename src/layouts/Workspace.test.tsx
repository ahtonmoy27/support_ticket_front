import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Workspace from './Workspace'
import { api } from '../lib/api'
vi.mock('../providers/auth', () => ({
  useAuth: () => ({
    user: { id: 7, name: 'Agent', role: 'agent', is_active: true },
    logout: vi.fn(),
  }),
}))
vi.mock('../providers/toast', () => ({ useToast: () => vi.fn() }))
vi.mock('../lib/api', () => ({ api: vi.fn() }))
vi.mock('../components/NotificationBell', () => ({
  default: ({ unreadCount }: { unreadCount: number }) => (
    <button aria-label={`Notifications, ${unreadCount} unread`} />
  ),
}))
afterEach(() => {
  cleanup()
  vi.mocked(api).mockReset()
})
it('shows current notification count and refreshes it immediately after a read action', async () => {
  vi.mocked(api).mockResolvedValueOnce({ count: 3 }).mockResolvedValueOnce({ count: 0 })
  render(
    <MemoryRouter initialEntries={['/tickets?unassigned=1']}>
      <Workspace />
    </MemoryRouter>,
  )
  await screen.findByRole('button', { name: 'Notifications, 3 unread' })
  expect(screen.getByRole('link', { name: 'Available queue' }).className).toContain('active')
  expect(screen.getByRole('link', { name: 'Assigned to me' }).className).not.toContain('active')
  expect(screen.getByRole('link', { name: 'All tickets' }).className).not.toContain('active')
  fireEvent(window, new Event('desk:notifications-changed'))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Notifications, 0 unread' })).toBeDefined(),
  )
  expect(api).toHaveBeenCalledTimes(2)
})
