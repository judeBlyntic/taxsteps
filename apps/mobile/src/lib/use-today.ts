import { useMemo } from 'react'
import { regionFor, todayIn, uiLocale, type Profile } from '@taxsteps/core'
import { useProfile } from '@taxsteps/data'

export function useToday(): {
  today: string
  profile: Profile | undefined
  locale: string
  currency: string
  taxLabel: string
  fy: { fyStartMonth: number; fyStartDay: number }
} {
  const { data: profile } = useProfile()
  return useMemo(() => ({
    today: todayIn(profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone),
    profile,
    locale: uiLocale(profile?.locale),
    currency: profile?.currency ?? 'USD',
    taxLabel: regionFor(profile?.country).taxLabel,
    fy: { fyStartMonth: profile?.fy_start_month ?? 1, fyStartDay: profile?.fy_start_day ?? 1 },
  }), [profile])
}
