// Error codes shared by clients and Edge Functions, with the user-facing copy (spec §13).

export type ErrorCode =
  | 'UNREADABLE' | 'NOT_A_DOCUMENT' | 'NETWORK' | 'SAVE_FAILED' | 'RATE_LIMITED'
  | 'FILE_TOO_LARGE' | 'UNSUPPORTED_FILE' | 'EXPORT_FAILED' | 'SHEETS_NOT_CONNECTED' | 'SHEETS_AUTH_EXPIRED'
  | 'UNAUTHORIZED' | 'VALIDATION' | 'INTERNAL' | 'DELETE_FAILED'
  | 'INVALID_CREDENTIALS' | 'EMAIL_NOT_CONFIRMED' | 'WEAK_PASSWORD'

const UNREADABLE_COPY = "We couldn't read this receipt clearly. Please try again or enter the information manually."

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  UNREADABLE: UNREADABLE_COPY,
  NOT_A_DOCUMENT: UNREADABLE_COPY,
  NETWORK: "We couldn't connect to Tax Steps. Please check your internet connection and try again.",
  SAVE_FAILED: "Your expense wasn't saved. Please try again.",
  RATE_LIMITED: "You've scanned a lot in a short time. Please wait a few minutes and try again.",
  FILE_TOO_LARGE: 'That file is too large. Please use a photo or PDF under 10 MB.',
  UNSUPPORTED_FILE: "That file type isn't supported. Please use a JPG, PNG, WebP or PDF.",
  EXPORT_FAILED: "We couldn't create your export. Please try again.",
  SHEETS_NOT_CONNECTED: 'Connect Google Sheets in Settings first.',
  SHEETS_AUTH_EXPIRED: 'Your Google connection has expired. Please reconnect Google Sheets in Settings.',
  UNAUTHORIZED: 'Your session has expired. Please sign in again.',
  VALIDATION: "Some details aren't valid. Please check and try again.",
  INTERNAL: 'Something went wrong. Please try again.',
  DELETE_FAILED: "We couldn't delete that. Please try again.",
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  EMAIL_NOT_CONFIRMED: 'Please confirm your email address — check your inbox for the link.',
  WEAK_PASSWORD: 'Please choose a stronger password (at least 8 characters).',
}

const STATUS: Partial<Record<ErrorCode, number>> = {
  UNAUTHORIZED: 401, VALIDATION: 400, RATE_LIMITED: 429, FILE_TOO_LARGE: 413, UNSUPPORTED_FILE: 415,
  NOT_A_DOCUMENT: 422, UNREADABLE: 422, SHEETS_NOT_CONNECTED: 409, SHEETS_AUTH_EXPIRED: 409,
  INVALID_CREDENTIALS: 400, EMAIL_NOT_CONFIRMED: 400, WEAK_PASSWORD: 400,
}

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number

  constructor(code: ErrorCode, message?: string, status?: number) {
    super(message ?? ERROR_MESSAGES[code])
    this.name = 'AppError'
    this.code = code
    this.status = status ?? STATUS[code] ?? 500
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError
}

const AUTH_CODES: Record<string, ErrorCode> = {
  invalid_credentials: 'INVALID_CREDENTIALS',
  email_not_confirmed: 'EMAIL_NOT_CONFIRMED',
  weak_password: 'WEAK_PASSWORD',
  over_request_rate_limit: 'RATE_LIMITED',
  over_email_send_rate_limit: 'RATE_LIMITED',
}

const isCode = (c: unknown): c is ErrorCode => typeof c === 'string' && c in ERROR_MESSAGES

/** Maps anything thrown (AppError, function error JSON, Supabase auth error, fetch failure) to user copy. */
export function toUserMessage(e: unknown): string {
  if (isAppError(e)) return e.message
  if (e instanceof TypeError && /fetch|network request failed/i.test(e.message)) return ERROR_MESSAGES.NETWORK
  if (e && typeof e === 'object') {
    const o = e as { error?: { code?: unknown }; code?: unknown; message?: unknown }
    if (isCode(o.error?.code)) return ERROR_MESSAGES[o.error.code]
    if (typeof o.code === 'string') {
      const mapped = AUTH_CODES[o.code]
      if (mapped) return ERROR_MESSAGES[mapped]
      if (isCode(o.code)) return ERROR_MESSAGES[o.code]
    }
    if (o.message === 'Invalid login credentials') return ERROR_MESSAGES.INVALID_CREDENTIALS
  }
  return ERROR_MESSAGES.INTERNAL
}
