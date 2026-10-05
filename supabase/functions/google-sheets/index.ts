import { AppError } from '../_shared/core.ts'
import { adminClient, requireUser } from '../_shared/auth.ts'
import { fetchExportDocs } from '../_shared/fetch-docs.ts'
import { enforceRateLimit } from '../_shared/ratelimit.ts'
import { handleSheets, type ConnectionRow, type ConnectionStore } from './handler.ts'

const COLUMNS = 'google_email, refresh_token_enc, default_spreadsheet_id, default_sheet_name'

function connections(userId: string): ConnectionStore {
  const db = () => adminClient().from('google_connections')
  return {
    get: async () => ((await db().select(COLUMNS).eq('user_id', userId).maybeSingle()).data as ConnectionRow | null),
    upsert: async (row) => { if ((await db().upsert({ user_id: userId, ...row })).error) throw new AppError('INTERNAL') },
    update: async (patch) => { if ((await db().update(patch).eq('user_id', userId)).error) throw new AppError('INTERNAL') },
    remove: async () => { if ((await db().delete().eq('user_id', userId)).error) throw new AppError('INTERNAL') },
  }
}

Deno.serve((req) =>
  handleSheets(req, {
    requireUser,
    enforceRateLimit: (userId) => enforceRateLimit(adminClient(), userId, 'sheets'),
    connections,
    fetch,
    fetchExportDocs,
    getProfile: async (ctx) => {
      const { data } = await ctx.client.from('profiles').select('timezone, locale').eq('id', ctx.userId).maybeSingle()
      return (data as { timezone: string; locale: string } | null) ?? { timezone: 'Pacific/Auckland', locale: 'en-US' }
    },
    env: {
      clientId: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
      clientSecret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
      redirectUri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-sheets/callback`,
      tokenKey: Deno.env.get('TOKEN_ENCRYPTION_KEY') ?? '',
      stateSecret: Deno.env.get('OAUTH_STATE_SECRET') ?? '',
      webUrl: Deno.env.get('APP_WEB_URL') ?? 'http://localhost:3000',
      mobileScheme: Deno.env.get('APP_MOBILE_SCHEME') ?? 'taxsteps',
    },
  })
)
