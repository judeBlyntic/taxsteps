'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DataProvider, userChangeGuard } from '@taxsteps/data'
import { createClient } from '@/lib/supabase/client'
import { ToastProvider } from '@/components/ui/Toast'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 } } }),
  )
  useEffect(() => {
    // A different person signing in on this browser must never see the previous user's cached data.
    const guard = userChangeGuard(() => queryClient.clear())
    const { data } = createClient().auth.onAuthStateChange((_e, session) => guard(session?.user.id ?? null))
    return () => data.subscription.unsubscribe()
  }, [queryClient])
  return (
    <QueryClientProvider client={queryClient}>
      <DataProvider client={createClient()}>
        <ToastProvider>{children}</ToastProvider>
      </DataProvider>
    </QueryClientProvider>
  )
}
