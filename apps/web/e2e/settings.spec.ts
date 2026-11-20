// Settings and sign-up checks. The Settings tests use the demo account with two browser contexts as two
// "devices". They only rename existing categories and edit profile fields, and put every original value back.
// /auth/v1/logout is intercepted so the shared demo sessions are never revoked; sign-up is never sent.
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

process.loadEnvFile('../../.env.test')
process.loadEnvFile('../../.env.demo')
const env = process.env as Record<string, string>
const api = createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
type Baseline = { full_name: string | null; business_name: string | null; locale: string; cats: { id: string; name: string }[] }
let before: Baseline

async function snapshot(): Promise<Baseline> {
  const { data: p, error } = await api.from('profiles').select('full_name, business_name, locale').single()
  if (error) throw error
  const { data: cats, error: e2 } = await api.from('categories').select('id, name').eq('archived', false).order('sort')
  if (e2) throw e2
  return { ...p, cats }
}

async function device(browser: Browser): Promise<Page> {
  const context = await browser.newContext()
  await context.route('**/auth/v1/logout**', (route) => route.fulfill({ status: 204 }))
  const page = await context.newPage()
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(env.DEMO_EMAIL!)
  await page.getByLabel('Password').fill(env.DEMO_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/sign-in'))
  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible()
  return page
}

const categoryFields = (p: Page) => p.locator('section', { has: p.getByRole('heading', { name: 'Categories' }) }).getByLabel('Category name')

/** Records a field's value on every frame, to catch a save briefly flashing the old value back. */
async function recordFrames(field: Locator) {
  await field.evaluate((el: HTMLInputElement) => {
    const seen: string[] = []
    ;(window as unknown as { seen: string[] }).seen = seen
    const tick = () => { seen.push(el.value); if (seen.length < 180) requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  })
  return () => field.page().evaluate(() => (window as unknown as { seen: string[] }).seen)
}
const after = (seen: string[], value: string) => seen.slice(seen.indexOf(value))

function watchCategoryWrites(p: Page): string[] {
  const writes: string[] = []
  p.on('request', (r) => { if (r.url().includes('/rest/v1/categories') && r.method() !== 'GET') writes.push(r.method()) })
  return writes
}

test.describe('Settings on the demo account', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 })

  test.beforeAll(async () => {
    const { error } = await api.auth.signInWithPassword({ email: env.DEMO_EMAIL!, password: env.DEMO_PASSWORD! })
    if (error) throw error
    before = await snapshot()
  })

  test.afterAll(async () => {
    const now = await snapshot()
    if (now.full_name !== before.full_name || now.business_name !== before.business_name || now.locale !== before.locale) {
      await api.from('profiles').update({ full_name: before.full_name, business_name: before.business_name, locale: before.locale }).eq('id', env.DEMO_USER_ID!)
    }
    for (const c of before.cats) {
      if (now.cats.find((x) => x.id === c.id)?.name !== c.name) await api.from('categories').update({ name: c.name }).eq('id', c.id)
    }
    expect(await snapshot()).toEqual(before)
    await api.auth.signOut({ scope: 'local' })
  })

  test('a category renamed on another device shows up, and tabbing through the field writes nothing', async ({ browser }) => {
    const [a, b] = await Promise.all([device(browser), device(browser)])
    const target = before.cats.at(-1)!
    const i = (await categoryFields(a).evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))).indexOf(target.name)
    const fieldA = categoryFields(a).nth(i)
    const fieldB = categoryFields(b).nth(i)
    const renamed = `QA-FIX2-${target.name}`

    await fieldB.fill(renamed)
    await fieldB.blur()
    await expect(fieldA).toHaveValue(renamed, { timeout: 15_000 })

    const writes = watchCategoryWrites(a)
    await fieldA.focus()
    await fieldA.blur()
    await a.waitForTimeout(1500)
    expect(writes).toEqual([])

    // A renaming it back keeps showing the new name, with no frame of the old one in between.
    const frames = await recordFrames(fieldA)
    await fieldA.fill(target.name)
    await fieldA.blur()
    await expect(fieldB).toHaveValue(target.name, { timeout: 15_000 })
    expect(after(await frames(), target.name)).not.toContain(renamed)
    await expect(fieldA).toHaveValue(target.name)
  })

  test('clearing a category name puts the saved name back and saves nothing', async ({ browser }) => {
    const a = await device(browser)
    const target = before.cats.at(-1)!
    const field = categoryFields(a).nth(before.cats.length - 1)
    await expect(field).toHaveValue(target.name)
    const writes = watchCategoryWrites(a)
    await field.fill('   ')
    await field.blur()
    await expect(field).toHaveValue(target.name)
    await a.waitForTimeout(1000)
    expect(writes).toEqual([])
  })

  test('renaming to a name that is taken says so and keeps the saved name', async ({ browser }) => {
    const a = await device(browser)
    const [taken, target] = [before.cats[0]!, before.cats.at(-1)!]
    const field = categoryFields(a).nth(before.cats.length - 1)
    await expect(field).toHaveValue(target.name)
    await field.fill(taken.name)
    await field.blur()
    const toasts = a.locator('.toast-region')
    await expect(toasts).toContainText(`You already have a category called “${taken.name}”.`)
    await expect(toasts).not.toContainText(/expense/i)
    await expect(field).toHaveValue(target.name)
  })

  test('unsaved Settings typing survives a profile change from another device; untouched fields still update', async ({ browser }) => {
    const [a, b] = await Promise.all([device(browser), device(browser)])
    await a.getByLabel('Business name').fill('QA-FIX2 unsaved business')
    await a.getByLabel('Number & date format').fill('en-AU')

    const newName = `${before.full_name ?? 'Demo'} QA-FIX2`
    const nameB = b.getByLabel('Name', { exact: true })
    const frames = await recordFrames(nameB)
    await nameB.fill(newName)
    await b.getByRole('button', { name: 'Save profile' }).click()
    await expect(b.getByText('Profile saved')).toBeVisible()
    expect(after(await frames(), newName)).not.toContain(before.full_name ?? '')

    await expect(a.getByLabel('Name', { exact: true })).toHaveValue(newName, { timeout: 15_000 })
    await expect(a.getByLabel('Business name')).toHaveValue('QA-FIX2 unsaved business')
    await expect(a.getByLabel('Number & date format')).toHaveValue('en-AU')
  })

  test('Sign out signs out only this browser', async ({ browser }) => {
    const a = await device(browser)
    const logout = a.waitForRequest('**/auth/v1/logout**')
    await a.getByRole('button', { name: 'Sign out' }).click()
    expect(new URL((await logout).url()).searchParams.get('scope')).toBe('local')
    await expect(a).toHaveURL(/\/sign-in$/)
  })
})

test.describe('Sign-up email and password checks', () => {
  const INVALID_EMAIL = "That email address doesn't look right. Please check it and try again."
  let sent: string[]

  test.beforeEach(async ({ page }) => {
    sent = []
    await page.route('**/auth/v1/signup**', (route) => {
      sent.push(route.request().url())
      return route.fulfill({ status: 400, contentType: 'application/json',
        body: JSON.stringify({ code: 400, error_code: 'validation_failed', msg: 'Unable to validate email address: invalid format' }) })
    })
    await page.goto('/sign-up')
    await page.getByRole('checkbox').check()
  })

  async function create(page: Page, email: string, password: string) {
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Create account' }).click()
  }

  test('an obviously mistyped email is caught before anything is sent', async ({ page }) => {
    await create(page, 'not-an-email', 'long-enough-password')
    await expect(page.getByRole('alert').filter({ hasText: 'email' })).toHaveText(INVALID_EMAIL)
    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Email')).toHaveAccessibleDescription(INVALID_EMAIL)
    expect(sent).toEqual([])
  })

  test('an email the server rejects gets the same helpful message', async ({ page }) => {
    await create(page, 'qa-fix2@example..com', 'long-enough-password')
    await expect(page.getByRole('alert').filter({ hasText: 'email' })).toHaveText(INVALID_EMAIL)
    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(sent).toHaveLength(1)
  })

  test('a short password marks the password field', async ({ page }) => {
    const msg = 'Please choose a password with at least 8 characters.'
    await create(page, 'qa-fix2@example.com', 'short')
    await expect(page.getByRole('alert').filter({ hasText: 'password' })).toHaveText(msg)
    await expect(page.getByLabel('Password')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Password')).toHaveAccessibleDescription(msg)
    await expect(page.getByLabel('Email')).not.toHaveAttribute('aria-invalid', 'true')
    expect(sent).toEqual([])
  })
})
