// Accountant-friendly PDF report: header, per-currency summary, category table, document table, disclaimer.
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { COPY, formatMoney, formatTimestamp, toCents, type ExportDoc } from '../_shared/core.ts'
import { aggregate } from './aggregate.ts'
import type { ExportContext } from './context.ts'

const A4: [number, number] = [595.28, 841.89]
const M = 40
const INK = rgb(0.125, 0.118, 0.114)
const MUTED = rgb(0.39, 0.36, 0.31)
const ACCENT = rgb(0.776, 0.443, 0.224)
const RULE = rgb(0.86, 0.83, 0.77)

type Col = { title: string; width: number; align?: 'right' }

export async function buildPdf(
  docs: ExportDoc[], ctx: ExportContext, fonts: { regular: Uint8Array; bold: Uint8Array },
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const regular = await pdf.embedFont(fonts.regular, { subset: true })
  const bold = await pdf.embedFont(fonts.bold, { subset: true })
  const glyphs = new Set(regular.getCharacterSet())
  // Characters the font can't draw (CJK, emoji…) become "?" instead of crashing the export.
  const safe = (s: string) => Array.from(s, (ch) => (glyphs.has(ch.codePointAt(0)!) ? ch : '?')).join('')
  const money = (cents: number, currency: string) => safe(formatMoney(cents, currency, ctx.locale))

  pdf.setTitle(`Tax Steps · Expense report · ${ctx.label}`)
  pdf.setAuthor('Tax Steps')
  pdf.setCreationDate(ctx.generatedAt)

  let page: PDFPage = pdf.addPage(A4)
  let y = A4[1] - M
  const FOOTER = 60

  const text = (s: string, x: number, size: number, font: PDFFont = regular, color = INK) =>
    page.drawText(safe(s), { x, y, size, font, color })
  const fit = (s: string, width: number, size: number, font: PDFFont) => {
    let t = safe(s)
    if (font.widthOfTextAtSize(t, size) <= width) return t
    while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > width) t = t.slice(0, -1)
    return `${t}…`
  }
  const newPage = () => { page = pdf.addPage(A4); y = A4[1] - M }
  const ensure = (h: number, onBreak?: () => void) => { if (y - h < M + FOOTER) { newPage(); onBreak?.() } }

  const table = (cols: Col[], rows: string[][]) => {
    const header = () => {
      let x = M
      for (const c of cols) {
        const t = fit(c.title, c.width - 6, 8, bold)
        page.drawText(t, { x: c.align === 'right' ? x + c.width - bold.widthOfTextAtSize(t, 8) - 4 : x, y, size: 8, font: bold, color: MUTED })
        x += c.width
      }
      y -= 6
      page.drawLine({ start: { x: M, y }, end: { x: A4[0] - M, y }, thickness: 0.6, color: RULE })
      y -= 12
    }
    header()
    for (const r of rows) {
      ensure(14, header)
      let x = M
      r.forEach((cell, i) => {
        const c = cols[i]!
        const t = fit(cell, c.width - 6, 9, regular)
        page.drawText(t, { x: c.align === 'right' ? x + c.width - regular.widthOfTextAtSize(t, 9) - 4 : x, y, size: 9, font: regular, color: INK })
        x += c.width
      })
      y -= 14
    }
    y -= 8
  }

  // Header
  text('Tax Steps · Expense report', M, 18, bold, ACCENT); y -= 24
  if (ctx.businessName) { text(ctx.businessName, M, 12, bold); y -= 16 }
  text(ctx.label, M, 11); y -= 14
  text(`Generated ${formatTimestamp(ctx.generatedAt.toISOString(), ctx.timeZone, ctx.locale)} · ${docs.length} documents`, M, 9, regular, MUTED)
  y -= 26

  const { currencies, categories } = aggregate(docs)

  text('Summary', M, 12, bold); y -= 18
  if (currencies.length === 0) { text('No documents in this period.', M, 10, regular, MUTED); y -= 20 }
  table(
    [{ title: 'Currency', width: 120 }, { title: 'Documents', width: 100, align: 'right' }, { title: 'Tax', width: 145, align: 'right' }, { title: 'Total', width: 150, align: 'right' }],
    currencies.map((c) => [c.currency, String(c.count), money(c.taxCents, c.currency), money(c.totalCents, c.currency)]),
  )

  if (categories.length) {
    ensure(40)
    text('By category', M, 12, bold); y -= 18
    table(
      [{ title: 'Category', width: 200 }, { title: 'Currency', width: 70 }, { title: 'Docs', width: 50, align: 'right' }, { title: 'Tax', width: 95, align: 'right' }, { title: 'Total', width: 100, align: 'right' }],
      categories.map((c) => [c.category, c.currency, String(c.count), money(c.taxCents, c.currency), money(c.totalCents, c.currency)]),
    )
  }

  if (docs.length) {
    ensure(40)
    text('Documents', M, 12, bold); y -= 18
    table(
      [{ title: 'Date', width: 62 }, { title: 'Merchant', width: 150 }, { title: 'Category', width: 95 }, { title: 'Invoice #', width: 70 }, { title: 'Tax', width: 68, align: 'right' }, { title: 'Total', width: 70, align: 'right' }],
      docs.map((d) => [
        d.transaction_date, d.merchant_name, d.category_name ?? '—', d.invoice_number ?? '',
        d.tax_amount === null ? '—' : money(toCents(d.tax_amount), d.currency), money(toCents(d.amount), d.currency),
      ]),
    )
  }

  // Footer on every page: disclaimer + page numbers.
  const pages = pdf.getPages()
  const words = safe(COPY.disclaimer).split(' ')
  const lines: string[] = []
  for (const w of words) {
    const last = lines[lines.length - 1]
    if (last !== undefined && regular.widthOfTextAtSize(`${last} ${w}`, 7.5) < A4[0] - 2 * M - 60) lines[lines.length - 1] = `${last} ${w}`
    else lines.push(w)
  }
  pages.forEach((p, i) => {
    lines.forEach((l, j) => p.drawText(l, { x: M, y: M + 18 - j * 10, size: 7.5, font: regular, color: MUTED }))
    const label = `Page ${i + 1} of ${pages.length}`
    p.drawText(label, { x: A4[0] - M - regular.widthOfTextAtSize(label, 8), y: M + 18, size: 8, font: regular, color: MUTED })
  })

  return await pdf.save()
}
