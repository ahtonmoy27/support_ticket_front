import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '../types'
import { api, ApiError, clearCsrf, refreshCsrf } from '../lib/api'
type Auth = { user: User | null; loading: boolean; error: unknown; retry: () => void; authenticate: (path: string, body: unknown) => Promise<void>; logout: () => Promise<void> }
const Context = createContext<Auth | null>(null)
export function AuthProvider({ children }: { children: ReactNode }) {
 const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<unknown>(null); const [revision, setRevision] = useState(0)
 useEffect(() => {
  const c = new AbortController()
  api<{ data: User }>('/me', { signal: c.signal }).then(r => { if (!c.signal.aborted) { setUser(r.data); setError(null); setLoading(false) } }).catch(e => { if (!c.signal.aborted) { if (e instanceof ApiError && e.status === 401) { setUser(null); setError(null) } else setError(e); setLoading(false) } })
  return () => c.abort()
 }, [revision])
 useEffect(() => { const handler = () => { setUser(null); clearCsrf() }; window.addEventListener('desk:unauthorized', handler); return () => window.removeEventListener('desk:unauthorized', handler) }, [])
 async function authenticate(path: string, body: unknown) { const r = await api<{ data: User }>(path, { method: 'POST', body }); setUser(r.data); setError(null); await refreshCsrf() }
 async function logout() { await api('/logout', { method: 'POST' }); setUser(null); clearCsrf() }
 return <Context.Provider value={{ user, loading, error, authenticate, logout, retry: () => { setLoading(true); setRevision(v => v + 1) } }}>{children}</Context.Provider>
}
export function useAuth() { const value = useContext(Context); if (!value) throw new Error('Auth provider missing.'); return value }

