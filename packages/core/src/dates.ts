// Calendar-date helpers. Transaction dates are plain YYYY-MM-DD (no timezone);
// "today" is resolved in the user's profile timezone.

export type ISODate = string
export type DateRange = { from: ISODate; to: ISODate }

const FALLBACK_TZ = 'Pacific/Auckland'
const DEFAULT_LOCALE = 'en-US'

const pad = (n: number, len = 2) => String(n).padStart(len, '0')
const iso = (y: number, m: number, d: number): ISODate => `${pad(y, 4)}-${pad(m)}-${pad(d)}`
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()

function parts(d: ISODate): [number, number, number] {
  const [y = 0, m = 0, day = 0] = d.split('-').map(Number)
  return [y, m, day]
}

/** Adds days to a calendar date using UTC arithmetic (no DST surprises). */
function addDays(d: ISODate, days: number): ISODate {
  const [y, m, day] = parts(d)
  const t = new Date(Date.UTC(y, m - 1, day + days))
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())
}

export function todayIn(timeZone: string, now: Date = new Date()): ISODate {
  const fmt = (tz: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  try {
    return fmt(timeZone)
  } catch {
    return fmt(FALLBACK_TZ)
  }
}

export function isISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = parts(s)
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m)
}

export function monthRange(year: number, month: number): DateRange {
  return { from: iso(year, month, 1), to: iso(year, month, daysInMonth(year, month)) }
}

export function yearRange(year: number): DateRange {
  return { from: iso(year, 1, 1), to: iso(year, 12, 31) }
}

function fyStart(year: number, month: number, day: number): ISODate {
  return iso(year, month, Math.min(day, daysInMonth(year, month)))
}

export function financialYearRange(date: ISODate, fyStartMonth: number, fyStartDay: number): DateRange {
  const [y] = parts(date)
  const thisYear = fyStart(y, fyStartMonth, fyStartDay)
  const startYear = date >= thisYear ? y : y - 1
  const from = fyStart(startYear, fyStartMonth, fyStartDay)
  const to = addDays(fyStart(startYear + 1, fyStartMonth, fyStartDay), -1)
  return { from, to }
}

export function fyLabel(range: DateRange): string {
  const [y1, m1, d1] = parts(range.from)
  const [y2] = parts(range.to)
  if (m1 === 1 && d1 === 1 && y1 === y2) return `FY ${y1}`
  return `FY ${y1}–${String(y2).slice(-2)}`
}

export function lastNMonths(today: ISODate, n: number): { year: number; month: number }[] {
  const [y, m] = parts(today)
  const out: { year: number; month: number }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const idx = y * 12 + (m - 1) - i
    out.push({ year: Math.floor(idx / 12), month: (idx % 12) + 1 })
  }
  return out
}

function numericOrder(locale: string): ('day' | 'month' | 'year')[] {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' })
    .formatToParts(new Date(Date.UTC(2026, 9, 5)))
    .map((p) => p.type)
    .filter((t): t is 'day' | 'month' | 'year' => t === 'day' || t === 'month' || t === 'year')
}

/** Accepts YYYY-MM-DD or a numeric date in the locale's order (05/10/2026, 5.10.2026). */
export function parseUserDate(input: string, locale: string = DEFAULT_LOCALE): ISODate | null {
  const s = input.trim()
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const [y, m, d] = parts(s)
    const out = iso(y, m, d)
    return isISODate(out) ? out : null
  }
  const nums = s.split(/[/.\-\s]+/)
  if (nums.length !== 3 || nums.some((n) => !/^\d{1,4}$/.test(n))) return null
  const order = numericOrder(locale)
  const v: Record<string, number> = {}
  order.forEach((key, i) => { v[key] = Number(nums[i]) })
  let year = v.year ?? 0
  if (year < 100) year += 2000
  const out = iso(year, v.month ?? 0, v.day ?? 0)
  return isISODate(out) ? out : null
}

export function formatDate(d: ISODate, locale: string = DEFAULT_LOCALE): string {
  const [y, m, day] = parts(d)
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, day)))
}

export function formatTimestamp(isoTimestamp: string, timeZone: string, locale: string = DEFAULT_LOCALE): string {
  const opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }
  try {
    return new Intl.DateTimeFormat(locale, { ...opts, timeZone }).format(new Date(isoTimestamp))
  } catch {
    return new Intl.DateTimeFormat(locale, { ...opts, timeZone: FALLBACK_TZ }).format(new Date(isoTimestamp))
  }
}

/** "5 Oct" (adds the year when it differs from `today`'s year). */
export function formatShortDate(d: ISODate, locale: string = DEFAULT_LOCALE, today?: ISODate): string {
  const [y, m, day] = parts(d)
  const withYear = today !== undefined && today.slice(0, 4) !== d.slice(0, 4)
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, day)))
}

/** "September 2026", or just "Sep" with style 'short'. */
export function formatMonth(year: number, month: number, locale: string = DEFAULT_LOCALE, style: 'long' | 'short' = 'long'): string {
  const opts: Intl.DateTimeFormatOptions = style === 'long' ? { month: 'long', year: 'numeric', timeZone: 'UTC' } : { month: 'short', timeZone: 'UTC' }
  return new Intl.DateTimeFormat(locale, opts).format(new Date(Date.UTC(year, month - 1, 1)))
}
