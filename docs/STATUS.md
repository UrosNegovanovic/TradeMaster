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
- IPS QR on the invoice PDF (ROADMAP #6): `src/lib/ips-qr.ts`; shown for unpaid invoices when the company giro account has valid control digits. Needs a real scan with a Serbian banking app before launch.
- Accountant export (ROADMAP #5): `GET /api/invoices/export?from&to&format=csv|xlsx`, no migration needed.

## Blocked on the owner

| Item | Why it blocks | Where it lands |
|---|---|---|
| Domain name (buy and point to Vercel) | Clerk Production, canonical URL, sitemap, email | Vercel domains, `NEXT_PUBLIC_APP_URL` |
| Clerk Production (`pk_live_`) | Needs the domain; Development keys cannot be used for real customers | Clerk dashboard, Vercel env |
| Real operator data (legal name, 9-digit PIB, address) | `src/lib/operator.ts` still has placeholder values; required for legal pages | `src/lib/operator.ts` |
| Billing decision (manual vs Stripe/other) | Landing says manual payment, 30 EUR / 60 days; no checkout exists | `src/lib/landing-copy.ts` |

No paid ads until the first three are done.

## Known gaps (from code review, 2026-10-01)

- PDV is on invoices (see Done). Still missing: PDV-aware CSV export (roadmap #5) and IPS QR amount (roadmap #6) must use `totalAmount` (payable) and `vatAmount`.
- No transactional email (invoice delivery, password-less onboarding mails).
- No product analytics or error monitoring.
- `README.md` and `SEO_DEVOPS_AUDIT.md` are partly outdated (January 2026); the 2026-09-23 launch-readiness doc predates the catalog-share and debug-ingest fixes.
- No team access: one Clerk user = one company (`Profile.clerkUserId` is unique). Do not advertise multi-user.
- Rate limiting is in-memory per instance, so it does not hold on Vercel serverless; fine as a speed bump, not as abuse protection.
- `(profileId, sku)` is not unique: legacy daily-batch product rows remain (see `prisma/schema.prisma`). Needs a consolidation migration before a unique index.
- `reserveNextInvoiceNumber` uses the server-clock year (`getFullYear()`), not Europe/Belgrade, so invoices issued just after midnight on 1 Jan can get the wrong year prefix.
- Physical-device checks never done: camera/audio on Android and iPhone, PWA install, real-phone catalog opening.
- Baseline verified 2026-10-02 (catalog PR): typecheck clean, lint 5 warnings, 316/316 unit tests.
