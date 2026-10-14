import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../lib/api'
export function useResource<T>(path: string | null, poll = 0, stop?: (value: T) => boolean) {
  const [revision, setRevision] = useState(0)
  const key = String(path) + ':' + revision
  const [state, setState] = useState<{
    key: string
    data: T | null
    error: unknown
    fetched: boolean
  }>({ key: '', data: null, error: null, fetched: false })
  const stopRef = useRef(stop)
  useEffect(() => {
    stopRef.current = stop
  }, [stop])
  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    async function load() {
      if (controller.signal.aborted) return
      if (document.hidden && poll) {
        timer = setTimeout(load, poll)
        return
      }
      try {
        const data = await api<T>(path!, { signal: controller.signal })
        if (controller.signal.aborted) return
        setState({ key, data, error: null, fetched: true })
        if (poll && !stopRef.current?.(data)) timer = setTimeout(load, poll)
      } catch (error) {
        if (controller.signal.aborted) return
        setState({ key, data: null, error, fetched: true })
        const terminal = error instanceof ApiError && [401, 403, 404, 422].includes(error.status)
        if (poll && !terminal) {
          const retryAfter = error instanceof ApiError && error.retryAfter ? error.retryAfter : null
          const delay =
            retryAfter === null
              ? 0
              : /^\d+$/.test(retryAfter)
                ? Number(retryAfter) * 1000
                : Math.max(0, Date.parse(retryAfter) - Date.now()) || 0
          timer = setTimeout(load, Math.max(poll, 15000, delay))
        }
      }
    }
    void load()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [path, key, poll])
  const refresh = useCallback(() => setRevision((v) => v + 1), [])
  return {
    data: state.key.slice(0, state.key.lastIndexOf(':')) === String(path) ? state.data : null,
    error: state.key === key ? state.error : null,
    loading: !!path && (state.key !== key || !state.fetched),
    refresh,
  }
}
