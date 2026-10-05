'use client'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@taxsteps/core'
import type { TaxStepsClient } from '@taxsteps/data'

let client: TaxStepsClient | null = null

/** Browser Supabase client (publishable key only; RLS protects all data). */
export function createClient(): TaxStepsClient {
  client ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  return client
}
