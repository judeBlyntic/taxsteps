import { describe, expect, it } from 'vitest'
import { ProfileUpdateSchema, looksLikeEmail } from './schemas.ts'

describe('looksLikeEmail', () => {
  it('catches obviously mistyped addresses', () => {
    for (const bad of ['not-an-email', 'jude@', '@gmail.com', 'jude@gmailcom', 'jude gmail.com', 'jude@gmail .com', 'jude@@gmail.com', '']) {
      expect(looksLikeEmail(bad), bad).toBe(false)
    }
  })
  it('accepts ordinary addresses', () => {
    for (const ok of ['jude@gmail.com', 'a.b+tag@sub.example.co.nz', "o'neil@x.io"]) expect(looksLikeEmail(ok), ok).toBe(true)
  })
})

describe('ProfileUpdateSchema.locale', () => {
  it('accepts real BCP 47 tags and rejects ones that would crash Intl', () => {
    expect(ProfileUpdateSchema.safeParse({ locale: 'en-NZ' }).success).toBe(true)
    expect(ProfileUpdateSchema.safeParse({ locale: 'zh-Hant-TW' }).success).toBe(true)
    for (const bad of ['en-NZ-NZ', 'en-NZZ', 'en-N2', 'en_NZ']) {
      expect(ProfileUpdateSchema.safeParse({ locale: bad }).success, bad).toBe(false)
    }
  })
})

describe('ProfileUpdateSchema.theme', () => {
  it('accepts only the known app themes', () => {
    expect(ProfileUpdateSchema.safeParse({ theme: 'fresh' }).success).toBe(true)
    expect(ProfileUpdateSchema.safeParse({ theme: 'classic' }).success).toBe(true)
    expect(ProfileUpdateSchema.safeParse({ theme: 'dark' }).success).toBe(false)
  })
})
