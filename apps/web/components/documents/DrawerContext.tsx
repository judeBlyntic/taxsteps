'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Draft, DocumentRow } from '@taxsteps/core'
import { DocumentDrawer } from './DocumentDrawer'

type DrawerState = { kind: 'new'; draft?: Draft } | { kind: 'edit'; row: DocumentRow } | null
type DrawerApi = { openNew: (draft?: Draft) => void; openExisting: (row: DocumentRow) => void; close: () => void }

const DrawerContext = createContext<DrawerApi | null>(null)

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DrawerState>(null)
  const opener = useRef<Element | null>(null) // gets focus back when the drawer closes
  const open = useCallback((next: NonNullable<DrawerState>) => {
    opener.current ??= document.activeElement
    setState(next)
  }, [])
  const openNew = useCallback((draft?: Draft) => open({ kind: 'new', draft }), [open])
  const openExisting = useCallback((row: DocumentRow) => open({ kind: 'edit', row }), [open])
  const close = useCallback(() => setState(null), [])
  const api = useMemo(() => ({ openNew, openExisting, close }), [openNew, openExisting, close])

  useEffect(() => {
    const el = opener.current
    if (state || !el) return
    opener.current = null
    const target = el instanceof HTMLElement && el !== document.body ? el : null
    target?.focus()
    // No opener, or it's gone or hidden (e.g. the scan screen swaps its button for progress): use the page heading.
    if (!target || document.activeElement !== target) document.querySelector<HTMLElement>('h1')?.focus()
  }, [state])

  return (
    <DrawerContext.Provider value={api}>
      {children}
      {state && <DocumentDrawer key={state.kind === 'edit' ? state.row.id : state.draft?.id ?? 'new'} state={state} onClose={close} />}
    </DrawerContext.Provider>
  )
}

export function useDocumentDrawer(): DrawerApi {
  const api = useContext(DrawerContext)
  if (!api) throw new Error('useDocumentDrawer must be used inside <DrawerProvider>')
  return api
}
