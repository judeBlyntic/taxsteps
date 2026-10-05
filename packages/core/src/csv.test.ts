import { describe, expect, it } from 'vitest'
import { EXPORT_HEADERS, exportRow, guardCell, toCsv, type ExportDoc } from './csv.ts'
import { SAVED_ROW } from './fixtures.ts'

const doc: ExportDoc = { ...SAVED_ROW, category_name: 'Office' }
const ctx = { timeZone: 'Pacific/Auckland', locale: 'en-NZ' }

describe('guardCell', () => {
  it('neutralises spreadsheet formulas', () => {
    expect(guardCell('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(guardCell('-5')).toBe("'-5")
    expect(guardCell('@cmd')).toBe("'@cmd")
    expect(guardCell('\tx')).toBe("'\tx")
    expect(guardCell('Mitre 10')).toBe('Mitre 10')
  })
})

describe('toCsv', () => {
  it('quotes and escapes per RFC 4180 with CRLF rows', () => {
    expect(toCsv([['a,b', 'say "hi"', 3, null]])).toBe('"a,b","say ""hi""",3,\r\n')
    expect(toCsv([['line\nbreak']])).toBe('"line\nbreak"\r\n')
  })
  it('adds a BOM when asked', () => {
    expect(toCsv([['x']], { bom: true }).startsWith('﻿')).toBe(true)
  })
  it('guards formula strings', () => {
    expect(toCsv([['=HYPERLINK("x")']])).toBe('"\'=HYPERLINK(""x"")"\r\n')
  })
})

describe('exportRow', () => {
  it('produces one value per header, numbers unguarded', () => {
    const row = exportRow(doc, ctx)
    expect(row).toHaveLength(EXPORT_HEADERS.length)
    expect(row.slice(0, 4)).toEqual(['2026-09-25', 'Mitre 10', 'Drill bits', 'Office'])
    expect(row[7]).toBe(115)
    expect(row[8]).toBe(15)
    expect(exportRow({ ...doc, amount: -1 } as ExportDoc, ctx)[7]).toBe(-1)
  })
  it('shows created/updated in the user timezone', () => {
    expect(String(exportRow(doc, ctx)[14])).toContain('2026')
  })
})
