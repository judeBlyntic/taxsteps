import { adminClient, requireUser } from '../_shared/auth.ts'
import { decryptToken } from '../_shared/crypto.ts'
import { handleDeleteAccount } from './handler.ts'

/** Revokes the user's Google token (if connected) so Tax Steps loses Sheets access too. */
async function revokeGoogle(userId: string): Promise<void> {
  const { data } = await adminClient().from('google_connections').select('refresh_token_enc').eq('user_id', userId).maybeSingle()
  const enc = (data as { refresh_token_enc?: string } | null)?.refresh_token_enc
  if (!enc) return
  const token = await decryptToken(enc, Deno.env.get('TOKEN_ENCRYPTION_KEY') ?? '')
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' })
}

Deno.serve((req) =>
  handleDeleteAccount(req, {
    requireUser,
    revokeGoogle,
    deleteUser: (userId) => adminClient().auth.admin.deleteUser(userId),
  })
)
