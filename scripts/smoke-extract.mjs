// Live smoke test of the deployed extract-document function with synthetic fixtures.
// Creates a throwaway user, runs each fixture through OpenAI, prints the result, deletes the user.
import { readFileSync } from 'node:fs'
import { randomBytes, randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

process.loadEnvFile('.env.test')
const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anon, SUPABASE_SERVICE_ROLE_KEY: service } = process.env
const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(url, service, opts)
const email = `smoke+${randomUUID()}@taxsteps.test`
const password = randomBytes(18).toString('base64url')
const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { country: 'NZ', currency: 'NZD', timezone: 'Pacific/Auckland' } })
if (error) throw error
const client = createClient(url, anon, opts)
await client.auth.signInWithPassword({ email, password })

const hints = { categories: ['Groceries', 'Office', 'Meals', 'Fuel'], country: 'NZ', currency: 'NZD' }
const cases = [['fixtures/receipt-countdown.jpg', 'image/jpeg'], ['fixtures/invoice-acme.pdf', 'application/pdf'], ['fixtures/not-a-receipt.jpg', 'image/jpeg']]
try {
  for (const [path, mimeType] of cases) {
    const { data, error: err } = await client.functions.invoke('extract-document', { body: { file: readFileSync(path).toString('base64'), mimeType, filename: path.split('/').pop(), hints } })
    const detail = err ? await err.context?.json?.().catch(() => null) : null
    console.log(`\n── ${path}`)
    console.log(err ? `error: ${JSON.stringify(detail ?? err.message)}` : JSON.stringify({ fields: data.fields, warnings: data.warnings.map((w) => w.code), model: data.model }, null, 2))
  }
} finally {
  await admin.auth.admin.deleteUser(created.user.id)
}
