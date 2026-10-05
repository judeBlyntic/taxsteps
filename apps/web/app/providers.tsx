'use client'
import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DataProvider } from '@taxsteps/data'
import { createClient } from '@/lib/supabase/client'
import { ToastProvider } from '@/components/ui/Toast'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 } } }),
  )
  return (
    <QueryClientProvider client={queryClient}>
      <DataProvider client={createClient()}>
        <ToastProvider>{children}</ToastProvider>
      </DataProvider>
    </QueryClientProvider>
  )
}
