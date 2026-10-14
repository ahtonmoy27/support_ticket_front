import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AuthProvider, useAuth } from './auth'
import { api, clearCsrf } from '../lib/api'
function Probe() {
  const { user, loading, authenticate } = useAuth()
  if (loading) return <p>Loading session</p>
  return (
    <>
      <p>{user?.name || 'Guest'}</p>
      <button
        onClick={() =>
          void authenticate('/login', { email: 'customer@example.com', password: 'test-password' })
        }
      >
        Log in
      </button>
      <button onClick={() => void api('/tickets', { method: 'POST', body: {} })}>
        Create ticket
      </button>
    </>
  )
}
afterEach(() => {
  cleanup()
  clearCsrf()
  vi.unstubAllGlobals()
})
it('discards the guest CSRF token after login and obtains the authenticated token on the next mutation', async () => {
  const fetch = vi.fn().mockImplementation(async (path: string, options?: RequestInit) => {
    let body: unknown = { data: {} },
      status = 200
    if (path.endsWith('/me')) {
      body = { message: 'Unauthenticated.' }
      status = 401
    }
    if (path.endsWith('/csrf-token'))
      body = {
        csrf_token: fetch.mock.calls.some(([url]) => url === '/api/v1/login')
          ? 'authenticated-token'
          : 'guest-token',
      }
    if (path.endsWith('/login'))
      body = { data: { id: 1, name: 'Customer', role: 'customer', is_active: true } }
    if (path.endsWith('/tickets'))
      expect(new Headers(options?.headers).get('X-CSRF-TOKEN')).toBe('authenticated-token')
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetch)
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
  await screen.findByText('Guest')
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
  await screen.findByText('Customer')
  expect(fetch.mock.calls.filter(([url]) => url === '/api/v1/csrf-token')).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Create ticket' }))
  await vi.waitFor(() =>
    expect(fetch.mock.calls.filter(([url]) => url === '/api/v1/tickets')).toHaveLength(1),
  )
  expect(fetch.mock.calls.filter(([url]) => url === '/api/v1/csrf-token')).toHaveLength(2)
})
