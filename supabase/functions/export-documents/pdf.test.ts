import { assert, assertEquals } from '@std/assert'
import { PDFDict, PDFDocument, PDFName, PDFRawStream, decodePDFRawStream } from 'pdf-lib'
import { buildPdf } from './pdf.ts'
import { CTX, DOCS, doc, loadFonts } from './test-fixtures.ts'

Deno.test('pdf: handles macrons, CJK and emoji without throwing', async () => {
  const fonts = await loadFonts()
  const bytes = await buildPdf([...DOCS, doc({ merchant_name: '東京ストア' }), doc({ merchant_name: 'Kōwhai Build Ltd 🧾' })], CTX, fonts)
  const pdf = await PDFDocument.load(bytes)
  assert(pdf.getPageCount() >= 1)
  assertEquals(pdf.getTitle(), 'Tax Steps · Expense report · October 2026')
})

Deno.test('pdf: paginates long document tables', async () => {
  const fonts = await loadFonts()
  const many = Array.from({ length: 250 }, (_, i) => doc({ merchant_name: `Merchant number ${i} with a very long name that must be truncated to fit the column` }))
  const pdf = await PDFDocument.load(await buildPdf(many, CTX, fonts))
  assert(pdf.getPageCount() >= 5)
})

Deno.test('pdf: renders an empty report', async () => {
  const pdf = await PDFDocument.load(await buildPdf([], CTX, await loadFonts()))
  assertEquals(pdf.getPageCount(), 1)
})

Deno.test('pdf: embeds full fonts (pdf-lib subsetting drops glyphs when rendered)', async () => {
  const fonts = await loadFonts()
  const pdf = await PDFDocument.load(await buildPdf(DOCS, CTX, fonts))
  const programs = pdf.context.enumerateIndirectObjects()
    .map(([, obj]) => obj)
    .filter((obj): obj is PDFDict => obj instanceof PDFDict && obj.get(PDFName.of('Type'))?.toString() === '/FontDescriptor')
    .map((d) => pdf.context.lookup(d.get(PDFName.of('FontFile2'))) as PDFRawStream)
    .map((stream) => decodePDFRawStream(stream).decode().length)
  assertEquals(programs.length, 2)
  // A subset font program is a fraction of the original TTF; a full embed matches it.
  for (const size of programs) assert(size >= Math.min(fonts.regular.length, fonts.bold.length) * 0.95, `font program only ${size} bytes`)
})
