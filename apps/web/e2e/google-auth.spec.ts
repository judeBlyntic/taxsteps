// "Continue with Google": checks the button against whatever Supabase currently reports. Off → it says so and
// never opens an error page. On → it hands the browser to Google with this project's callback, and Google accepts
// the client (no redirect_uri_mismatch / invalid_client). Stops at Google's account screen: no Google password.
import { expect, test } from '@playwright/test'

process.loadEnvFile('../../.env.test')
const env = process.env as Record<string, string>
let googleOn: boolean | null = null // null: Supabase unreachable (e.g. the project is paused)

test.beforeAll(async () => {
  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: env.SUPABASE_ANON_KEY! } })
    if (res.ok) googleOn = Boolean((await res.json()).external?.google)
  } catch { /* unreachable: the tests that need a live project skip */ }
})

for (const path of ['/sign-in', '/sign-up']) {
  test(`${path}: Continue with Google is offered above the email form`, async ({ page }) => {
    await page.goto(path)
    const google = page.getByRole('button', { name: 'Continue with Google' })
    await expect(google).toBeVisible()
    await expect(page.getByRole('separator')).toHaveText('or use your email')
    const [g, email] = await Promise.all([google.boundingBox(), page.getByLabel('Email').boundingBox()])
    expect(g!.y).toBeLessThan(email!.y)
  })
}

test('while Google is off in Supabase, the button explains instead of failing', async ({ page }) => {
  test.skip(googleOn !== false, 'needs a reachable project with Google switched off')
  await page.goto('/sign-in')
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Google' })).toHaveText("Google sign-in isn't switched on yet. Please use your email for now.")
  await expect(page).toHaveURL(/\/sign-in$/)
})

test('with Google on, the button hands off to Google with this project’s callback', async ({ page }) => {
  test.skip(googleOn !== true, 'Google is not enabled in Supabase yet, or the project is unreachable')
  await page.goto('/sign-in')
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  await page.waitForURL(/accounts\.google\.com/, { timeout: 30_000 })
  const firstGoogleUrl = page.url()
  // Google shows its own error page for an unknown client or an unregistered redirect URI.
  await expect(page.locator('body')).not.toContainText(/redirect_uri_mismatch|invalid_client|OAuth client was not found|Access blocked/i)
  const params = new URL(firstGoogleUrl).searchParams
  const redirect = params.get('redirect_uri') ?? new URL(params.get('continue') ?? 'http://x').searchParams.get('redirect_uri')
  if (redirect) expect(redirect).toBe(`${env.SUPABASE_URL}/auth/v1/callback`)
})

test('when Supabase cannot be reached, the button explains and stays on the page', async ({ page }) => {
  await page.route('**/auth/v1/settings', (route) => route.abort('namenotresolved')) // e.g. a paused project's address is gone
  await page.goto('/sign-in')
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'sign-in service' }))
    .toHaveText("We can't reach the sign-in service right now. Please check your connection and try again in a moment.")
  await expect(page).toHaveURL(/\/sign-in$/)
})

test('a cancelled or failed Google sign-in returns to Sign in with a clear message', async ({ page }) => {
  await page.goto('/auth/confirm?via=google&error=access_denied&error_description=cancelled')
  await expect(page).toHaveURL(/\/sign-in\?error=google$/)
  await expect(page.getByText("Google sign-in didn't finish. Please try again, or use your email and password.")).toBeVisible()
})
