import { describe, expect, it } from 'vitest'
import { ProfileUpdateSchema } from './schemas.ts'

describe('ProfileUpdateSchema.locale', () => {
  it('accepts real BCP 47 tags and rejects ones that would crash Intl', () => {
    expect(ProfileUpdateSchema.safeParse({ locale: 'en-NZ' }).success).toBe(true)
    expect(ProfileUpdateSchema.safeParse({ locale: 'zh-Hant-TW' }).success).toBe(true)
    for (const bad of ['en-NZ-NZ', 'en-NZZ', 'en-N2', 'en_NZ']) {
      expect(ProfileUpdateSchema.safeParse({ locale: bad }).success, bad).toBe(false)
    }
  })
})
