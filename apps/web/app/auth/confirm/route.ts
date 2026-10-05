import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/** Landing point for email links (signup confirmation, password reset). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const nextParam = searchParams.get('next') ?? '/'
  // Only same-site relative paths — never an open redirect.
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/'
  const supabase = await createServerSupabase()

  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, origin))
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL(next, origin))
  }

  // The email is already verified by Supabase before redirecting here; if this browser can't
  // complete the sign-in (link opened on another device), just ask the user to sign in.
  if (next === '/reset-password') return NextResponse.redirect(new URL('/sign-in?error=link', origin))
  return NextResponse.redirect(new URL('/auth/confirmed', origin))
}
