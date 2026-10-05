# Tax Steps — Design Spec

Date: 2026-10-05 · Status: approved in brainstorming, pending written review

## 1. Purpose

Tax Steps helps people organise receipts and invoices and prepare their expense records for tax time.
Core loop, on Web, iOS and Android against one backend:

**Scan → Extract (AI) → Review/Edit → Save → Sync → Dashboard → Search/Filter → Report → Export**

The app never claims to guarantee deductions or savings. Copy uses: "Tax Steps helps you organise and prepare your expense records for tax time." Users are told they are responsible for deductibility and should consult a qualified tax professional.

### Success criteria
- A user photographs a receipt on a phone, reviews and saves it, and it appears on the web dashboard without a refresh (and vice versa).
- Receipt images are never persisted anywhere (DB, Storage, disk, logs). Only structured data is stored.
- No row is written by AI extraction; only the user's explicit Save writes.
- One user can never read or change another user's records (verified by tests).
- CSV, XLSX, PDF and Google Sheets exports work for any filter (date range, month, year, financial year, categories, selected records).
- Works worldwide: per-user currency, timezone, tax label and financial-year start.

### Decisions made in brainstorming
| Topic | Decision |
|---|---|
| Architecture | Next.js web + Expo mobile + shared `packages/core`; heavy logic in Supabase Edge Functions |
| Backend | New Supabase project "TaxSteps" (org AirsafeFinalPhase, $0/mo). KiwiTracker untouched |
| AI | OpenAI vision behind `DocumentExtractionService` / provider interface |
| Design | Claude Design mockups in `TaxSteps/` (Organic design system), rebranded TrackerRabbit → Tax Steps |
| Market | Worldwide. Region presets drive tax label, rates, FY start, currency. No NZ hard-coding |
| Dropped from mockups | Subscription/free-trial/billing screens, notification bell, "Tax deductible" toggle, Google/Apple sign-in buttons |
| Kept from mockups | Business/Personal type, "Receipt days" calendar, month-over-month delta, privacy panel |
| UI language | English only for MVP (no i18n framework yet) |

## 2. Scope

**In:** email/password auth (sign up, sign in, sign out, reset password), profile + region settings, delete account, scan/upload → extract → review → save, manual entry, edit/delete records, dashboard, documents list with search/filter/pagination, monthly/yearly/FY/custom reports, CSV/XLSX/PDF export, Google Sheets export, realtime sync, mobile offline queue for structured data, categories management, rate limiting, tests.

**Out (structure allows later):** billing/subscriptions, social sign-in, multi-language UI, FX conversion between currencies, Google Picker for arbitrary existing spreadsheets, automatic Sheets sync on every save, line-item extraction, team/accountant sharing, app-store submission (EAS config is provided; submission needs the owner's Apple/Google developer accounts).

## 3. Architecture

```
Taxsteps/
  TaxSteps/               Claude Design export (reference only, untouched)
  apps/
    web/                  Next.js (App Router) — uses Organic styles.css directly
    mobile/               Expo (Expo Router) — iOS + Android
  packages/
    core/                 Shared TypeScript: types, zod schemas, field & category & doc-type
                          registries, tax regions, money/date/tz/FY utils, filters, report shaping
  supabase/
    migrations/           Schema, RLS, triggers, RPCs
    functions/
      _shared/            auth, cors, errors, rate limit, crypto, extraction service + providers
      extract-document/   Image/PDF → validated fields (never stores the file)
      export-documents/   CSV / XLSX / PDF
      google-sheets/      OAuth start/callback, list/create spreadsheet & worksheet, append rows
      delete-account/     Deletes auth user (cascades all data), revokes Google token
    tests/                RLS / isolation / CRUD / realtime integration tests
  docs/
```

npm workspaces, no extra build orchestrator. `packages/core` is plain TS consumed from source by both apps. Edge Functions (Deno) cannot resolve workspace packages, so the pieces they share with clients (zod schemas, extraction field registry, region presets, dates, CSV/format helpers) are written Deno-compatible (explicit `.ts` import specifiers, `zod` mapped via each function's `deno.json` import map) and imported by relative path from `supabase/functions/_shared/`. If the deploy bundler refuses files outside `supabase/functions/`, fallback: `npm run sync:core` copies those modules into `supabase/functions/_shared/core/` (generated, git-ignored from edits) and a test asserts the copies match the source.

Layers (per the brief): UI (apps/*/components, screens) · business logic (core) · data (apps/*/lib/data → supabase-js, RPCs) · AI (functions/_shared/extraction) · export (functions/export-documents, google-sheets) · auth (Supabase Auth + per-app session handling).

## 4. Data model

All tables in `public`, RLS enabled, `user_id uuid not null references auth.users(id) on delete cascade`.

**profiles** — `id` (PK = auth uid), `full_name`, `business_name`, `tax_number` (GST/VAT/EIN — label from region), `country` (ISO 3166-1 alpha-2), `currency` (ISO 4217, default from region), `timezone` (IANA; set from device at signup; fallback `Pacific/Auckland`), `locale` (BCP 47, e.g. `en-NZ`), `fy_start_month` (1–12), `fy_start_day` (1–31), `created_at`, `updated_at`. Created by trigger on `auth.users` insert, using signup metadata.

**document_types** — `code` PK (`receipt`, `invoice`, `bill`, `expense`), `label`, `sort`. Read-only to clients. New type = one insert.

**categories** — `id`, `user_id`, `name` (unique per user, case-insensitive), `icon` (Lucide name), `color` (design token key), `sort`, `archived`, timestamps. Seeded per user on signup with: Advertising, Vehicle, Fuel, Travel, Office, Equipment, Software, Phone, Internet, Professional Services, Insurance, Rent, Meals, Other. Users can add, rename, recolour, archive.

**documents** —
| column | type | notes |
|---|---|---|
| id | uuid PK | client may supply (idempotent offline sync) |
| user_id | uuid | default `auth.uid()` |
| document_type | text FK → document_types | default `receipt` |
| merchant_name | text not null | 1–200 chars |
| title | text | ≤200 |
| description | text | ≤2000 |
| category_id | uuid FK → categories, on delete set null | must belong to same user (trigger check) |
| expense_type | text | `business` \| `personal`, default `business` |
| amount | numeric(14,2) not null | total incl. tax, ≥ 0 |
| tax_amount | numeric(14,2) | ≥ 0 and ≤ amount |
| tax_label | text | e.g. GST, VAT, Sales tax |
| currency | char(3) not null | ISO 4217, default profile currency |
| transaction_date | date not null | calendar date printed on the document (no tz) ; 1900-01-01 … today+1y |
| invoice_number | text | ≤100 |
| payment_method | text | ≤60 |
| status | text | `complete` \| `needs_review` (see below) |
| source | text | `scan` \| `upload` \| `manual` |
| metadata | jsonb default '{}' | extra/custom fields (e.g. subtotal, extraction model & confidences) ≤ 16 KB |
| created_at / updated_at | timestamptz | `updated_at` via trigger |

`status` is derived in core (`deriveStatus`) at save: `needs_review` if tax_amount is null, category is null, or the tax-rate sanity check warned and the user did not change the figures; otherwise `complete`. Users can override.

Indexes: `(user_id, transaction_date desc, id)` for pagination; `(user_id, category_id)`; `pg_trgm` GIN on `merchant_name || ' ' || coalesce(title,'') || ' ' || coalesce(invoice_number,'')` for search.

**google_connections** — `user_id` PK, `google_email`, `refresh_token_enc` (AES-GCM, key in function secret), `default_spreadsheet_id`, `default_sheet_name`, timestamps. RLS on with **no client policies** — only Edge Functions (service role) touch it. Clients read connection status through a function.

**api_usage** — `id`, `user_id`, `kind` (`extract` \| `export` \| `sheets`), `created_at`. No client policies. Used by `consume_rate_limit(kind, max, window)` (security definer, uses `auth.uid()`, inserts+checks atomically). Rows older than 7 days are pruned inside that function.

**RPCs** (security invoker → RLS applies):
- `document_summary(p_from date, p_to date, p_filters jsonb)` → per currency: total, tax, count, average; by month; by category; by expense_type; by day (calendar).
- Filters for list views are applied with PostgREST query params built by core (`buildDocumentQuery`), not raw SQL.

Realtime: `documents` and `categories` added to `supabase_realtime` publication.

## 5. Security

- RLS on every table; policies `using ((select auth.uid()) = user_id)` and `with check` the same, for select/insert/update/delete as appropriate. `document_types` select-only for authenticated.
- Clients hold only the Supabase URL + publishable (anon) key. OpenAI key, Google client secret, token-encryption key, service-role key exist only as Edge Function secrets.
- Every Edge Function verifies the caller's JWT (`verify_jwt` + `auth.getUser()`), except the Google OAuth callback which instead verifies a signed, expiring `state` (HMAC, 10 min) carrying user id + nonce + return target.
- Input validation twice: zod in core (clients and functions share schemas) and DB constraints. AI output is treated as untrusted input and validated/normalised the same way.
- Queries go through supabase-js/PostgREST (parameterised); no string-built SQL in functions.
- Rate limits: extract 30/hour & 300/day per user; export 60/hour; sheets 60/hour. Auth rate limits from Supabase defaults.
- CORS: functions allow the configured web origin(s) only (mobile native calls have no origin).
- CSV/XLSX/Sheets formula-injection guard: cells beginning with `= + - @` (tab/CR too) are prefixed with `'`.
- No logging of request bodies or extracted values; errors log codes only.

## 6. Extraction (privacy-critical)

Flow:
1. **Capture** — mobile: `expo-camera` / image picker → `expo-image-manipulator` resize (longest side ≤ 2000 px, JPEG q 0.8) → base64 in memory → temp files deleted immediately (`FileSystem.deleteAsync`, idempotent). Web: file input/drag-drop/`capture="environment"` on mobile browsers → canvas resize → base64 in memory; PDFs (≤ 10 MB, invoices) passed as-is.
2. **Call** `POST /functions/v1/extract-document` with `{ file: base64, mimeType, hints: { categories: string[], country, currency } }`. Body limit 12 MB; accepted MIME: image/jpeg, image/png, image/webp, application/pdf.
3. **Function**: auth → rate limit → validate → `DocumentExtractionService.extract(file, hints)`:
   - provider chosen by `AI_PROVIDER` (`openai` now); `OpenAIProvider` calls the Responses API with the image/PDF as a data URL, a strict JSON schema, `store: false`, model from `AI_MODEL`.
   - parse → zod `ExtractionResultSchema` → normalise (trim, ISO date, 2-dp numbers, ISO currency upper-case, category matched case-insensitively against the user's names else `null`).
   - checks → `warnings[]`: total missing; tax > total; tax rate implied by tax/(total−tax) not within ±1.5 pp of any region rate (only if region known); date in the future; `is_document=false` → error `NOT_A_DOCUMENT`; nothing usable → `UNREADABLE`.
   - returns `{ fields, confidence: Record<field, 0..1>, warnings, model }`. The file buffer is dropped when the request ends; never written anywhere.
4. **Review** — form generated from core `EXTRACTION_FIELDS` registry (key, label, input kind, required, column vs metadata). Fields with confidence < 0.75 or a warning are highlighted "Review". Every field editable. Adding a field later = one registry entry (+ optional column; otherwise stored in `metadata`).
5. **Save** — explicit button. Validated with `DocumentInputSchema`, status derived, inserted with client UUID.

Privacy copy shown at capture: "Your photo is used only to extract the information. It is not stored after processing." Privacy settings panel also notes the AI provider processes the image transiently (OpenAI `store:false`; provider may retain API inputs up to 30 days for abuse monitoring per its policy).

Extracted fields (initial): document_type, merchant_name, title, description, category, amount (total), tax_amount, tax_label, currency, transaction_date, invoice_number, payment_method, subtotal (metadata).

## 7. Clients

Visual language: Organic design system (cream `#f5ead8` ground, terracotta accent, sage accent-2, Caprasimo headings, Figtree body, Lucide icons at stroke 2.75, pill buttons, big radii). Web links `styles.css` as-is (copied into `apps/web`); mobile ports the tokens into a typed `theme.ts`. Brand: "Tax Steps" with a receipt/steps mark.

**Web** (responsive: sidebar ≥ 1024 px; top bar + bottom tab bar with central Scan below that):
- Auth: Sign in, Sign up (country → prefills currency/FY; timezone auto), Forgot password, Reset password (also the target for mobile reset emails).
- Dashboard: month hero total (+ change vs previous month) with Scan/Upload CTA; tax card; documents card; Business vs Personal; expenses by month (6 bars); by category; recent documents (date, merchant, title, category, total, tax, status); receipt-days calendar. Multi-currency: primary currency shown, other currencies listed beneath.
- Documents: search, filter panel (date range, month, year, FY, merchant, category, min/max amount, min/max tax, document type, expense type, status), table with keyset pagination (50/page), row select → export selection; row opens review drawer (edit/delete).
- Scan: upload modal (drag-drop/browse/camera on phones) → processing steps (Uploading securely · Extracting details · Discarding your photo) → review drawer → Save. "Add manually" opens empty drawer.
- Reports: period (Month · Year · Financial year · Custom), category & type filters → summary cards, category table, monthly breakdown; quick export tiles.
- Export: format (CSV, Excel, PDF, Google Sheets), range presets (this month, last month, this FY, last FY, calendar year, custom, selected records), categories → download / send to Sheets.
- Settings: profile & business, region (country, currency, timezone, FY start, tax label preview), categories manager, Google Sheets connection, privacy (export all data, delete all documents, delete account), sign out.

**Mobile** (Expo Router): onboarding (3 slides, rebranded) → auth → tabs **Home · Documents · [Scan] · Reports · Settings** with raised central Scan. Scan = full-screen camera with frame guides, flash, gallery, manual → processing sheet → Review screen → Save → Home. Document tap → Review in edit mode (Save / Delete). Reports includes export tiles (file → share sheet; Sheets → pick target). Settings mirrors web. Offline banner + "Pending sync" chips for queued saves.

Data layer in both apps: TanStack Query for caching; realtime events invalidate `documents` and `summary` queries. Non-sensitive UI prefs (last filter, onboarding seen) cached locally; financial data not persisted on web; on mobile only the offline save queue is persisted.

## 8. Search, filters, dates, regions

- `core/filters.ts`: `DocumentFilter` type → `buildDocumentQuery(builder, filter)` for PostgREST and → `p_filters` json for RPCs. Search = trigram `ilike` across merchant/title/invoice number.
- `core/dates.ts`: `todayIn(tz)`, `monthRange(y, m)`, `yearRange(y)`, `financialYearRange(date, fyStartMonth, fyStartDay)`, `fyLabel()` ("FY 2026–27" or "FY 2026" when Jan start). All ranges are inclusive calendar dates; "today/this month" computed in the profile timezone. Timestamps stored UTC, displayed with `Intl.DateTimeFormat(locale, { timeZone })`.
- `core/regions.ts`: `TAX_REGIONS` presets keyed by country — NZ (GST 15%, 1 Apr, NZD), AU (GST 10%, 1 Jul, AUD), GB (VAT 20/5/0%, 6 Apr, GBP), IE, US (Sales tax, no rate check, 1 Jan, USD), CA (GST/HST 5/13/15%, 1 Jan, CAD), IN (GST 5/12/18/28%, 1 Apr, INR), SG (GST 9%), ZA (VAT 15%, 1 Mar), DE/FR/ES/IT/NL (VAT standard+reduced, 1 Jan, EUR), AE (VAT 5%), JP (consumption tax 10/8%, 1 Jan). Fallback: label "Tax", no rate check, FY 1 Jan, currency from `Intl` locale or USD.
- `core/money.ts`: `formatMoney(amount, currency, locale)` via `Intl.NumberFormat`; amounts handled as cents integers in calculations to avoid float drift.
- Totals are always grouped by currency (no FX).

## 9. Sync and offline

- Single source of truth: Supabase. Each client subscribes to `postgres_changes` on `documents` filtered by `user_id=eq.<uid>` (RLS also applies) and on `categories`; on event → invalidate queries. On reconnect/focus → refetch.
- Mobile offline: Save while offline (NetInfo) puts the validated structured payload (with its client UUID; **never the image**) into an AsyncStorage queue; flushed in order on reconnect via `upsert` on `id` (idempotent). Failed items stay queued with an error badge; user can retry or discard. Extraction itself requires connectivity (message shown; user can enter manually offline).
- Conflict policy: last write wins on `updated_at` (single-user data; acceptable for MVP).

## 10. Exports

`POST /functions/v1/export-documents` `{ format: 'csv'|'xlsx'|'pdf', filter: DocumentFilter | { ids: uuid[] } }` → queries with the caller's JWT (RLS-enforced; max 10 000 rows) → returns the file with `Content-Disposition`.

Columns: Date, Merchant, Title, Category, Description, Type (business/personal), Document type, Total, Tax, Tax label, Currency, Invoice number, Payment method, Status, Created, Updated (created/updated in user tz).
- CSV: RFC 4180, UTF-8 BOM (Excel-friendly), formula guard.
- XLSX (SheetJS): sheets *Documents*, *By category*, *Summary* (per currency); numeric cells typed; dates as real dates.
- PDF (pdf-lib): header (business name, period, generated-at in user tz), summary per currency, category table, document table (paginated), footer disclaimer ("Tax Steps helps you organise … consult a qualified tax professional").
- Web downloads the blob; mobile writes to cache dir → `expo-sharing` → deletes the file after the share sheet closes.

## 11. Google Sheets

- OAuth 2.0 web-server flow run by `google-sheets` function. Scopes: `openid email https://www.googleapis.com/auth/drive.file` (least privilege: only files Tax Steps creates). Consent `access_type=offline`, `prompt=consent`.
- Actions (`POST` with `action`): `status`, `start` (returns Google URL; `state` signed), `callback` (GET from Google; exchanges code, encrypts and stores refresh token, redirects to `APP_WEB_URL/settings?sheets=connected` or the mobile deep link), `list-spreadsheets` (Drive files created by the app, mimeType spreadsheet), `create-spreadsheet`, `list-worksheets`, `create-worksheet`, `export` (filter or ids → header row if sheet empty, then append rows, formula-guarded, `valueInputOption=USER_ENTERED` only for typed numbers/dates), `disconnect` (revoke + delete row).
- Web: redirect flow. Mobile: `expo-web-browser.openAuthSessionAsync` with the app's deep link as return target.
- Requires the owner to create a Google Cloud project, enable Sheets + Drive APIs, configure the OAuth consent screen and a Web client with redirect URI `https://<project>.supabase.co/functions/v1/google-sheets/callback`.

## 12. Account and data lifecycle

- Sign up / sign in / sign out / reset password via Supabase Auth (email confirmation on). Reset link → web `/reset-password`.
- Update profile/region in Settings.
- Delete one record (drawer/review), delete all documents (Settings → confirm by typing DELETE), delete account (`delete-account` function: revoke Google token best-effort → `auth.admin.deleteUser` → FK cascades remove profiles, categories, documents, google_connections, api_usage). Client signs out and clears local queue/cache.
- Export all data = Export with "all time".

## 13. Error handling

User-facing messages (core `errors.ts` maps codes → copy; never silent):
- `UNREADABLE` / `NOT_A_DOCUMENT`: "We couldn't read this receipt clearly. Please try again or enter the information manually."
- Network: "We couldn't connect to Tax Steps. Please check your internet connection and try again."
- Save failed: "Your expense wasn't saved. Please try again." (draft kept in form)
- `RATE_LIMITED`: "You've scanned a lot in a short time. Please wait a few minutes and try again."
- `FILE_TOO_LARGE` / `UNSUPPORTED_FILE`, `EXPORT_FAILED`, `SHEETS_NOT_CONNECTED`, `SHEETS_AUTH_EXPIRED`, auth errors (invalid credentials, email not confirmed, weak password).
Functions return `{ error: { code, message } }` with proper HTTP status. Clients show toasts/inline errors; forms keep user input on failure.

## 14. Testing and verification

- **core (Vitest):** schemas, `deriveStatus`, tax-rate check, FY/month/year ranges across timezones and FY starts (incl. 6 Apr), money formatting, filter builder, CSV escaping/formula guard, region presets.
- **functions (Deno test, fetch mocked):** extraction — receipt, invoice, invalid/not-a-document, missing fields, incorrect totals, malformed model JSON, oversized/unsupported file, rate limit; exports — CSV parses back, XLSX opens with SheetJS and has 3 sheets, PDF parses with pdf-lib and has pages; Sheets — OAuth state signing/expiry, token encryption round-trip, append payload shape, disconnect.
- **database (integration, Node + supabase-js):** two throwaway users; CRUD as owner; user B cannot select/update/delete A's documents/categories/profile or read google_connections/api_usage; category ownership trigger; constraints reject bad data; `document_summary` only aggregates own rows; account deletion cascades. Users are created and deleted by the test harness.
- **sync:** two authenticated clients; insert/update/delete via client A (as mobile) → client B (as web) receives realtime events, and the reverse.
- **web E2E:** browser run-through of sign-up → upload sample receipt → review → save → dashboard/realtime → filter → reports → each export; console and network checked for errors.
- **mobile:** Expo web preview for flows on Windows; physical-device check via Expo Go (camera, share sheet, offline queue). iOS/Android store builds via EAS (owner accounts required).
- Sample receipts/invoices for tests are synthetic images generated in-repo (no real customer data).

## 15. Environment variables

`.env.example` at root documents all; real values never committed.
- Web (public): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Mobile (public): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_WEB_URL`.
- Edge Function secrets (server only): `AI_PROVIDER=openai`, `AI_API_KEY` (OpenAI key), `AI_MODEL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY` (32-byte base64), `OAUTH_STATE_SECRET`, `APP_WEB_URL`, `APP_ALLOWED_ORIGINS`, `APP_MOBILE_SCHEME=taxsteps`. `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase.
- Tests only (local, untracked `.env.test`): `SUPABASE_SERVICE_ROLE_KEY` for creating/deleting throwaway users.

## 16. Build order

1. Monorepo scaffold, `.env.example`, `packages/core` (types, schemas, registries, regions, dates, money, filters, errors) + tests.
2. Supabase project, migrations (schema, RLS, triggers, RPCs, realtime), DB integration + isolation tests.
3. Edge Functions: extract-document (OpenAI), export-documents, delete-account (+ tests).
4. Web app: auth, layout, dashboard, documents, scan/upload + review, reports, export, settings, realtime.
5. Mobile app: auth, tabs, camera scan + review, documents, reports/export/share, settings, realtime, offline queue.
6. Google Sheets function + web/mobile connect & export UI.
7. Sync tests, full web E2E in browser, mobile check via Expo web/Expo Go, fix, re-test.

## 17. Owner actions needed (cannot be done by Claude)

- OpenAI API key → set as `AI_API_KEY` secret (`supabase secrets set`).
- Google Cloud OAuth client (Sheets/Drive APIs, consent screen, redirect URI above).
- Expo Go on a phone for device testing; Apple Developer + Google Play accounts and EAS login for store builds.
- Web hosting account (e.g. Vercel) for a public deployment; Supabase Auth URL settings updated to the final domain.
