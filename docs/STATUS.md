# Launch status

Short-lived file: update it when something changes. Stable rules live in `CLAUDE.md`, the plan in `docs/ROADMAP.md`.

_Last updated: 2026-10-02. Target release: 2026-11-01._

## Done on main

- Security and paper phases (Phase 0-2): tenant categories, Serbian PDFs, Belgrade day boundary, storage policies tightened.
- Settings logo persists after save.
- Purchase price rules: `costPrice` required on ProductForm, invoice cost snapshots.
- Optional sale price and Clerk-authenticated product image upload.
- PDV on invoices (#53): company setting "u sistemu PDV-a", per-line rate snapshot (0/10/20), osnovica + PDV per rate + total on form, detail and PDF, finance on osnovica. Migration `invoice_vat` applied in production.
- Onboarding (roadmap #2, #54): "Prvi koraci" checklist on Početna (podaci firme, prvi proizvod, prva faktura) derived from data, no new table; empty states on Asortiman, Katalozi and Fakture point to the next step (add products first). No demo data.
- Invoice and catalog sharing (roadmap #3, #55): revocable invoice link, WhatsApp/Viber/mail buttons. Migration `invoice_sharing` applied.
- Advanced catalog (#56): saved layout (grid 4/12 or list), category grouping, sort, visible fields, public-link search and category filter, "Cena na upit", PDF font with č/ć/đ (catalog and invoice). Migration `catalog_display_settings` applied 2026-10-02.
- Honest early-access landing copy, Serbian leftovers, after-sign-in redirect to `/dashboard`.
- Saved buyers (`Client`, ROADMAP #4): merged in #57, migration `20261002140000_clients.sql` applied in production.
- Analytics + errors (ROADMAP #8), both off until env vars are set in Vercel: `NEXT_PUBLIC_ANALYTICS=on` (Vercel Analytics script + milestone events signup/first_product/first_invoice/catalog_shared/invoice_shared, sent once per browser from the dashboard, no properties) and `NEXT_PUBLIC_SENTRY_DSN` (Sentry, scrubbed: no user, cookies, bodies, breadcrumbs, only first line of messages). Optional `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` upload source maps. Web Analytics must also be enabled in the Vercel project.
- Dashboard "Kasni naplata" card (ROADMAP #7): UNPAID invoices past due, oldest first, with total and days late (`src/lib/overdue-invoices.ts`). Low stock card already existed.
- IPS QR on the invoice PDF (ROADMAP #6): `src/lib/ips-qr.ts`; shown for unpaid invoices when the company giro account has valid control digits. Needs a real scan with a Serbian banking app before launch.
- Accountant export (ROADMAP #5): `GET /api/invoices/export?from&to&format=csv|xlsx`, no migration needed.

## Blocked on the owner

| Item | Why it blocks | Where it lands |
|---|---|---|
| Domain name (buy and point to Vercel) | Clerk Production, canonical URL, sitemap, email | Vercel domains, `NEXT_PUBLIC_APP_URL` |
| Clerk Production (`pk_live_`) | Needs the domain; Development keys cannot be used for real customers | Clerk dashboard, Vercel env |
| Real operator data (legal name, 9-digit PIB, address) | `src/lib/operator.ts` still has placeholder values; required for legal pages | `src/lib/operator.ts` |
| Billing decision (manual vs Stripe/other) | Landing says manual payment, first 60 days free, then 20 EUR/month (single source: `PRICING_OFFER` in `src/lib/landing-copy.ts`); no checkout exists | `src/lib/landing-copy.ts` |

No paid ads until the first three are done.

## Known gaps (from code review, 2026-10-01)

- PDV is on invoices (see Done). Still missing: PDV-aware CSV export (roadmap #5) and IPS QR amount (roadmap #6) must use `totalAmount` (payable) and `vatAmount`.
- No transactional email (invoice delivery, password-less onboarding mails).
- No product analytics or error monitoring.
- `README.md` and `SEO_DEVOPS_AUDIT.md` are partly outdated (January 2026); the 2026-09-23 launch-readiness doc predates the catalog-share and debug-ingest fixes.
- No team access: one Clerk user = one company (`Profile.clerkUserId` is unique). Do not advertise multi-user.
- Rate limiting is shared across instances only when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (or Vercel KV's `KV_REST_API_URL` + `KV_REST_API_TOKEN`) are set in Vercel; without them it is the in-memory per-instance speed bump. A store outage never blocks users (falls back to memory).
- `(profileId, sku)` is not unique: legacy daily-batch product rows remain (see `prisma/schema.prisma`). Needs a consolidation migration before a unique index.
- Manual billing (ROADMAP #9): first 60 days free, then 20 EUR per month, paid by invoice. `profiles.accessExpiresAt` (migration `20261002150000_profile_access_expiry.sql`, applied in production 2026-10-02): new companies get 60 days (`INITIAL_ACCESS_DAYS`), NULL = no limit (existing companies). A banner shows in the last 14 days and after expiry. **After expiry the account is read-only**: every write API route returns 402 `ACCESS_EXPIRED` (`accessExpiredResponse` in `src/lib/access-guard.ts`); reading, CSV/XLSX export, the company form, revoking share links and the public share links of issued catalogs/invoices keep working. Terms live in one place (`PRICING_OFFER` etc. in `src/lib/landing-copy.ts`). The owner extends access by hand after each paid month with: `UPDATE profiles SET "accessExpiresAt" = ((GREATEST(COALESCE("accessExpiresAt", now() AT TIME ZONE 'UTC'), now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Belgrade')::date + INTERVAL '1 month') AT TIME ZONE 'Europe/Belgrade' AT TIME ZONE 'UTC' WHERE id = '<profile id>';` (adds one Belgrade calendar month to the later of the current expiry and today). No checkout, no cancellation.
- PWA install (2026-10-02): the site is installable (Chromium reports no installability errors). Android's menu item "Dodaj na početni ekran" can create only a shortcut, so the in-app button is "Instaliraj aplikaciju" (native prompt, confirmation, menu guide) and the dashboard shows an install card on mobile (`src/lib/use-pwa-install.ts`).
- Physical-device checks never done: camera/audio on Android and iPhone, PWA install, real-phone catalog opening. Run `docs/device-checklist.md` on both phones before launch.
- Baseline verified 2026-10-02 (catalog PR): typecheck clean, lint 5 warnings, 316/316 unit tests.
