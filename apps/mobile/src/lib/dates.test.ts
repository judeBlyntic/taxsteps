import { describe, expect, it } from 'vitest'
import { fyStartDay, greeting } from './dates'

describe('greeting', () => {
  it('uses the hour in the saved timezone', () => {
    const noonUtc = new Date('2026-11-20T12:00:00Z')
    expect(greeting('UTC', noonUtc)).toBe('Good afternoon')
    expect(greeting('Pacific/Auckland', noonUtc)).toBe('Good morning') // 01:00 NZDT
  })
  it('falls back instead of crashing on a timezone this device does not know', () => {
    for (const tz of ['posix/Pacific/Auckland', 'Not/AZone', '']) expect(() => greeting(tz), tz).not.toThrow()
    expect(greeting('Not/AZone')).toMatch(/^Good (morning|afternoon|evening)$/)
  })
})

describe('fyStartDay', () => {
  it('keeps the start day inside the chosen month', () => {
    expect(fyStartDay(4, 45)).toBe(30)
    expect(fyStartDay(2, 31)).toBe(28)
    expect(fyStartDay(12, 31)).toBe(31)
    expect(fyStartDay(7, 0)).toBe(1)
    expect(fyStartDay(4, 1)).toBe(1)
  })
})
