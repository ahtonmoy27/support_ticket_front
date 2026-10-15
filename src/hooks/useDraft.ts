import { useEffect, useRef, useState } from 'react'

/**
 * Persists form or editor state to localStorage as the user types.
 * Automatically restores unsaved draft on remount / tab recovery,
 * and provides clearDraft() to wipe it on successful submission.
 */
export function useDraft<T>(
  key: string,
  initialValue: T,
  enabled = true,
): [T, (val: T | ((prev: T) => T)) => void, () => void, boolean] {
  const [draftRestored, setDraftRestored] = useState(false)
  const isInitialized = useRef(false)

  // Initialize state from localStorage if draft exists
  const [value, setValue] = useState<T>(() => {
    if (!enabled || typeof window === 'undefined') return initialValue
    try {
      const saved = window.localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved) as T
        return parsed
      }
    } catch {
      // JSON parse error — ignore and use initial
    }
    return initialValue
  })

  // Detect whether a draft was restored
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    try {
      const saved = window.localStorage.getItem(key)
      if (saved) {
        setDraftRestored(true)
      }
    } catch {
      // ignore
    }
    isInitialized.current = true
  }, [key, enabled])

  // Sync state changes to localStorage
  useEffect(() => {
    if (!enabled || !isInitialized.current || typeof window === 'undefined') return

    try {
      // Check if value is empty/default
      const isEmpty =
        value === null ||
        value === undefined ||
        (typeof value === 'string' && value.trim() === '') ||
        (typeof value === 'object' && Object.values(value as Record<string, unknown>).every((v) => !v))

      if (isEmpty) {
        window.localStorage.removeItem(key)
        setDraftRestored(false)
      } else {
        window.localStorage.setItem(key, JSON.stringify(value))
      }
    } catch {
      // QuotaExceeded or security restrictions
    }
  }, [key, value, enabled])

  const clearDraft = () => {
    try {
      window.localStorage.removeItem(key)
      setDraftRestored(false)
    } catch {
      // ignore
    }
  }

  return [value, setValue, clearDraft, draftRestored]
}

