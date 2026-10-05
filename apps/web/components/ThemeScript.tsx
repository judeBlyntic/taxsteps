'use client'
import { THEME_SCRIPT } from '@/lib/theme'

// Runs during HTML parsing on full page loads. On the client it renders as inert text/plain so React doesn't warn
// about script tags; suppressHydrationWarning accepts the type difference (Next's "preventing flash" guide).
export function ThemeScript() {
  return (
    <script type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'} suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
  )
}
