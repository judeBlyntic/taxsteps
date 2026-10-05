'use client'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import { ICON } from './icons'

type Toast = { id: number; message: string; kind: 'success' | 'error' }
type ToastApi = { show: (message: string, kind?: Toast['kind']) => void }

const ToastContext = createContext<ToastApi>({ show: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)
  const show = useCallback((message: string, kind: Toast['kind'] = 'success') => {
    const id = nextId.current++
    setToasts((t) => [...t.slice(-2), { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3000)
  }, [])
  const api = useMemo(() => ({ show }), [show])
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast" data-kind={t.kind}>
            <span className="tick">{t.kind === 'error' ? <AlertTriangle {...ICON} /> : <Check {...ICON} />}</span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
