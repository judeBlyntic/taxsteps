// POST { confirm: "DELETE" } → deletes the caller's auth user; FK cascades remove all their data.
import { z } from 'zod'
import { AppError } from '../_shared/core.ts'
import type { UserContext } from '../_shared/auth.ts'
import { errorResponse, json, preflight, readJson, requirePost } from '../_shared/http.ts'

export type DeleteDeps = {
  requireUser: (req: Request) => Promise<UserContext>
  revokeGoogle: (userId: string) => Promise<void>
  deleteUser: (userId: string) => Promise<{ error: unknown }>
}

const BodySchema = z.object({ confirm: z.literal('DELETE') })

export async function handleDeleteAccount(req: Request, deps: DeleteDeps): Promise<Response> {
  const origin = req.headers.get('origin')
  const pre = preflight(req)
  if (pre) return pre
  try {
    requirePost(req)
    const user = await deps.requireUser(req)
    BodySchema.parse(await readJson(req, 1024))
    try {
      await deps.revokeGoogle(user.userId) // best effort: never blocks deletion
    } catch {
      console.error(JSON.stringify({ fn: 'delete-account', code: 'GOOGLE_REVOKE_FAILED' }))
    }
    const { error } = await deps.deleteUser(user.userId)
    if (error) throw new AppError('DELETE_FAILED')
    return json({ ok: true }, { origin })
  } catch (e) {
    return errorResponse(e, origin, 'delete-account')
  }
}
