import { adminClient, requireUser } from '../_shared/auth.ts'
import { fetchExportDocs } from '../_shared/fetch-docs.ts'
import { enforceRateLimit } from '../_shared/ratelimit.ts'
import { handleExport } from './handler.ts'

let fontCache: Promise<{ regular: Uint8Array; bold: Uint8Array }> | null = null
const fonts = () =>
  (fontCache ??= Promise.all([
    Deno.readFile(new URL('./fonts/NotoSans-Regular.ttf', import.meta.url)),
    Deno.readFile(new URL('./fonts/NotoSans-Bold.ttf', import.meta.url)),
  ]).then(([regular, bold]) => ({ regular, bold })))

Deno.serve((req) =>
  handleExport(req, {
    requireUser,
    enforceRateLimit: (userId) => enforceRateLimit(adminClient(), userId, 'export'),
    fetchExportDocs,
    getProfile: async (ctx) => {
      const { data } = await ctx.client.from('profiles').select('business_name, timezone, locale').eq('id', ctx.userId).maybeSingle()
      return (data as { business_name: string | null; timezone: string; locale: string } | null)
        ?? { business_name: null, timezone: 'Pacific/Auckland', locale: 'en-US' }
    },
    fonts,
  })
)
