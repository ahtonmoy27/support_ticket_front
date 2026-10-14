import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '../types'
import { api, ApiError, clearCsrf } from '../lib/api'
type Auth = {
  user: User | null
  loading: boolean
  error: unknown
  retry: () => void
  authenticate: (path: string, body: unknown) => Promise<void>
  logout: () => Promise<void>
}

const Context = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [revision, setRevision] = useState(0)

  // Bootstrap: resolve the current session once (and on manual retry)
  useEffect(() => {
    const controller = new AbortController()
    api<{ data: User }>('/me', { signal: controller.signal })
      .then((r) => {
        if (!controller.signal.aborted) {
          setUser(r.data)
          setError(null)
          setLoading(false)
        }
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) {
          // A 401 simply means the user is not authenticated; that is not an error
          if (e instanceof ApiError && e.status === 401) {
            setUser(null)
            setError(null)
          } else {
            setError(e)
          }
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [revision])

  // Global logout signal dispatched by api.ts when the server returns 401
  useEffect(() => {
    const handler = () => {
      setUser(null)
      clearCsrf()
    }
    window.addEventListener('desk:unauthorized', handler)
    return () => window.removeEventListener('desk:unauthorized', handler)
  }, [])

  async function authenticate(path: string, body: unknown): Promise<void> {
    const r = await api<{ data: User }>(path, { method: 'POST', body })
    clearCsrf()
    setUser(r.data)
    setError(null)
  }

  async function logout(): Promise<void> {
    await api('/logout', { method: 'POST' })
    setUser(null)
    clearCsrf()
  }

  return (
    <Context.Provider
      value={{
        user,
        loading,
        error,
        authenticate,
        logout,
        retry: () => {
          setLoading(true)
          setRevision((v) => v + 1)
        },
      }}
    >
      {children}
    </Context.Provider>
  )
}

export function useAuth(): Auth {
  const value = useContext(Context)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.')
  return value
}
