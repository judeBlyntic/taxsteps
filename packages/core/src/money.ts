// All money arithmetic happens in integer cents; decimals only at the edges.

const DEFAULT_LOCALE = 'en-US'

export function toCents(value: number): number {
  // toFixed(6) absorbs binary float noise (0.1 + 0.2, 1.005 * 100) before rounding.
  const cents = Math.round(Number((value * 100).toFixed(6)))
  return cents === 0 ? 0 : cents
}

export function fromCents(cents: number): number {
  return cents / 100
}

function decimalSeparator(locale: string): string {
  return new Intl.NumberFormat(locale).formatToParts(1.1).find((p) => p.type === 'decimal')?.value ?? '.'
}

/** Parses a user-typed amount ("$87.45", "1.234,56") into cents, or null if it isn't a clean amount. */
export function parseAmount(input: string, locale: string = DEFAULT_LOCALE): number | null {
  if (input.includes('-')) return null
  // Drop currency symbols/letters and every kind of space or apostrophe used for grouping.
  const s = input.replace(/[^\d.,]/g, '')
  if (!s) return null

  const dec = decimalSeparator(locale) === ',' ? ',' : '.'
  const group = dec === '.' ? ',' : '.'

  const pieces = s.split(dec)
  if (pieces.length > 2) return null
  const [intPart = '', fracPart] = pieces

  const intOk = intPart.includes(group)
    ? new RegExp(`^\\d{1,3}(\\${group}\\d{3})+$`).test(intPart)
    : /^\d+$/.test(intPart)
  if (!intOk) return null
  if (fracPart !== undefined && !/^\d{1,2}$/.test(fracPart)) return null

  const whole = Number(intPart.split(group).join(''))
  const frac = fracPart === undefined ? 0 : Number(fracPart.padEnd(2, '0'))
  return whole * 100 + frac
}

export function formatMoney(cents: number, currency: string, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(fromCents(cents))
}

/** Cents → editable text in the locale's decimal style, no grouping ("1234.56" / "1234,56"). */
export function formatAmountInput(cents: number, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false }).format(fromCents(cents))
}
