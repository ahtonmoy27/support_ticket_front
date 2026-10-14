import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { api, ApiError } from '../lib/api'
import { useResource } from './useResource'
vi.mock('../lib/api', async (original) => ({
  ...(await original<typeof import('../lib/api')>()),
  api: vi.fn(),
}))
beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.mocked(api).mockReset()
})

describe('resource polling', () => {
  it.each([401, 403, 404, 422])(
    'stops automatic requests after HTTP %s but allows manual retry',
    async (status) => {
      vi.mocked(api).mockRejectedValue(new ApiError(status, 'Unavailable'))
      const { result } = renderHook(() => useResource('/admin/imports/1', 5000))
      await act(async () => {})
      expect(result.current.error).toBeInstanceOf(ApiError)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(120000)
      })
      expect(api).toHaveBeenCalledTimes(1)
      await act(async () => result.current.refresh())
      expect(api).toHaveBeenCalledTimes(2)
    },
  )

  it('honors Retry-After before retrying a throttled request', async () => {
    vi.mocked(api)
      .mockRejectedValueOnce(new ApiError(429, 'Wait', {}, '60'))
      .mockResolvedValue({ done: true })
    renderHook(() => useResource('/admin/imports/1', 5000, () => true))
    await act(async () => {})
    await act(async () => {
      await vi.advanceTimersByTimeAsync(59999)
    })
    expect(api).toHaveBeenCalledTimes(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(api).toHaveBeenCalledTimes(2)
  })

  it('stops after an import completes', async () => {
    vi.mocked(api).mockResolvedValue({ data: { status: 'completed' } })
    renderHook(() =>
      useResource<{ data: { status: string } }>(
        '/admin/imports/1',
        5000,
        (value) => value.data.status === 'completed',
      ),
    )
    await act(async () => {})
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120000)
    })
    expect(api).toHaveBeenCalledTimes(1)
  })
})
