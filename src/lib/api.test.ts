import { describe, expect, it, vi } from 'vitest'
import { ApiError, download, upload } from './api'

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
