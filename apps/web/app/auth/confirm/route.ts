import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

// Only these destinations are allowed after an email link — never an arbitrary URL (open redirect).
const ALLOWED_NEXT = new Set(['/', '/reset-password'])

/**
 * Landing point for email links (signup confirmation, password reset) and Google sign-in. Uses the PKCE `code`
 * flow only: the code can be exchanged solely in the browser that started the flow, so a link
 * crafted by someone else can't sign this browser into their account (login CSRF).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const nextParam = searchParams.get('next') ?? '/'
  const next = ALLOWED_NEXT.has(nextParam) ? nextParam : '/'
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, origin))
  }

  // Google sign-in that was cancelled or failed (Supabase sends ?error=… instead of a code).
  if (searchParams.get('via') === 'google') return NextResponse.redirect(new URL('/sign-in?error=google', origin))

  // Supabase verifies the email before redirecting here; if this browser can't complete the
  // sign-in (e.g. link opened on another device), ask the user to sign in instead.
  if (next === '/reset-password') return NextResponse.redirect(new URL('/sign-in?error=link', origin))
  return NextResponse.redirect(new URL('/auth/confirmed', origin))
}
