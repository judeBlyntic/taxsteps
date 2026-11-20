// Document filters, date ranges and search, signed in as the demo account. Read-only: nothing is created or changed.
import { expect, test, type Locator, type Page } from '@playwright/test'

process.loadEnvFile('../../.env.demo')
const env = process.env as Record<string, string>
const NO_MATCH = 'zq-no-such-document-zq'

async function signIn(page: Page) {
  await page.goto('/sign-in')
  const button = page.getByRole('button', { name: 'Sign in' })
  await expect(async () => { // typing before hydration (cold dev server) is lost: retype until the form takes it
    await page.getByLabel('Email').fill(env.DEMO_EMAIL!)
    await page.getByLabel('Password').fill(env.DEMO_PASSWORD!)
    await expect(button).toBeEnabled({ timeout: 1000 })
  }).toPass({ timeout: 60_000 })
  await button.click()
  await page.waitForURL((u) => !u.pathname.startsWith('/sign-in'))
}

/** Holds every server (RSC) request for 1.5 s, like a slow connection. */
async function slowServer(page: Page) {
  await page.route((url) => url.searchParams.has('_rsc'), async (route) => {
    await new Promise((r) => setTimeout(r, 1500))
    await route.continue().catch(() => {}) // the page may have closed meanwhile
  })
}

/** Clicks until `shows` is visible: a click that lands before hydration (cold dev server) does nothing. */
async function clickUntil(button: Locator, shows: Locator) {
  await expect(async () => {
    if (!(await shows.isVisible())) await button.click()
    await expect(shows).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 30_000 })
}

const query = (page: Page) => new URL(page.url()).searchParams

test.beforeEach(async ({ page }) => { await signIn(page) })

test('filter changes made while the URL is still updating build on each other', async ({ page }) => {
  await page.goto('/documents')
  await slowServer(page)
  await clickUntil(page.getByRole('button', { name: /^Filters/ }), page.getByLabel('From', { exact: true }))
  await page.getByLabel('From', { exact: true }).fill('2026-11-01')
  await page.getByLabel('To', { exact: true }).fill('2026-11-28')
  await expect.poll(() => query(page).toString()).toBe('from=2026-11-01&to=2026-11-28')

  const lastMonth = page.getByRole('button', { name: 'Last month' })
  await lastMonth.click()
  await expect(lastMonth).toHaveAttribute('aria-pressed', 'true', { timeout: 500 }) // at once, not after the round trip
  await page.getByLabel('Status', { exact: true }).selectOption('complete')
  await expect.poll(() => query(page).get('status')).toBe('complete')
  expect(query(page).get('from')).toMatch(/^\d{4}-\d{2}-01$/)
  expect(query(page).get('to')).not.toBe('2026-11-28')
  await expect(lastMonth).toHaveAttribute('aria-pressed', 'true')

  const clear = page.getByRole('button', { name: 'Clear' })
  await clear.click()
  await page.getByRole('button', { name: 'This month' }).click()
  await expect(clear).toBeVisible({ timeout: 500 }) // shown as soon as a filter is set, not after the round trip
  await clear.click()
  await expect.poll(() => query(page).toString()).toBe('')
  await expect(page.getByRole('button', { name: 'All time' })).toHaveAttribute('aria-pressed', 'true')
})

test('Documents loads without a hydration error and totals in the profile currency', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  for (let i = 0; i < 3; i++) {
    await page.goto(`/documents?search=${NO_MATCH}`)
    await expect(page.getByText('No documents match these filters.')).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('.user-chip .name')).not.toContainText('@', { timeout: 15_000 }) // profile loaded: name, not email
    const count = page.getByText(/^0 documents/)
    await expect(count).toHaveText(/^0 documents · \D*0[.,]00\D*$/)
    expect.soft(await count.textContent()).not.toContain('US$') // the demo account is in NZ dollars
  }
  expect(errors.filter((e) => /hydrat|did not match|didn't match/i.test(e))).toEqual([])
})

test('the result count is announced to screen readers', async ({ page }) => {
  await page.goto(`/documents?search=${NO_MATCH}`)
  await expect(page.getByRole('status').filter({ hasText: /^0 documents/ })).toBeVisible({ timeout: 30_000 })
})

test('search is capped at 100 characters and an over-long URL value still filters', async ({ page }) => {
  await page.goto('/documents')
  const box = page.getByLabel('Search documents')
  await expect(async () => { // retyped if the first attempt landed before hydration
    await box.fill('x'.repeat(150))
    await expect(box).toHaveValue('x'.repeat(100), { timeout: 1000 })
  }).toPass({ timeout: 30_000 })

  await page.goto(`/documents?search=${NO_MATCH}${'z'.repeat(120)}`)
  await expect(page.getByRole('button', { name: 'Filters (1)' })).toBeVisible()
  await expect(page.getByText('No documents match these filters.')).toBeVisible({ timeout: 30_000 })
  expect(query(page).get('search')).toHaveLength(NO_MATCH.length + 120) // the URL itself is left alone
})

test.describe('a start date after the end date is rejected', () => {
  const message = 'The start date is after the end date'

  test('Documents filter', async ({ page }) => {
    await page.goto('/documents')
    await clickUntil(page.getByRole('button', { name: /^Filters/ }), page.getByLabel('From', { exact: true }))
    await page.getByLabel('From', { exact: true }).fill('2026-11-28')
    await page.getByLabel('To', { exact: true }).fill('2026-11-01')
    await expect(page.getByText(message)).toHaveCount(2, { timeout: 15_000 }) // under the field and in place of the list
    await expect(page.getByLabel('To', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  })

  test('Reports custom range', async ({ page }) => {
    await page.goto('/reports')
    await clickUntil(page.getByRole('button', { name: 'Custom' }), page.getByLabel('From', { exact: true }))
    await page.getByLabel('From', { exact: true }).fill('2026-10-31')
    await page.getByLabel('To', { exact: true }).fill('2026-10-01')
    await expect(page.getByText(message)).toBeVisible()
    await expect(page.getByText('2026-10-31 to 2026-10-01')).toHaveCount(0)
  })

  test('Export custom range keeps Download disabled', async ({ page }) => {
    await page.goto('/export')
    await clickUntil(page.getByRole('button', { name: 'Custom range' }), page.getByLabel('From', { exact: true }))
    await page.getByLabel('From', { exact: true }).fill('2026-10-31')
    await page.getByLabel('To', { exact: true }).fill('2026-10-01')
    await expect(page.getByText(message)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Download/ })).toBeDisabled()
    await page.getByLabel('To', { exact: true }).fill('2026-11-30')
    await expect(page.getByText(message)).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Download/ })).toBeEnabled()
  })
})
