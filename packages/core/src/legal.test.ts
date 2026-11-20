import { describe, expect, it } from 'vitest'
import { COPY } from './copy.ts'
import { ACCOUNT_DELETION, LEGAL_DOCS, OPERATOR, PRIVACY, SERVICE_PROVIDERS, SUPPORT, TERMS_VERSION } from './legal.ts'

const text = (d: typeof PRIVACY) => JSON.stringify(d)

describe('legal documents', () => {
  it('use a dated version the database accepts', () => {
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('keep the privacy promise honest: every provider is named with its role and location', () => {
    expect(SERVICE_PROVIDERS.map((p) => p.name)).toEqual(['Supabase', 'Vercel', 'OpenAI', 'Google'])
    for (const p of SERVICE_PROVIDERS) expect(p.role.length > 10 && p.location.length > 2, p.name).toBe(true)
    expect(text(PRIVACY)).toContain('"providers":true')
    expect(text(PRIVACY)).toContain('never sell')
  })

  it('disclose the website-only, consent-first advertising cookie', () => {
    const cookies = PRIVACY.sections.find((s) => s.heading === 'Cookies and advertising')
    expect(cookies).toBeDefined()
    const said = JSON.stringify(cookies)
    for (const fact of ['Meta Pixel', 'we ask before', 'If you decline, it never loads', 'never receives your account, business information or expense records', 'Cookie choices'])
      expect(said, fact).toContain(fact)
  })

  it('disclose the cookieless visit statistics, and no longer claim the app has no analytics', () => {
    const said = JSON.stringify(PRIVACY.sections.find((s) => s.heading === 'Cookies and advertising'))
    for (const fact of ['Vercel Web Analytics', 'uses no cookies', 'never receives your name, email, business information or expense records', 'search text'])
      expect(said, fact).toContain(fact)
    expect(said).not.toContain('no advertising or analytics trackers in the app')
    expect(SERVICE_PROVIDERS.find((p) => p.name === 'Vercel')?.role).toMatch(/visit statistics/)
  })

  it('publish the store pages: account deletion (Google Play) and support (App Store)', () => {
    for (const doc of [ACCOUNT_DELETION, SUPPORT]) {
      expect(text(doc), doc.title).toContain(OPERATOR.name)
      expect(text(doc), doc.title).toContain(OPERATOR.email)
    }
    const deletion = text(ACCOUNT_DELETION)
    for (const fact of ['Settings → Privacy → Delete account', 'What is deleted', 'What is kept', 'never stored']) expect(deletion, fact).toContain(fact)
  })

  it('ask before sending a receipt to the AI provider, naming what goes where', () => {
    for (const fact of ['OpenAI', 'United States', 'country, currency and category names', 'does not train on it', '30 days', 'never stores the photo'])
      expect(COPY.aiConsent, fact).toContain(fact)
  })

  it('name the operator and a contact in both documents, with no empty sections', () => {
    for (const doc of Object.values(LEGAL_DOCS)) {
      expect(text(doc)).toContain(OPERATOR.name)
      expect(text(doc)).toContain(OPERATOR.email)
      for (const s of doc.sections) expect(s.body.length, `${doc.slug}: ${s.heading}`).toBeGreaterThan(0)
    }
  })
})
