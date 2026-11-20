'use client'
import { useEffect, useEffectEvent, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { ICON } from './icons'

/**
 * Makes everything outside `el` inert (unfocusable, unclickable, hidden from screen readers) so a
 * modal really is modal. Live regions stay reachable so toasts are still announced. Returns the undo.
 */
export function inertOutside(el: Element): () => void {
  const changed: Element[] = []
  for (let node = el, parent = el.parentElement; parent && node !== document.body; node = parent, parent = parent.parentElement) {
    for (const sibling of parent.children) {
      if (sibling === node || sibling.hasAttribute('inert') || sibling.matches('[aria-live], script')) continue
      sibling.setAttribute('inert', '')
      changed.push(sibling)
    }
  }
  return () => changed.forEach((s) => s.removeAttribute('inert'))
}

/** Accessible modal: focus moves in and stays in, Escape closes, backdrop click closes, focus goes back on close. */
export function Dialog({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const titleId = useId()
  const ref = useRef<HTMLDivElement>(null)
  const onEscape = useEffectEvent(onClose)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const undo = inertOutside(ref.current!)
    ref.current?.querySelector<HTMLElement>('input, button, select, textarea')?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onEscape() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); undo(); prev?.focus() }
  }, [])
  return (
    <div className="modal-wrap" ref={ref} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
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
