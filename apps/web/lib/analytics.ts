// Vercel Web Analytics only ever sees the page path: query strings and fragments carry search text,
// filters, selected record ids and sign-in codes. See PRIVACY in @taxsteps/core.
export const scrubAnalyticsUrl = (url: string): string => url.split(/[?#]/)[0]!
