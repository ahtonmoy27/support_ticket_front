import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, clearCsrf, csrf } from './api'

const json = (body: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })

beforeEach(() => clearCsrf())
afterEach(() => vi.unstubAllGlobals())

describe('Laravel session API contract', () => {
  it('shares one CSRF request and sends session cookies with JSON mutations', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({ csrf_token: 'session-token' }))
      .mockImplementation(() => Promise.resolve(json({ data: { id: 1 } })))
    vi.stubGlobal('fetch', fetch)
    await Promise.all([
      api('/tickets', { method: 'POST', body: { subject: 'One' } }),
      api('/tickets', { method: 'POST', body: { subject: 'Two' } }),
    ])
    expect(fetch.mock.calls.filter(([url]) => url === '/api/v1/csrf-token')).toHaveLength(1)
    for (const [, options] of fetch.mock.calls.slice(1)) {
      expect(options.credentials).toBe('same-origin')
      expect(options.headers.get('X-CSRF-TOKEN')).toBe('session-token')
      expect(options.headers.get('Content-Type')).toBe('application/json')
    }
  })

  it('keeps multipart boundaries under browser control', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({ csrf_token: 'token' }))
      .mockResolvedValue(json({ data: {} }))
    vi.stubGlobal('fetch', fetch)
    const body = new FormData()
    body.append('file', new File(['test'], 'test.txt'))
    await api('/tickets/1/attachments', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'wrong' },
    })
    const options = fetch.mock.calls[1][1]
    expect(options.body).toBe(body)
    expect(options.headers.has('Content-Type')).toBe(false)
  })

  it('refreshes expired CSRF without replaying a mutation', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({ csrf_token: 'expired' }))
      .mockResolvedValueOnce(json({ message: 'CSRF token mismatch.' }, 419))
      .mockResolvedValueOnce(json({ csrf_token: 'fresh' }))
    vi.stubGlobal('fetch', fetch)
    await expect(api('/tickets', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 419,
    })
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(3))
    expect(fetch.mock.calls.filter(([url]) => url === '/api/v1/tickets')).toHaveLength(1)
    expect(await csrf()).toBe('fresh')
  })

  it('preserves validation fields and rate-limit headers', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          json({ message: 'Wait.', errors: { subject: ['Required.'] } }, 429, {
            'Retry-After': '60',
          }),
        ),
    )
    await expect(api('/tickets')).rejects.toMatchObject({
      status: 429,
      errors: { subject: ['Required.'] },
      retryAfter: '60',
    })
  })

  it('rejects an invalid CSRF token before sending a mutation', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ csrf_token: {} }))
    vi.stubGlobal('fetch', fetch)
    await expect(api('/tickets', { method: 'POST', body: {} })).rejects.toThrow(
      'Invalid CSRF response',
    )
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('notifies the auth provider when a session expires', async () => {
    const listener = vi.fn()
    window.addEventListener('desk:unauthorized', listener)
    try {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ message: 'Unauthenticated.' }, 401)))
      await expect(api('/me')).rejects.toBeInstanceOf(ApiError)
      expect(listener).toHaveBeenCalledOnce()
    } finally {
      window.removeEventListener('desk:unauthorized', listener)
    }
  })
})
