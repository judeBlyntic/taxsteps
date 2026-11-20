// Document drawer: edits from two devices, unsaved-work prompts, and keyboard focus in modals.
// Signs in with the demo account; every document created is tagged QA-FIX1- and deleted afterwards.
import { expect, test, type Browser, type Page } from '@playwright/test'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

process.loadEnvFile('../../.env.test')
process.loadEnvFile('../../.env.demo')
const env = process.env as Record<string, string>
const TAG = 'QA-FIX1-'
/** "The phone": a second session for the same account. */
const phone = createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })

test.describe.configure({ mode: 'serial' })

let page: Page
test.beforeAll(async ({ browser }) => {
  const { error } = await phone.auth.signInWithPassword({ email: env.DEMO_EMAIL!, password: env.DEMO_PASSWORD! })
  if (error) throw error
  page = await signedInPage(browser)
})
test.afterAll(async () => {
  await page?.close()
  const { error } = await phone.from('documents').delete().like('merchant_name', `${TAG}%`)
  if (error) throw error
})

async function signedInPage(browser: Browser, opts: { realtime?: boolean } = {}): Promise<Page> {
  const context = await browser.newContext()
  if (opts.realtime === false) await context.routeWebSocket(/\/realtime\//, (ws) => ws.close())
  const p = await context.newPage()
  await p.goto('/sign-in')
  await p.getByLabel('Email').fill(env.DEMO_EMAIL!)
  await p.getByLabel('Password').fill(env.DEMO_PASSWORD!)
  await p.getByRole('button', { name: 'Sign in' }).click()
  await p.waitForURL('/')
  return p
}

async function makeDocument() {
  const merchant = `${TAG}${randomBytes(4).toString('hex')}`
  const { data, error } = await phone.from('documents')
    .insert({ merchant_name: merchant, amount: 12.5, currency: 'NZD', transaction_date: '2026-11-01' }).select('id').single()
  if (error) throw error
  return { id: data.id, merchant }
}

async function openDocument(p: Page, merchant: string) {
  await p.goto(`/documents?search=${merchant}`)
  await p.getByRole('button', { name: new RegExp(merchant) }).first().click()
  await expect(p.getByRole('dialog', { name: merchant })).toBeVisible()
}

const drawer = (p: Page) => p.locator('.drawer')
const field = (p: Page, label: string) => drawer(p).getByLabel(new RegExp(`^${label}\\b`))
const merchantField = (p: Page) => field(p, 'Merchant')
const discardDialog = (p: Page) => p.getByRole('dialog', { name: 'Discard changes?' })

/** Tab around: focus may pass through the browser's own UI (body) but never lands on the page behind. */
async function expectTabTrappedIn(p: Page, selector: string, presses = 30) {
  for (let i = 0; i < presses; i++) {
    await p.keyboard.press('Tab')
    const where = await p.evaluate((sel) => {
      const a = document.activeElement
      return !a || a === document.body ? 'body' : a.closest(sel) ? 'inside' : a.outerHTML.slice(0, 120)
    }, selector)
    expect(['inside', 'body'], `Tab #${i + 1} escaped the modal`).toContain(where)
  }
}

test.describe('edits from two devices', () => {
  test('a save from a stale form is refused and the latest values are loaded', async () => {
    const doc = await makeDocument()
    await openDocument(page, doc.merchant)
    await merchantField(page).fill(`${doc.merchant} web`)
    await phone.from('documents').update({ merchant_name: `${doc.merchant} phone` }).eq('id', doc.id)

    await drawer(page).getByRole('button', { name: 'Save changes' }).click()
    await expect(drawer(page).getByRole('alert')).toContainText('changed on another device')
    await expect(merchantField(page)).toHaveValue(`${doc.merchant} phone`)
    const { data } = await phone.from('documents').select('merchant_name').eq('id', doc.id).single()
    expect(data?.merchant_name).toBe(`${doc.merchant} phone`)

    await merchantField(page).fill(`${doc.merchant} web again`)
    await drawer(page).getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('Changes saved')).toBeVisible()
    const { data: after } = await phone.from('documents').select('merchant_name').eq('id', doc.id).single()
    expect(after?.merchant_name).toBe(`${doc.merchant} web again`)
  })

  test('a document deleted on another device closes the open drawer', async () => {
    const doc = await makeDocument()
    await expect(page.getByText('All synced').first()).toBeVisible()
    await openDocument(page, doc.merchant)
    await merchantField(page).fill(`${doc.merchant} edited`)
    await phone.from('documents').delete().eq('id', doc.id)
    await expect(page.getByText('This document was deleted on another device.')).toBeVisible()
    await expect(drawer(page)).toBeHidden()
  })

  test('saving a document deleted on another device never brings it back', async ({ browser }) => {
    const offline = await signedInPage(browser, { realtime: false }) // no live updates: only the save can notice
    try {
      const doc = await makeDocument()
      await openDocument(offline, doc.merchant)
      await merchantField(offline).fill(`${doc.merchant} edited`)
      await phone.from('documents').delete().eq('id', doc.id)
      await drawer(offline).getByRole('button', { name: 'Save changes' }).click()
      await expect(offline.getByText('This document was deleted on another device.')).toBeVisible()
      await expect(drawer(offline)).toBeHidden()
      const { data } = await phone.from('documents').select('id').eq('id', doc.id)
      expect(data).toEqual([])
    } finally {
      await offline.context().close()
    }
  })
})

test.describe('unsaved work', () => {
  test('closing a changed draft asks first, and refresh is guarded', async () => {
    await page.goto('/documents')
    await page.getByRole('button', { name: 'Add manually' }).click()
    await merchantField(page).fill(`${TAG}never saved`)

    await page.keyboard.press('Escape')
    await expect(discardDialog(page)).toBeVisible()
    await discardDialog(page).getByRole('button', { name: 'Keep editing' }).click()
    await expect(merchantField(page)).toHaveValue(`${TAG}never saved`)

    await page.locator('.overlay').click({ position: { x: 20, y: 300 } })
    await expect(discardDialog(page)).toBeVisible()
    await page.keyboard.press('Escape') // closes only the question
    await expect(discardDialog(page)).toBeHidden()
    await expect(merchantField(page)).toHaveValue(`${TAG}never saved`)

    const refreshBlocked = await page.evaluate(() => {
      const e = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(e)
      return e.defaultPrevented
    })
    expect(refreshBlocked).toBe(true)

    await drawer(page).getByRole('button', { name: 'Close' }).click()
    await discardDialog(page).getByRole('button', { name: 'Discard' }).click()
    await expect(drawer(page)).toBeHidden()
    expect(await page.evaluate(() => {
      const e = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(e)
      return e.defaultPrevented
    })).toBe(false)
  })

  test('an untouched draft closes straight away', async () => {
    await page.goto('/documents')
    await page.getByRole('button', { name: 'Add manually' }).click()
    await expect(page.getByRole('dialog', { name: 'New expense' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(drawer(page)).toBeHidden()
    await expect(discardDialog(page)).toBeHidden()
  })

  test('an unsaved scan asks before it is thrown away, then focus goes to the page heading', async () => {
    await page.route('**/functions/v1/extract-document', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        fields: { document_type: 'receipt', merchant_name: `${TAG}scan`, title: null, description: null, category: null, amount: 9.5,
          subtotal: null, tax_amount: null, tax_label: 'GST', currency: 'NZD', transaction_date: '2026-11-01', invoice_number: null, payment_method: null },
        confidence: { merchant_name: 0.95, amount: 0.95 }, warnings: [], model: 'stub',
      }),
    }))
    await page.goto('/scan')
    await page.locator('input[type=file]:not([capture])').setInputFiles('../../fixtures/receipt-countdown.jpg')
    await expect(page.getByRole('heading', { name: 'Review your information' })).toBeVisible()
    await page.keyboard.press('Escape')
    await discardDialog(page).getByRole('button', { name: 'Discard' }).click()
    await expect(drawer(page)).toBeHidden()
    await expect(page.locator('h1')).toBeFocused()
    await page.unroute('**/functions/v1/extract-document')
  })
})

test.describe('keyboard focus', () => {
  test('the drawer is a real modal and gives focus back to what opened it', async () => {
    await page.goto('/documents')
    const add = page.getByRole('button', { name: 'Add manually' })
    await add.click()
    await expect(page.getByRole('dialog', { name: 'New expense' })).toBeVisible()
    expect(await drawer(page).evaluate((el) => el.tagName)).not.toBe('ASIDE') // axe aria-allowed-role
    await expect(page.locator('.shell')).toHaveAttribute('inert', '')
    await expectTabTrappedIn(page, '.drawer')
    await page.keyboard.press('Escape')
    await expect(add).toBeFocused()
    await expect(page.locator('.shell')).not.toHaveAttribute('inert', '')
  })

  test('closing the delete question returns focus to Delete, closing the drawer to the row', async () => {
    const doc = await makeDocument()
    await openDocument(page, doc.merchant)
    const del = page.locator('.drawer-foot').getByRole('button', { name: 'Delete' })
    await del.click()
    await expect(page.getByRole('dialog', { name: 'Delete this document?' })).toBeVisible()
    await expectTabTrappedIn(page, '.modal', 8)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Delete this document?' })).toBeHidden()
    await expect(del).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(drawer(page)).toBeHidden()
    await expect(page.getByRole('button', { name: new RegExp(doc.merchant) }).first()).toBeFocused()
  })

  test('a failed save moves focus to the first field to fix, and required fields are marked', async () => {
    await page.goto('/documents')
    await page.getByRole('button', { name: 'Add manually' }).click()
    await expect(drawer(page).getByText('* required')).toBeVisible()
    for (const label of ['Merchant', 'Date', 'Total']) {
      await expect(field(page, label)).toHaveAttribute('aria-required', 'true')
    }
    await expect(field(page, 'Title')).not.toHaveAttribute('aria-required', 'true')
    await drawer(page).getByRole('button', { name: 'Save expense' }).click()
    await expect(merchantField(page)).toBeFocused()
    await expect(merchantField(page)).toHaveAttribute('aria-invalid', 'true')
    await page.keyboard.press('Escape')
    await expect(drawer(page)).toBeHidden()
  })

  for (const name of ['Delete all documents', 'Delete account']) {
    test(`Settings "${name}" keeps focus inside and gives it back`, async () => {
      await page.goto('/settings')
      const opener = page.getByRole('button', { name, exact: true })
      await opener.click()
      const dialog = page.locator('.modal')
      await expect(dialog).toBeVisible()
      await expectTabTrappedIn(page, '.modal', 10)
      const confirm = dialog.getByRole('textbox')
      await confirm.click()
      await page.keyboard.type('no') // never the confirmation word
      await expect(confirm).toBeFocused()
      await expect(confirm).toHaveValue('no')
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await expect(opener).toBeFocused()
    })
  }
})
