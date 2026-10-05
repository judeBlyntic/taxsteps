import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { AppError } from './core.ts'

export type UserContext = { userId: string; email: string | null; client: SupabaseClient }

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }

/** Verifies the caller's JWT and returns a client that acts as that user (RLS applies). */
export async function requireUser(req: Request): Promise<UserContext> {
  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) throw new AppError('UNAUTHORIZED')
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    ...noSession,
    global: { headers: { Authorization: auth } },
  })
  const { data, error } = await client.auth.getUser(auth.slice('Bearer '.length))
  if (error || !data.user) throw new AppError('UNAUTHORIZED')
  return { userId: data.user.id, email: data.user.email ?? null, client }
}

/** Service-role client — server-only tables (google_connections, api_usage) and admin auth calls. */
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, noSession)
}

export async function profileTimeZone(ctx: UserContext): Promise<string> {
  const { data } = await ctx.client.from('profiles').select('timezone').eq('id', ctx.userId).maybeSingle()
  return (data as { timezone?: string } | null)?.timezone ?? 'Pacific/Auckland'
}
