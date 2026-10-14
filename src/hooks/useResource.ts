import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

interface ResourceState<T> {
  key: string
  data: T | null
  error: unknown
  fetched: boolean
}

/**
 * Fetches and optionally polls a JSON API endpoint.
 *
 * @param path    API-relative path (e.g. `/tickets?page=1`), or null to suspend fetching.
 * @param poll    Polling interval in milliseconds. 0 means no polling.
 * @param stop    Optional predicate: when it returns true, polling stops.
 */
export function useResource<T>(path: string | null, poll = 0, stop?: (value: T) => boolean) {
  const [revision, setRevision] = useState(0)
  const key = `${String(path)}:${revision}`

  const [state, setState] = useState<ResourceState<T>>({
    key: '',
    data: null,
    error: null,
    fetched: false,
  })

  // Keep stop-predicate in a ref so the effect never needs to re-run due to it changing
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
      // Avoid network round-trips while the tab is not visible (polling only)
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
        // Back off on error; use at least 15 s to avoid hammering a failing server
        if (poll) timer = setTimeout(load, Math.max(poll, 15_000))
      }
    }

    void load()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [path, key, poll])

  const refresh = useCallback(() => setRevision((v) => v + 1), [])

  // Expose stale data while the same path re-fetches (prevents flash of empty state)
  const pathKey = String(path)
  const statePathKey = state.key.slice(0, state.key.lastIndexOf(':'))

  return {
    data: statePathKey === pathKey ? state.data : null,
    error: state.key === key ? state.error : null,
    loading: !!path && (state.key !== key || !state.fetched),
    refresh,
  }
}
