// Meta Pixel on the public website: nothing loads until the visitor accepts, never on sign-in/sign-up or in the app.
// Meta's script is stubbed, so no request ever reaches Meta. Run with a test ID to cover the consent flow:
//   NEXT_PUBLIC_META_PIXEL_ID=1234567890 npx playwright test e2e/meta-pixel.spec.ts   (fresh dev server)
import { expect, test, type Page } from '@playwright/test'

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

/** Stub Meta's library and record every request to Meta's domains. */
async function watchMeta(page: Page) {
  const hits: string[] = []
  page.on('request', (r) => { if (/facebook\.(net|com)/.test(r.url())) hits.push(r.url()) })
  await page.route(/connect\.facebook\.net/, (route) => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.fbq.callMethod = function () { (window.__fbqCalls = window.__fbqCalls || []).push([].slice.call(arguments)) };',
  }))
  return hits
}
const fbqCalls = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { fbq?: { queue: unknown[][] }; __fbqCalls?: unknown[][] }
  return [...(w.fbq?.queue ?? []), ...(w.__fbqCalls ?? [])].map((c) => JSON.stringify(c))
})

test('without a Pixel ID there is no banner and nothing is sent to Meta', async ({ page }) => {
  test.skip(Boolean(PIXEL_ID), 'a Pixel ID is configured')
  const hits = await watchMeta(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Every receipt, sorted.' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Cookie choices' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Cookie choices' })).toHaveCount(0)
  expect(hits).toEqual([])
})

test.describe('with a Pixel ID', () => {
  test.skip(!PIXEL_ID, 'set NEXT_PUBLIC_META_PIXEL_ID to run')

  test('asks first, and loads nothing before Accept', async ({ page }) => {
    const hits = await watchMeta(page)
    await page.goto('/')
    await expect(page.getByRole('region', { name: 'Cookie choices' })).toBeVisible()
    await page.waitForTimeout(1000)
    expect(hits).toEqual([])
    expect(await page.evaluate(() => 'fbq' in window)).toBe(false)
  })

  test('Decline keeps Meta away, and is remembered', async ({ page }) => {
    const hits = await watchMeta(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'Decline' }).click()
    await expect(page.getByRole('region', { name: 'Cookie choices' })).toHaveCount(0)
    await page.reload()
    await page.waitForTimeout(1000)
    await expect(page.getByRole('region', { name: 'Cookie choices' })).toHaveCount(0)
    expect(hits).toEqual([])
  })

  test('Accept loads the Pixel with automatic form reading off, then counts Start free as a Lead', async ({ page }) => {
    await watchMeta(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'Accept' }).click()
    await expect.poll(() => fbqCalls(page)).toEqual(expect.arrayContaining([
      JSON.stringify(['set', 'autoConfig', false, PIXEL_ID]), JSON.stringify(['init', PIXEL_ID]), JSON.stringify(['track', 'PageView']),
    ]))
    expect(await page.evaluate(() => (window as unknown as { fbq: { disablePushState?: boolean } }).fbq.disablePushState)).toBe(true)

    // Stay on the page to read the call log: the Pixel's listener runs first (capture), then this cancels the navigation.
    await page.evaluate(() => window.addEventListener('click', (e) => e.preventDefault()))
    await page.getByRole('link', { name: 'Start free' }).first().click()
    await expect.poll(() => fbqCalls(page)).toContain(JSON.stringify(['track', 'Lead']))
  })

  test('the sign-up page never loads the Pixel, even after Accept', async ({ page }) => {
    const hits = await watchMeta(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'Accept' }).click()
    await expect.poll(() => hits.length).toBeGreaterThan(0)
    hits.length = 0
    await page.getByRole('link', { name: 'Start free' }).first().click()
    await expect(page).toHaveURL(/\/sign-up$/)
    await page.waitForTimeout(1000)
    expect(await page.evaluate(() => 'fbq' in window)).toBe(false)
    expect(hits).toEqual([])
  })

  test('Cookie choices in the footer reopens the banner', async ({ page }) => {
    await watchMeta(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'Decline' }).click()
    await page.getByRole('button', { name: 'Cookie choices' }).click()
    await expect(page.getByRole('region', { name: 'Cookie choices' })).toBeVisible()
  })
})

test('the Privacy Policy discloses the consent-only Meta Pixel', async ({ page }) => {
  await page.goto('/privacy')
  await expect(page.getByRole('heading', { name: 'Cookies and advertising' })).toBeVisible()
  await expect(page.getByText(/we ask before using Meta's advertising cookie \(the Meta Pixel\)/)).toBeVisible()
})
