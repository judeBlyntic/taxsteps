// Generates synthetic test documents (no real customer data) for smoke tests and E2E.
import { writeFileSync } from 'node:fs'
import sharp from 'sharp'
import { PDFDocument, StandardFonts } from 'pdf-lib'

const receipt = (lines, w = 600, h = 900) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="#fffdf8"/>
  ${lines.map((l, i) => `<text x="${l.right ? w - 40 : 40}" y="${70 + i * 42}" font-family="Courier New, monospace" font-size="${l.size ?? 26}" text-anchor="${l.right ? 'end' : 'start'}" font-weight="${l.bold ? 700 : 400}" fill="#111">${l.text}</text>`).join('\n')}
</svg>`

const countdown = receipt([
  { text: 'COUNTDOWN', size: 40, bold: true }, { text: 'Ponsonby, Auckland' }, { text: 'GST No. 123-456-789' },
  { text: 'Date: 05/10/2026  14:32' }, { text: '' }, { text: 'Bananas 1kg          3.49' }, { text: 'Milk 2L              4.20' },
  { text: 'Bread                5.50' }, { text: 'Coffee beans        24.99' }, { text: 'Cheese              12.49' },
  { text: 'Eggs dozen          11.79' }, { text: 'Olive oil           14.99' }, { text: 'Chicken             10.00' },
  { text: '' }, { text: 'TOTAL (incl GST)    87.45', bold: true, size: 30 }, { text: 'GST incl            11.41' },
  { text: 'EFTPOS              87.45' }, { text: 'Thank you!' },
])
await sharp(Buffer.from(countdown)).jpeg({ quality: 85 }).toFile('fixtures/receipt-countdown.jpg')
await sharp({ create: { width: 800, height: 600, channels: 3, background: '#7aa8d6' } }).jpeg().toFile('fixtures/not-a-receipt.jpg')

const pdf = await PDFDocument.create()
const page = pdf.addPage([595, 842])
const font = await pdf.embedFont(StandardFonts.Helvetica)
const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
const t = (s, x, y, size = 12, f = font) => page.drawText(s, { x, y, size, font: f })
t('ACME DESIGN LTD', 50, 780, 22, bold); t('TAX INVOICE', 420, 780, 16, bold)
t('Invoice number: INV-12345', 50, 740); t('Date: 30 September 2026', 50, 722); t('GST number: 98-765-432', 50, 704)
t('Website retainer — October', 50, 640); t('1,000.00', 480, 640)
t('Subtotal', 380, 590); t('1,000.00', 480, 590); t('GST 15%', 380, 572); t('150.00', 480, 572)
t('Total NZD', 380, 548, 14, bold); t('1,150.00', 480, 548, 14, bold)
writeFileSync('fixtures/invoice-acme.pdf', await pdf.save())
console.log('fixtures written')
