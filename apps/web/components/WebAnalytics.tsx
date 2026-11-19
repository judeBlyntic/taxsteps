'use client'
import { Analytics } from '@vercel/analytics/next'
import { scrubAnalyticsUrl } from '@/lib/analytics'

/** Cookieless visit counts (browser, OS, device, country) for the website and web app. */
export function WebAnalytics() {
  return <Analytics beforeSend={(event) => ({ ...event, url: scrubAnalyticsUrl(event.url) })} />
}
