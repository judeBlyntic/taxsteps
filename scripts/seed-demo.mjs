// Creates (or with --delete removes) a throwaway demo user with six months of sample expenses.
// Credentials are written to the git-ignored .env.demo — never printed.
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { randomBytes, randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

process.loadEnvFile('.env.test')
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const demo = existsSync('.env.demo') ? Object.fromEntries(readFileSync('.env.demo', 'utf8').trim().split('\n').map((l) => l.split('='))) : null

if (process.argv.includes('--delete')) {
  if (demo?.DEMO_USER_ID) await admin.auth.admin.deleteUser(demo.DEMO_USER_ID)
  if (existsSync('.env.demo')) unlinkSync('.env.demo')
  console.log('demo user removed')
  process.exit(0)
}
if (demo) { console.log('demo user already exists (.env.demo)'); process.exit(0) }

const email = `demo+${randomUUID().slice(0, 8)}@taxsteps.test`
const password = randomBytes(15).toString('base64url')
const { data, error } = await admin.auth.admin.createUser({
  email, password, email_confirm: true,
  user_metadata: { full_name: 'Aroha Ngata', country: 'NZ', currency: 'NZD', timezone: 'Pacific/Auckland', locale: 'en-NZ', fy_start_month: 4, fy_start_day: 1 },
})
if (error) throw error
const uid = data.user.id
await admin.from('profiles').update({ business_name: 'Kōwhai Build Ltd', tax_number: '123-456-789' }).eq('id', uid)
const { data: cats } = await admin.from('categories').select('id, name').eq('user_id', uid)
const cat = (n) => cats.find((c) => c.name === n)?.id ?? null

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' }).format(new Date())
const day = (monthsAgo, d) => {
  const [y, m] = today.split('-').map(Number)
  const idx = y * 12 + (m - 1) - monthsAgo
  const dt = new Date(Date.UTC(Math.floor(idx / 12), idx % 12, 1))
  const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate()
  const dd = Math.min(d, monthsAgo === 0 ? Number(today.slice(8)) : last)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}
const gst = (t) => Math.round((t * 3 / 23) * 100) / 100
const rows = [
  ['Mitre 10', 'Drill bits and screws', 'Equipment', 115, 0, 2, 'business', 'Visa'],
  ['Z Energy', 'Fuel', 'Fuel', 91.3, 0, 3, 'business', 'Visa'],
  ['Countdown', 'Groceries', 'Meals', 146.2, 0, 4, 'personal', 'EFTPOS'],
  ['Xero', 'Accounting subscription', 'Software', 75, 0, 1, 'business', 'Visa'],
  ['Air New Zealand', 'Flight AKL–WLG', 'Travel', 289, 1, 18, 'business', 'Visa'],
  ['BP Connect', 'Fuel', 'Fuel', 82.4, 1, 24, 'business', 'Mastercard'],
  ['OfficeMax', 'Printer paper', 'Office', 64.99, 1, 22, 'business', 'Visa'],
  ['Noel Leeming', 'Monitor', 'Equipment', 499, 1, 5, 'business', 'Visa'],
  ['Hell Pizza', 'Team lunch', 'Meals', 42.8, 1, 8, 'personal', 'EFTPOS'],
  ['Spark', 'Mobile plan', 'Phone', 65, 2, 12, 'business', 'Direct debit'],
  ['Bunnings', 'Timber', 'Equipment', 124.5, 2, 16, 'business', 'Mastercard'],
  ['One NZ', 'Fibre broadband', 'Internet', 89, 3, 10, 'business', 'Direct debit'],
  ['Kōwhai Café', 'Client coffee', 'Meals', 18.5, 3, 14, 'business', 'Card'],
  ['AA Insurance', 'Van insurance', 'Insurance', 210, 4, 3, 'business', 'Direct debit'],
  ['Trade Me', 'Second-hand ladder', 'Equipment', 80, 5, 20, 'business', 'Bank transfer'],
]
const docs = rows.map(([merchant, title, c, total, ago, d, type, pay]) => ({
  id: randomUUID(), user_id: uid, document_type: 'receipt', merchant_name: merchant, title, description: null,
  category_id: cat(c), expense_type: type, amount: total, tax_amount: gst(total), tax_label: 'GST', currency: 'NZD',
  transaction_date: day(ago, d), invoice_number: null, payment_method: pay, status: 'complete', source: 'scan', metadata: {},
}))
docs.push({ ...docs[0], id: randomUUID(), merchant_name: 'Bunnings Sydney', title: 'Site tools (AU job)', amount: 40, tax_amount: 3.64,
  tax_label: 'GST', currency: 'AUD', transaction_date: day(0, 1) })
docs.push({ ...docs[1], id: randomUUID(), merchant_name: 'Parking Building', title: 'Parking', amount: 12, tax_amount: null, category_id: null,
  status: 'needs_review', transaction_date: day(0, 1) })
const { error: insErr } = await admin.from('documents').insert(docs)
if (insErr) throw insErr
writeFileSync('.env.demo', `DEMO_EMAIL=${email}\nDEMO_PASSWORD=${password}\nDEMO_USER_ID=${uid}\n`)
console.log(`demo user created with ${docs.length} documents (credentials in .env.demo)`)
