import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, X, AlertCircle } from 'lucide-react'
const Context = createContext<(message: string, kind?: 'success' | 'error') => void>(() => {})
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<
    { id: number; message: string; kind: 'success' | 'error' }[]
  >([])
  function notify(message: string, kind: 'success' | 'error' = 'success') {
    const id = Date.now() + Math.random()
    setToasts((v) => [...v, { id, message, kind }])
    setTimeout(() => setToasts((v) => v.filter((t) => t.id !== id)), 6000)
  }
  return (
    <Context.Provider value={notify}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div className={'toast ' + t.kind} key={t.id}>
            {t.kind === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span>{t.message}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => setToasts((v) => v.filter((x) => x.id !== t.id))}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </Context.Provider>
  )
}
export function useToast() {
  return useContext(Context)
}
