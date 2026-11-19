import { describe, expect, it } from 'vitest'
import { scrubAnalyticsUrl } from './analytics'

describe('analytics URL scrubbing', () => {
  it('drops search text, filters, selected ids and fragments', () => {
    expect(scrubAnalyticsUrl('https://taxsteps.pro/documents?q=Mitre%2010&from=2026-01-01#top')).toBe('https://taxsteps.pro/documents')
    expect(scrubAnalyticsUrl('https://taxsteps.pro/export?ids=3f2a,9b1c')).toBe('https://taxsteps.pro/export')
  })

  it('never records sign-in codes or reset tokens', () => {
    expect(scrubAnalyticsUrl('https://taxsteps.pro/auth/confirm?code=abc123&next=/reset-password')).toBe('https://taxsteps.pro/auth/confirm')
    expect(scrubAnalyticsUrl('https://taxsteps.pro/reset-password#access_token=xyz')).toBe('https://taxsteps.pro/reset-password')
  })

  it('keeps plain page addresses unchanged', () => {
    expect(scrubAnalyticsUrl('https://taxsteps.pro/dashboard')).toBe('https://taxsteps.pro/dashboard')
  })
})
