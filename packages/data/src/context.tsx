import { createContext, useContext, type ReactNode } from 'react'
import type { TaxStepsClient } from './client.ts'

const ClientContext = createContext<TaxStepsClient | null>(null)

export function DataProvider({ client, children }: { client: TaxStepsClient; children: ReactNode }) {
  return <ClientContext.Provider value={client}>{children}</ClientContext.Provider>
}

export function useClient(): TaxStepsClient {
  const c = useContext(ClientContext)
  if (!c) throw new Error('useClient must be used inside <DataProvider>')
  return c
}
