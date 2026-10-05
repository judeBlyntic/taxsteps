'use client'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Draft, DocumentRow } from '@taxsteps/core'
import { DocumentDrawer } from './DocumentDrawer'

type DrawerState = { kind: 'new'; draft?: Draft } | { kind: 'edit'; row: DocumentRow } | null
type DrawerApi = { openNew: (draft?: Draft) => void; openExisting: (row: DocumentRow) => void; close: () => void }

const DrawerContext = createContext<DrawerApi | null>(null)

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DrawerState>(null)
  const openNew = useCallback((draft?: Draft) => setState({ kind: 'new', draft }), [])
  const openExisting = useCallback((row: DocumentRow) => setState({ kind: 'edit', row }), [])
  const close = useCallback(() => setState(null), [])
  const api = useMemo(() => ({ openNew, openExisting, close }), [openNew, openExisting, close])
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
