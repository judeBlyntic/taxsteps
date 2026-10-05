import type { SupabaseClient } from '@supabase/supabase-js'
import { AppError } from './core.ts'

/** [per hour, per day] per user. */
export const LIMITS = { extract: [30, 300], export: [60, 600], sheets: [60, 600] } as const
export type LimitKind = keyof typeof LIMITS

export async function enforceRateLimit(admin: SupabaseClient, userId: string, kind: LimitKind): Promise<void> {
  const [perHour, perDay] = LIMITS[kind]
  const { data, error } = await admin.rpc('consume_rate_limit', {
    p_user_id: userId, p_kind: kind, p_per_hour: perHour, p_per_day: perDay,
  })
  if (error) throw new AppError('INTERNAL')
  if (data !== true) throw new AppError('RATE_LIMITED')
}
