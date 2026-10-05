import { describe, expect, it } from 'vitest'
import { AppError, isAppError, toUserMessage } from './errors.ts'

describe('toUserMessage', () => {
  it('uses the spec copy for app errors', () => {
    expect(toUserMessage(new AppError('UNREADABLE'))).toBe("We couldn't read this receipt clearly. Please try again or enter the information manually.")
    expect(toUserMessage(new AppError('SAVE_FAILED'))).toBe("Your expense wasn't saved. Please try again.")
  })
  it('recognises network failures on web and React Native', () => {
    const msg = "We couldn't connect to Tax Steps. Please check your internet connection and try again."
    expect(toUserMessage(new TypeError('Failed to fetch'))).toBe(msg)
    expect(toUserMessage(new TypeError('Network request failed'))).toBe(msg)
  })
  it('maps function error payloads and Supabase auth errors', () => {
    expect(toUserMessage({ error: { code: 'RATE_LIMITED' } })).toMatch(/wait a few minutes/)
    expect(toUserMessage({ name: 'AuthApiError', code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe('Incorrect email or password.')
    expect(toUserMessage({ code: 'email_not_confirmed' })).toMatch(/confirm your email/)
  })
  it('falls back to a generic message', () => {
    expect(toUserMessage(new Error('boom'))).toBe('Something went wrong. Please try again.')
    expect(toUserMessage(undefined)).toBe('Something went wrong. Please try again.')
  })
  it('identifies app errors and their HTTP status', () => {
    expect(isAppError(new AppError('RATE_LIMITED'))).toBe(true)
    expect(new AppError('RATE_LIMITED').status).toBe(429)
    expect(isAppError(new Error('x'))).toBe(false)
  })
})
