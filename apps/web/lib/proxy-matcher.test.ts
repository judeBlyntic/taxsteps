import { describe, expect, it } from 'vitest'
import { config } from '../proxy'

const runsOn = (path: string) => config.matcher.some((m) => new RegExp(`^${m}$`).test(path))

describe('proxy matcher', () => {
  it('lets Vercel Web Analytics through without a sign-in redirect', () => {
    expect(runsOn('/_vercel/insights/script.js')).toBe(false)
    expect(runsOn('/_vercel/insights/view')).toBe(false)
  })

  it('still guards app pages and the home page', () => {
    for (const path of ['/', '/dashboard', '/documents', '/settings', '/sign-in']) expect(runsOn(path), path).toBe(true)
  })
})
