import { adminClient, requireUser } from '../_shared/auth.ts'
import { handleDeleteAccount } from './handler.ts'

Deno.serve((req) =>
  handleDeleteAccount(req, {
    requireUser,
    // Replaced with a real token revoke when Google Sheets is wired up (Task 21).
    revokeGoogle: () => Promise.resolve(),
    deleteUser: (userId) => adminClient().auth.admin.deleteUser(userId),
  })
)
