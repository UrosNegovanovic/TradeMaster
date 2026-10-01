# Launch status

Short-lived file: update it when something changes. Stable rules live in `CLAUDE.md`, the plan in `docs/ROADMAP.md`.

_Last updated: 2026-10-01. Target release: 2026-11-01._

## Done on main

- Security and paper phases (Phase 0-2): tenant categories, Serbian PDFs, Belgrade day boundary, storage policies tightened.
- Settings logo persists after save.
- Purchase price rules: `costPrice` required on ProductForm, invoice cost snapshots.
- Optional sale price and Clerk-authenticated product image upload.
- Honest early-access landing copy, Serbian leftovers, after-sign-in redirect to `/dashboard`.

## Blocked on the owner

| Item | Why it blocks | Where it lands |
|---|---|---|
| Domain name (buy and point to Vercel) | Clerk Production, canonical URL, sitemap, email | Vercel domains, `NEXT_PUBLIC_APP_URL` |
| Clerk Production (`pk_live_`) | Needs the domain; Development keys cannot be used for real customers | Clerk dashboard, Vercel env |
| Real operator data (legal name, 9-digit PIB, address) | `src/lib/operator.ts` still has placeholder values; required for legal pages | `src/lib/operator.ts` |
| Billing decision (manual vs Stripe/other) | Landing says manual payment, 30 EUR / 60 days; no checkout exists | `src/lib/landing-copy.ts` |

No paid ads until the first three are done.

## Known gaps (from code review, 2026-10-01)

- Invoices have no VAT (PDV) fields; totals are plain sums in RSD.
- No transactional email (invoice delivery, password-less onboarding mails).
- No product analytics or error monitoring.
- `README.md` and `SEO_DEVOPS_AUDIT.md` are partly outdated (January 2026).
