// Terms of Service / Privacy Policy pages and the sign-up agreement tick box.
import { expect, test } from '@playwright/test'

for (const [path, title] of [['/terms', 'Terms of Service'], ['/privacy', 'Privacy Policy']] as const) {
  test(`${path} is public and states the data promise`, async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveURL(new RegExp(`${path}$`)) // not bounced to sign-in
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    await expect(page.getByText(/never sells it, and never shares it with anyone for their own purposes/).first()).toBeVisible()
    await expect(page.getByText('Blyntic Ltd').first()).toBeVisible()
  })
}

test('the Privacy Policy names every service provider', async ({ page }) => {
  await page.goto('/privacy')
  const table = page.getByRole('table', { name: 'Service providers' })
  for (const name of ['Supabase', 'Vercel', 'OpenAI', 'Google']) await expect(table.getByRole('rowheader', { name })).toBeVisible()
})

test('sign-up stays locked until the terms are accepted', async ({ page }) => {
  await page.goto('/sign-up')
  const agree = page.getByRole('checkbox', { name: /I agree to the Terms of Service and Privacy Policy/ })
  const create = page.getByRole('button', { name: 'Create account' })
  const google = page.getByRole('button', { name: 'Continue with Google' })
  await page.getByLabel('Email').fill('someone@taxsteps.test')
  await page.getByLabel('Password').fill('a-long-enough-password')

  await expect(agree).not.toBeChecked()
  await expect(create).toBeDisabled()
  await expect(google).toBeDisabled()
  await expect(page.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms')
  await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy')

  await agree.check()
  await expect(create).toBeEnabled()
  await expect(google).toBeEnabled()
})

test('sign-in tells Google users what they agree to', async ({ page }) => {
  await page.goto('/sign-in')
  await expect(page.getByText(/By continuing with Google you agree to the Terms of Service and/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy')
})
