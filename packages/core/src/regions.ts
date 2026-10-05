// Country presets: tax label, standard rates (tax-inclusive check), financial-year
// start and default currency. Adding a country = adding one entry.

export type TaxRegion = {
  country: string
  name: string
  taxLabel: string
  rates: number[]
  fyStartMonth: number
  fyStartDay: number
  currency: string
  locale: string
}

const r = (
  country: string, name: string, taxLabel: string, rates: number[],
  fyStartMonth: number, fyStartDay: number, currency: string, locale: string,
): TaxRegion => ({ country, name, taxLabel, rates, fyStartMonth, fyStartDay, currency, locale })

export const TAX_REGIONS: Record<string, TaxRegion> = Object.fromEntries([
  r('NZ', 'New Zealand', 'GST', [15], 4, 1, 'NZD', 'en-NZ'),
  r('AU', 'Australia', 'GST', [10], 7, 1, 'AUD', 'en-AU'),
  r('GB', 'United Kingdom', 'VAT', [20, 5], 4, 6, 'GBP', 'en-GB'),
  r('IE', 'Ireland', 'VAT', [23, 13.5, 9], 1, 1, 'EUR', 'en-IE'),
  r('US', 'United States', 'Sales tax', [], 1, 1, 'USD', 'en-US'),
  r('CA', 'Canada', 'GST/HST', [5, 13, 15], 1, 1, 'CAD', 'en-CA'),
  r('IN', 'India', 'GST', [5, 12, 18, 28], 4, 1, 'INR', 'en-IN'),
  r('SG', 'Singapore', 'GST', [9], 1, 1, 'SGD', 'en-SG'),
  r('ZA', 'South Africa', 'VAT', [15], 3, 1, 'ZAR', 'en-ZA'),
  r('DE', 'Germany', 'VAT', [19, 7], 1, 1, 'EUR', 'de-DE'),
  r('FR', 'France', 'VAT', [20, 10, 5.5], 1, 1, 'EUR', 'fr-FR'),
  r('ES', 'Spain', 'VAT', [21, 10, 4], 1, 1, 'EUR', 'es-ES'),
  r('IT', 'Italy', 'VAT', [22, 10, 5, 4], 1, 1, 'EUR', 'it-IT'),
  r('NL', 'Netherlands', 'VAT', [21, 9], 1, 1, 'EUR', 'nl-NL'),
  r('AE', 'United Arab Emirates', 'VAT', [5], 1, 1, 'AED', 'en-AE'),
  r('JP', 'Japan', 'Consumption tax', [10, 8], 1, 1, 'JPY', 'ja-JP'),
].map((x) => [x.country, x]))

export const FALLBACK_REGION: TaxRegion = r('ZZ', 'Other', 'Tax', [], 1, 1, 'USD', 'en-US')

export function regionFor(country?: string | null): TaxRegion {
  return (country && TAX_REGIONS[country.toUpperCase()]) || FALLBACK_REGION
}

const RATE_TOLERANCE = 1.5

/** Checks a tax-inclusive total against the region's known rates. */
export function checkTaxRate(totalCents: number, taxCents: number, region: TaxRegion): 'ok' | 'mismatch' | 'unchecked' {
  if (region.rates.length === 0 || taxCents <= 0) return 'unchecked'
  const base = totalCents - taxCents
  if (base <= 0) return 'mismatch'
  const implied = (taxCents / base) * 100
  return region.rates.some((rate) => Math.abs(implied - rate) <= RATE_TOLERANCE) ? 'ok' : 'mismatch'
}

const EXTRA_CURRENCIES = [
  'BRL', 'CHF', 'CNY', 'DKK', 'FJD', 'HKD', 'IDR', 'KRW', 'MXN', 'MYR', 'NOK', 'PHP', 'PLN', 'SEK', 'THB', 'TOP', 'WST',
]

export const CURRENCIES: string[] = [...new Set([...Object.values(TAX_REGIONS).map((x) => x.currency), ...EXTRA_CURRENCIES])].sort()
