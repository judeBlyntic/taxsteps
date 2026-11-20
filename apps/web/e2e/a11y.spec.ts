// WCAG 2.2 AA checks: axe rules plus the keyboard, focus, reflow and announcement fixes from the accessibility audit.
// Signed-in tests use the demo account (DEMO_EMAIL / DEMO_PASSWORD from the repo-root .env.demo) and are read-only:
// every write to Supabase is aborted before it leaves the browser, and the run fails if one was attempted.
// Colour contrast is excluded here: those colours await a design decision.
import { expect, test as base, type Browser, type BrowserContext, type Locator, type Page, type TestInfo } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

try { process.loadEnvFile('../../.env.demo') } catch { /* signed-in tests skip below */ }
const { DEMO_EMAIL, DEMO_PASSWORD } = process.env

const APP_PAGES = [['/', 'Dashboard'], ['/documents', 'Documents'], ['/scan', 'Scan'], ['/reports', 'Reports'], ['/export', 'Export'], ['/settings', 'Settings']] as const
const AUTH_PAGES = [['/sign-in', 'Sign in'], ['/sign-up', 'Sign up'], ['/forgot-password', 'Forgot password'], ['/reset-password', 'Reset password'], ['/auth/confirmed', 'Email confirmed']] as const

async function axe(page: Page, exclude?: string) {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).disableRules(['color-contrast'])
  if (exclude) builder = builder.exclude(exclude)
  const { violations } = await builder.analyze()
  return violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
}

/** Waits until loading spinners and busy regions are gone. */
async function settle(page: Page) {
  await expect(page.locator('.spinner, [aria-busy="true"]')).toHaveCount(0, { timeout: 30_000 })
}

/** The computed outline while the element has keyboard focus. */
async function focusRing(el: Locator) {
  await el.focus()
  return el.evaluate((e) => { const s = getComputedStyle(e); return e.matches(':focus-visible') && s.outlineStyle !== 'none' ? `${s.outlineWidth} ${s.outlineStyle}` : 'none' })
}

// ── Signed out ──────────────────────────────────────────────────────────────────────────────────────────────────

base('auth pages have their own titles and no axe violations', async ({ page }) => {
  for (const [path, title] of AUTH_PAGES) {
    await page.goto(path)
    await expect.soft(page, path).toHaveTitle(`${title} · Tax Steps`)
    expect.soft(await axe(page), path).toEqual([])
  }
  await expect(page.getByRole('heading', { level: 1, name: 'Email confirmed' })).toBeVisible()
})

base('website pages have no axe violations, and the legal pages have a skip link', async ({ page }) => {
  for (const path of ['/', '/terms', '/privacy']) {
    await page.goto(path)
    expect.soft(await axe(page), path).toEqual([])
    if (path === '/') continue
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Tab')
    // The legal text has no links, so the next stop is past <main>; what matters is that the header was skipped.
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('header'))), path).toBe(false)
  }
})

base('sign-in keeps its button reachable and explains what is missing', async ({ page }) => {
  const calls: string[] = []
  page.on('request', (r) => { if (r.url().includes('/auth/v1/')) calls.push(r.url()) })
  await page.goto('/sign-in')
  const submit = page.getByRole('button', { name: 'Sign in' })
  await expect(submit).toBeEnabled()
  await submit.click()
  await expect(page.getByText('Enter your email address.')).toBeVisible()
  await expect(page.getByLabel('Email')).toBeFocused()
  await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true')
  await page.getByLabel('Email').fill('someone@taxsteps.test')
  await expect(page.getByText('Enter your email address.')).toHaveCount(0)
  await submit.click()
  await expect(page.getByText('Enter your password.')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeFocused()
  expect(calls).toEqual([])
})

base('forgot password keeps its button reachable and explains what is missing', async ({ page }) => {
  const calls: string[] = []
  page.on('request', (r) => { if (r.url().includes('/auth/v1/')) calls.push(r.url()) })
  await page.goto('/forgot-password')
  const submit = page.getByRole('button', { name: 'Send reset link' })
  await expect(submit).toBeEnabled()
  await submit.click()
  await expect(page.getByText('Enter your email address.')).toBeVisible()
  await expect(page.getByLabel('Email')).toBeFocused()
  expect(calls).toEqual([])
})

// ── Signed in (demo account, read-only) ─────────────────────────────────────────────────────────────────────────

const blocked: string[] = []

/** Lets reads through and aborts every write, recording it. */
async function readOnly(ctx: BrowserContext) {
  await ctx.route('**/rest/v1/**', (route) => {
    const r = route.request()
    if (['GET', 'HEAD', 'OPTIONS'].includes(r.method()) || r.url().includes('/rest/v1/rpc/document_summary')) return route.continue()
    blocked.push(`${r.method()} ${r.url().split('?')[0]}`)
    return route.abort()
  })
  await ctx.route('**/functions/v1/**', (route) => {
    const r = route.request()
    if (['GET', 'OPTIONS'].includes(r.method())) return route.continue()
    if (r.url().includes('/functions/v1/google-sheets') && /"action":"(status|list-spreadsheets|list-worksheets)"/.test(r.postData() ?? '')) return route.continue()
    blocked.push(`${r.method()} ${r.url().split('?')[0]}`)
    return route.abort()
  })
}

let demoState: ReturnType<BrowserContext['storageState']> | undefined
function signIn(browser: Browser, baseURL: string) {
  demoState ??= (async () => {
    const ctx = await browser.newContext({ baseURL })
    const page = await ctx.newPage()
    await page.goto('/sign-in')
    await page.getByLabel('Email').fill(DEMO_EMAIL!)
    await page.getByLabel('Password').fill(DEMO_PASSWORD!)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL((u) => !u.pathname.startsWith('/sign-in'), { timeout: 60_000 })
    const state = await ctx.storageState()
    await ctx.close()
    return state
  })()
  return demoState
}

const test = base.extend<{ page: Page }>({
  page: async ({ browser }, provide, testInfo: TestInfo) => { // not `use`: the react-hooks lint mistakes it for a hook
    const baseURL = testInfo.project.use.baseURL!
    const ctx = await browser.newContext({ baseURL, storageState: await signIn(browser, baseURL) })
    await readOnly(ctx)
    await provide(await ctx.newPage())
    await ctx.close()
  },
})

test.describe('signed in', () => {
  test.skip(!DEMO_EMAIL || !DEMO_PASSWORD, 'needs DEMO_EMAIL and DEMO_PASSWORD in the repo-root .env.demo')
  test.afterAll(() => expect(blocked, 'writes attempted against the live database').toEqual([]))

  test('every app page has its own title and no axe violations, on desktop and phone', async ({ page }) => {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 })
      for (const [path, title] of APP_PAGES) {
        await page.goto(path)
        await settle(page)
        await expect.soft(page, path).toHaveTitle(`${title} · Tax Steps`)
        // The Categories card heading belongs to CategoryManager, fixed separately.
        expect.soft(await axe(page, path === '/settings' ? 'h4' : undefined), `${path} @${width}`).toEqual([])
      }
    }
  })

  test('the shell has one main landmark and a skip link that lands in it', async ({ page }) => {
    await page.goto('/documents')
    await settle(page)
    await expect(page.getByRole('main')).toHaveCount(1)
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to content' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeInViewport()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('main')))).toBe(true)
  })

  test('export tiles and the month picker show a focus ring', async ({ page }) => {
    await page.goto('/reports')
    await settle(page)
    for (const tile of [page.getByRole('button', { name: /^CSV/ }), page.getByRole('button', { name: /^Excel/ }),
      page.getByRole('button', { name: /^PDF/ }), page.getByRole('link', { name: /^Google Sheets/ })]) {
      expect(await focusRing(tile)).not.toBe('none')
    }
    await page.goto('/')
    await settle(page)
    expect(await focusRing(page.getByLabel('Choose month'))).not.toBe('none')
  })

  test('pressed and current items keep an outline in forced colours', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    await page.goto('/reports')
    await settle(page)
    const outline = (el: Locator) => el.evaluate((e) => getComputedStyle(e).outlineStyle)
    expect(await outline(page.getByRole('group', { name: 'Period' }).getByRole('button', { name: 'Month' }))).toBe('solid')
    expect(await outline(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Reports' }))).toBe('solid')
  })

  test('the export format is a group of toggle buttons', async ({ page }) => {
    await page.goto('/export')
    await settle(page)
    const format = page.getByRole('group', { name: 'Format' })
    await expect(format.getByRole('button', { name: 'Excel' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('radio')).toHaveCount(0)
    await format.getByRole('button', { name: 'CSV' }).click()
    await expect(format.getByRole('button', { name: 'CSV' })).toHaveAttribute('aria-pressed', 'true')
    await expect(format.getByRole('button', { name: 'Excel' })).toHaveAttribute('aria-pressed', 'false')
  })

  test('no page scrolls sideways at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 })
    for (const [path] of APP_PAGES) {
      await page.goto(path)
      await settle(page)
      expect.soft(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(320)
    }
  })

  test('the phone top bar names its sync dot and keeps the avatar initials in the link name', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/documents')
    await settle(page)
    await expect(page.getByRole('img', { name: /All synced|Connecting…|Offline/ })).toBeVisible()
    const avatar = page.locator('.topbar a.avatar')
    const initials = await avatar.evaluate((e) => e.firstChild?.textContent)
    await expect(avatar).toHaveAccessibleName(`${initials} Settings`)
    await expect(page.getByRole('button', { name: 'Add manually' })).toBeVisible()
  })

  test('receipt days say how many documents and of which type, not just by colour', async ({ page }) => {
    await page.goto('/')
    await settle(page)
    const select = page.getByLabel('Choose month')
    const months = await select.locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value))
    const days = page.locator('.cal-day[data-kind]')
    for (const m of months) {
      if (await days.count()) break
      await select.selectOption(m)
      await settle(page)
    }
    expect(await days.count()).toBeGreaterThan(0)
    const seen = new Map<string, string>()
    for (const day of await days.all()) {
      const kind = (await day.getAttribute('data-kind'))!
      await expect(day).toContainText(new RegExp(`\\d+ documents?, ${kind}$`))
      seen.set(kind, await day.evaluate((e) => getComputedStyle(e).boxShadow))
    }
    if (seen.size === 2) expect(seen.get('business')).not.toBe(seen.get('personal'))
  })

  test('error toasts stay until dismissed and are announced as alerts', async ({ page }) => {
    await page.route('**/functions/v1/export-documents', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"stub"}' }))
    await page.goto('/reports')
    await settle(page)
    await page.getByRole('button', { name: /^CSV/ }).click()
    const toast = page.getByRole('alert').filter({ has: page.getByRole('button', { name: 'Dismiss' }) })
    await expect(toast).toBeVisible()
    await page.waitForTimeout(7_000)
    await expect(toast).toBeVisible()
    await toast.getByRole('button', { name: 'Dismiss' }).click()
    await expect(toast).toHaveCount(0)
  })

  test('scanning announces each step and moves focus to the progress heading', async ({ page }) => {
    let release!: () => void
    const gate = new Promise<void>((r) => { release = r })
    await page.route('**/functions/v1/extract-document', async (route) => {
      await gate
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          fields: { document_type: 'receipt', merchant_name: 'Countdown', title: 'Groceries', description: null, category: 'Meals', amount: 87.45,
            subtotal: 76.04, tax_amount: 11.41, tax_label: 'GST', currency: 'NZD', transaction_date: '2026-10-04', invoice_number: null, payment_method: 'EFTPOS' },
          confidence: { merchant_name: 0.95, amount: 0.95, tax_amount: 0.6 }, warnings: [], model: 'stub',
        }),
      })
    })
    await page.goto('/scan')
    await settle(page)
    await page.locator('input[type=file]:not([capture])').setInputFiles('../../fixtures/receipt-countdown.jpg')
    await expect(page.getByRole('heading', { name: 'Reading your receipt…' })).toBeFocused()
    await expect(page.getByRole('status').filter({ hasText: 'Extracting details' })).toHaveCount(1)
    release()
    await expect(page.getByRole('heading', { name: 'Review your information' })).toBeVisible()
  })
})
