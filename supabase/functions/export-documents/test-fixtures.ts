import type { ExportDoc } from '../_shared/core.ts'
import { SAVED_ROW } from '../../../packages/core/src/fixtures.ts'

let n = 0
export function doc(over: Partial<ExportDoc> = {}): ExportDoc {
  n++
  return { ...SAVED_ROW, id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, category_name: 'Office', ...over }
}

export const DOCS: ExportDoc[] = [
  doc({ merchant_name: 'Mitre 10', amount: 115, tax_amount: 15, currency: 'NZD' }),
  doc({ merchant_name: '=HYPERLINK(x)', amount: 40, tax_amount: 3.64, currency: 'AUD', category_name: 'Travel' }),
  doc({ merchant_name: 'Kōwhai Café', amount: 20, tax_amount: null, currency: 'NZD', category_name: null }),
]

export const CTX = {
  label: 'October 2026', businessName: 'Kōwhai Build Ltd', timeZone: 'Pacific/Auckland', locale: 'en-NZ',
  generatedAt: new Date('2026-10-05T01:00:00Z'),
}

export async function loadFonts() {
  return {
    regular: await Deno.readFile(new URL('./fonts/NotoSans-Regular.ttf', import.meta.url)),
    bold: await Deno.readFile(new URL('./fonts/NotoSans-Bold.ttf', import.meta.url)),
  }
}
