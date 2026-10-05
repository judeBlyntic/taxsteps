'use client'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { ICON } from './icons'

/** Accessible modal: focus moves in, Escape closes, backdrop click closes. */
export function Dialog({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const titleId = useId()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('input, button, select, textarea')?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); prev?.focus() }
  }, [onClose])
  return (
    <div className="modal-wrap" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3 id={titleId}>{title}</h3>
          <button type="button" className="btn btn-secondary btn-icon round" onClick={onClose} aria-label="Close"><X {...ICON} /></button>
        </div>
        {children}
        {footer && <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>{footer}</div>}
      </div>
    </div>
  )
}
