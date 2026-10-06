import { describe, expect, it } from 'vitest'
import { LEGAL_DOCS, OPERATOR, PRIVACY, SERVICE_PROVIDERS, TERMS_VERSION } from './legal.ts'

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

  it('name the operator and a contact in both documents, with no empty sections', () => {
    for (const doc of Object.values(LEGAL_DOCS)) {
      expect(text(doc)).toContain(OPERATOR.name)
      expect(text(doc)).toContain(OPERATOR.email)
      for (const s of doc.sections) expect(s.body.length, `${doc.slug}: ${s.heading}`).toBeGreaterThan(0)
    }
  })
})
