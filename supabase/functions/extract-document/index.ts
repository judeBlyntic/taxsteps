import { adminClient, profileTimeZone, requireUser } from '../_shared/auth.ts'
import { enforceRateLimit } from '../_shared/ratelimit.ts'
import { DocumentExtractionService, createProvider } from '../_shared/extraction/service.ts'
import { handleExtract } from './handler.ts'

Deno.serve((req) =>
  handleExtract(req, {
    requireUser,
    enforceRateLimit: (userId) => enforceRateLimit(adminClient(), userId, 'extract'),
    getTimeZone: profileTimeZone,
    service: { extract: (file, hints, tz) => new DocumentExtractionService(createProvider()).extract(file, hints, tz) },
  })
)
