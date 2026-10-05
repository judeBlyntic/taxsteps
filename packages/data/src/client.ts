import type { SupabaseClient } from '@supabase/supabase-js'
import { AppError, type Database, type ErrorCode } from '@taxsteps/core'

export type TaxStepsClient = SupabaseClient<Database>

/**
 * Wraps a PostgREST/RPC error as an AppError without leaking SQL details to the UI.
 * postgrest-js reports a failed fetch as status 0 (it doesn't throw), which we map to NETWORK
 * so callers like the offline queue can react to connectivity problems.
 */
export function dbError(code: ErrorCode, error: { message?: string; code?: string } | null, status?: number): AppError {
  const e = new AppError(status === 0 ? 'NETWORK' : code)
  if (error) Object.assign(e, { cause: error })
  return e
}

export async function currentUserId(c: TaxStepsClient): Promise<string> {
  const { data } = await c.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new AppError('UNAUTHORIZED')
  return id
}
