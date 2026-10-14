import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, clearCsrf, csrf, download, upload } from './api'

const json = (body: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })

beforeEach(() => clearCsrf())
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

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
      vi.fn().mockResolvedValue(
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

describe('API client module', () => {
  it('creates ApiError with properties', () => {
    const error = new ApiError(422, 'Validation failed', { email: ['Required'] }, '30')
    expect(error.status).toBe(422)
    expect(error.message).toBe('Validation failed')
    expect(error.errors.email).toEqual(['Required'])
    expect(error.retryAfter).toBe('30')
    expect(error.name).toBe('ApiError')
  })

  it('forwards AbortSignal to fetch in download', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const controller = new AbortController()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_info, init) => {
      expect((init as RequestInit)?.signal).toBe(controller.signal)
      return {
        ok: true,
        status: 200,
        headers: new Headers({
          'Content-Disposition': 'attachment; filename="test.csv"',
          'Content-Type': 'text/csv',
        }),
        blob: async () => new Blob(['hello']),
      } as unknown as Response
    })

    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()

    await download('/test-download', 'test.csv', controller.signal)

    expect(fetchSpy).toHaveBeenCalled()
    fetchSpy.mockRestore()
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  })

  it('forwards AbortSignal to upload', async () => {
    const controller = new AbortController()
    const file = new File(['content'], 'sample.txt', { type: 'text/plain' })

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (String(url).includes('/csrf-token')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'Content-Type': 'application/json' }),
          json: async () => ({ csrf_token: 'fake-csrf' }),
        } as unknown as Response
      }
      expect((init as RequestInit)?.signal).toBe(controller.signal)
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ id: 101 }),
      } as unknown as Response
    })

    const result = await upload(1, file, 5, controller.signal)
    expect(result).toEqual({ id: 101 })
    fetchSpy.mockRestore()
  })
})
