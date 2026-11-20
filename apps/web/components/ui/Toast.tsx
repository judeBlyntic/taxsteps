'use client'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Check, X } from 'lucide-react'
import { ICON } from './icons'

type Toast = { id: number; message: string; kind: 'success' | 'error' }
type ToastApi = { show: (message: string, kind?: Toast['kind']) => void }

const ToastContext = createContext<ToastApi>({ show: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const show = useCallback((message: string, kind: Toast['kind'] = 'success') => {
    const id = nextId.current++
    setToasts((t) => [...t.slice(-2), { id, message, kind }])
    if (kind === 'success') setTimeout(() => dismiss(id), 3000) // errors stay until dismissed, so there's time to read them
  }, [dismiss])
  const api = useMemo(() => ({ show }), [show])
  const list = (kind: Toast['kind']) => toasts.filter((t) => t.kind === kind).map((t) => (
    <div key={t.id} className="toast" data-kind={t.kind}>
      <span className="tick">{t.kind === 'error' ? <AlertTriangle {...ICON} /> : <Check {...ICON} />}</span>
      {t.message}
      <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}><X {...ICON} /></button>
    </div>
  ))
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region">
        <div role="status">{list('success')}</div>
        <div role="alert">{list('error')}</div>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
