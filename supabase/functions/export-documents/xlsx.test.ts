import { assertEquals } from '@std/assert'
// @deno-types="https://cdn.sheetjs.com/xlsx-0.20.3/package/types/index.d.ts"
import * as XLSX from 'xlsx'
import { buildXlsx } from './xlsx.ts'
import { CTX, DOCS } from './test-fixtures.ts'

Deno.test('xlsx: three sheets with typed numbers and real dates', () => {
  const wb = XLSX.read(buildXlsx(DOCS, CTX), { cellDates: true })
  assertEquals(wb.SheetNames, ['Documents', 'By category', 'Summary'])
  const sheet = wb.Sheets.Documents!
  assertEquals(sheet.A1?.v, 'Date')
  assertEquals(sheet.H2?.t, 'n')
  assertEquals(sheet.H2?.v, 115)
  assertEquals(sheet.A2?.t, 'd')
  assertEquals(sheet.B3?.v, "'=HYPERLINK(x)") // formula guarded
})

Deno.test('xlsx: summary keeps currencies separate', () => {
  const wb = XLSX.read(buildXlsx(DOCS, CTX))
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets.Summary!)
  assertEquals(rows.map((r) => [r.Currency, r.Count, r.Total]), [['NZD', 2, 135], ['AUD', 1, 40]])
  const cats = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets['By category']!)
  assertEquals(cats.find((r) => r.Category === 'Uncategorised')?.Total, 20)
})
