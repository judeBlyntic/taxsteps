import type { SupabaseClient } from '@supabase/supabase-js'
import { AppError, type Database, type ErrorCode } from '@taxsteps/core'

export type TaxStepsClient = SupabaseClient<Database>

/** Wraps a PostgREST/RPC error as an AppError without leaking SQL details to the UI. */
export function dbError(code: ErrorCode, error: { message?: string; code?: string } | null): AppError {
  const e = new AppError(code)
  if (error) Object.assign(e, { cause: error })
  return e
}

export async function currentUserId(c: TaxStepsClient): Promise<string> {
  const { data } = await c.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new AppError('UNAUTHORIZED')
  return id
}
