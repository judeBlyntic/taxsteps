# Tax Steps

Tax Steps helps you organise and prepare your expense records for tax time.

**Scan → Extract → Review → Save → Sync → Dashboard → Report → Export** — on the web, iOS and Android, with one Supabase backend.

- Receipt photos are **never stored**. They exist only in memory for the extraction request, are sent to the AI provider with storage disabled, and every temporary file on the phone is deleted straight after.
- AI output is never saved directly — the user reviews and edits every field, then presses **Save**.
- Every table is protected by Row Level Security; realtime updates use a private per-user channel.
- Works worldwide: per-user country, currency, timezone, tax label (GST / VAT / Sales tax…) and financial-year start.
- Users decide whether an expense is deductible; Tax Steps doesn't give tax advice.

## Architecture

```
apps/web        Next.js 16 (App Router)            — dashboard, documents, scan/upload, reports, export, settings
apps/mobile     Expo SDK 57 (Expo Router)          — iOS + Android: camera scan, review, offline queue, share exports
packages/core   Shared TypeScript (also used by Deno functions) — schemas, field registry, regions, dates, money,
                filters, CSV, draft/review logic, error copy
packages/data   supabase-js API + TanStack Query hooks + realtime (used by both apps)
supabase/
  migrations/   schema, RLS, summary + rate-limit functions, private realtime broadcasts
  functions/    extract-document (OpenAI vision) · export-documents (CSV/XLSX/PDF) · google-sheets · delete-account
  tests/        database integration tests (RLS isolation, CRUD, summary, rate limits, cascade, realtime sync)
```

Clients only hold the Supabase URL and publishable key. The OpenAI key, Google OAuth secret, token-encryption key and
service-role key exist only as Edge Function secrets.

## Setup

Requirements: Node 24+, Deno 2.9+ (function tests), a Supabase project (this repo targets `fqqxiousojmmlqxozxza`).

```bash
npm install
```

1. **Environment files** — copy the blocks from `.env.example` into `apps/web/.env.local`, `apps/mobile/.env`,
   `supabase/functions/.env` and `.env.test`. Generate `TOKEN_ENCRYPTION_KEY` / `OAUTH_STATE_SECRET` with
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
2. **Supabase CLI** (one-time): `npx supabase login`, then `npx supabase link --project-ref fqqxiousojmmlqxozxza`.
3. **Database**: migrations in `supabase/migrations` (already applied to the linked project; `npx supabase db push` for a new one).
4. **Auth settings**: `npx supabase config push` (site URL, redirect allow-list, email confirmation).
5. **Secrets**: `npx supabase secrets set --env-file supabase/functions/.env`
6. **Functions**: `npx supabase functions deploy extract-document export-documents google-sheets delete-account --use-api`

### Google Sheets (optional)
Create a Google Cloud project → enable **Google Sheets API** and **Google Drive API** → OAuth consent screen →
OAuth client of type *Web application* with redirect URI
`https://fqqxiousojmmlqxozxza.supabase.co/functions/v1/google-sheets/callback`. Put the client ID/secret in
`supabase/functions/.env` and push secrets. Tax Steps requests only `drive.file` (files it creates).

## Running

```bash
npm run dev -w @taxsteps/web          # http://localhost:3000
npm run start -w @taxsteps/mobile     # Expo — scan the QR code with Expo Go on your phone
npm run web -w @taxsteps/mobile       # mobile UI in a browser (http://localhost:8081)
```

Store builds use EAS (`npx eas-cli@latest build --platform ios|android`) and need Apple / Google developer accounts.

## Tests

```bash
npm run test:core                      # shared logic (Vitest)
npm run test:functions                 # Edge Functions: typecheck + Deno tests (OpenAI/Google mocked)
npm run test:db                        # live database: RLS isolation, CRUD, summary, rate limits, cascade, realtime sync
npm run test -w @taxsteps/web          # web unit tests
npm run test -w @taxsteps/mobile       # mobile unit tests (offline queue, secure storage)
npm run test:e2e -w @taxsteps/web      # Playwright journey (needs deployed functions + .env.test)
node scripts/make-fixtures.mjs         # synthetic receipt/invoice fixtures
node scripts/smoke-extract.mjs         # live extraction smoke test against OpenAI
```

## Owner checklist

- [ ] OpenAI API key in `supabase/functions/.env` → `npx supabase secrets set …`
- [ ] Custom SMTP in Supabase Auth (the default sender only emails project members and is rate-limited)
- [ ] Production web domain added to `supabase/config.toml` redirect URLs, `APP_WEB_URL`, `APP_ALLOWED_ORIGINS`
- [ ] Google Cloud OAuth client for Sheets (optional)
- [ ] App icons / splash artwork in `apps/mobile/assets` (currently Expo defaults)
- [ ] Apple Developer + Google Play accounts and `eas build` / `eas submit`
