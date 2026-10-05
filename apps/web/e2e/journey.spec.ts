// End-to-end web journey: sign in → scan (extraction stubbed) → review → save → dashboard →
// documents search → monthly report → CSV export → delete. Uses a throwaway user.
import { expect, test } from '@playwright/test'
import { randomBytes, randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

process.loadEnvFile('../../.env.test')
const env = process.env as Record<string, string>
const admin = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const email = `e2e+${randomUUID()}@taxsteps.test`
const password = randomBytes(18).toString('base64url')
const merchant = `E2E Grocer ${randomBytes(3).toString('hex')}`
let userId = ''

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: 'E2E Tester', country: 'NZ', currency: 'NZD', timezone: 'Pacific/Auckland', locale: 'en-NZ', fy_start_month: 4, fy_start_day: 1 },
  })
  if (error) throw error
  userId = data.user!.id
})
test.afterAll(async () => { if (userId) await admin.auth.admin.deleteUser(userId) })

test('scan → review → save → dashboard → search → report → export → delete', async ({ page }) => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' }).format(new Date())
  await page.route('**/functions/v1/extract-document', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      fields: { document_type: 'receipt', merchant_name: 'Countdown', title: 'Groceries', description: null, category: 'Meals', amount: 87.45,
        subtotal: 76.04, tax_amount: 11.41, tax_label: 'GST', currency: 'NZD', transaction_date: today, invoice_number: null, payment_method: 'EFTPOS' },
      confidence: { merchant_name: 0.95, amount: 0.95, tax_amount: 0.6 }, warnings: [], model: 'stub',
    }),
  }))

  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Hi, E2E' })).toBeVisible()

  await page.goto('/scan')
  await page.locator('input[type=file]:not([capture])').setInputFiles('../../fixtures/receipt-countdown.jpg')
  await expect(page.getByRole('heading', { name: 'Review your information' })).toBeVisible()
  await expect(page.getByText('Please check the highlighted fields')).toBeVisible()
  await page.getByLabel('Merchant').fill(merchant)
  await page.getByRole('button', { name: 'Save expense' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('button', { name: new RegExp(merchant) })).toBeVisible()

  await page.goto(`/documents?search=${encodeURIComponent(merchant)}`)
  await expect(page.getByRole('cell', { name: new RegExp(merchant) }).first()).toBeVisible()

  await page.goto('/reports')
  await expect(page.getByText('$87.45').first()).toBeVisible()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /CSV/ }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/^tax-steps-.*\.csv$/)
  const csv = await (await file.createReadStream()).toArray()
  expect(Buffer.concat(csv).toString('utf8')).toContain(merchant)

  await page.goto('/documents')
  await page.getByRole('button', { name: new RegExp(merchant) }).first().click()
  await page.getByRole('button', { name: 'Delete' }).first().click()
  await page.getByRole('dialog', { name: 'Delete this document?' }).getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Document deleted everywhere')).toBeVisible()
})
