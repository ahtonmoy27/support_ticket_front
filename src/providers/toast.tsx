import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, X, AlertCircle } from 'lucide-react'

type ToastKind = 'success' | 'error'
type Notify = (message: string, kind?: ToastKind) => void

interface Toast {
  id: number
  message: string
  kind: ToastKind
}

const Context = createContext<Notify>(() => {})
const TOAST_DURATION_MS = 6_000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = useCallback<Notify>((message, kind = 'success') => {
    // Use a combination of timestamp and random to avoid collisions during rapid-fire calls
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, kind }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), TOAST_DURATION_MS)
  }, [])

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <Context.Provider value={notify}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div className={`toast ${t.kind}`} key={t.id} role="status">
            {t.kind === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span>{t.message}</span>
            <button aria-label="Dismiss notification" onClick={() => dismiss(t.id)}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </Context.Provider>
  )
}

export function useToast(): Notify {
  return useContext(Context)
}
