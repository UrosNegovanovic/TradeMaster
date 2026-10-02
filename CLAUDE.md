# TradeMaster — Claude Code

B2B SaaS for Serbian wholesalers and small warehouses. UI is Serbian; code, comments and commit messages are English.
Production runs on Vercel. Current launch state and blockers live in `docs/STATUS.md`; the launch plan is `docs/ROADMAP.md`.

Read this file before any change. Prefer the smallest PR that fits the current architecture.

## Product loop (do not invent a different app)

`sken → asortiman → magacin → katalog → faktura → finansije`

- **Asortiman**: products. `costPrice` (nabavna) is required on `ProductForm`; `0` is allowed only with `costPriceZeroReason`. `price` (prodajna) is optional: it prefills invoice lines and can be set later.
- **Sken**: `html5-qrcode` in `src/components/inventory/BarcodeScanner.tsx`. Do not rewrite it unless it is broken. UX rules: `docs/scanner-ux-rules.md`.
  Quick Scan is a fast intake path and may save without `costPrice` (the column is nullable for that reason); the user fills it later in ProductForm. Do not "fix" this in the scanner.
- **Magacin**: Ulaz / Izlaz, CSV/XLSX import. Day boundaries use `Europe/Belgrade` (`src/lib/local-date.ts`). Stock rules: `docs/stock-invoice-rules.md`.
- **Katalog**: PDF + revocable share token. Public catalog by CUID returns 410 unless `shareEnabled`. Never expose `costPrice`, stock or owner ids in public DTOs. Each catalog stores display settings (`layout` GRID_4 | GRID_12 | LIST, `groupByCategory`, `sortMode` MANUAL | NAME | PRICE_ASC | PRICE_DESC, `showSku`, `showDescription`, `showOriginalPrice`); the PDF, owner preview and public link all render through `src/lib/catalog-layout.ts`, so change ordering/grouping there, not per view. `CatalogItem.sortOrder` is the manual order (selection order). Public DTO is built only by `publicCatalogSelect` / `toPublicCatalogBody` and drops SKU/description the owner hid. Price 0 means "Cena na upit".
- **Faktura**: internal invoices (not SEF, not fiscal). Lines snapshot `unitPrice`, `unitCost`, `quantity`, `productName`; historical invoices never follow later product edits. Profit uses snapshots (`src/lib/invoice-finance.ts`). PDV: `Profile.inVatSystem` is the company setting; each issued invoice snapshots `vatEnabled`, `vatAmount` and per-line `vatRate` (0/10/20). `unitPrice`/`total` are excluding PDV, `totalAmount` is the amount payable (osnovica + PDV), osnovica = `totalAmount - vatAmount`. Receivables are gross; revenue and profit use the osnovica. Old invoices have vatEnabled false / vatAmount 0. Stock leaves on DRAFT → UNPAID/PAID only.
- **Podešavanja**: firma, PIB, žiro-račun, logo.

## Stack

Next.js 14 App Router, TypeScript, Tailwind + shadcn/ui, TanStack Query, Clerk, Prisma + PostgreSQL (Supabase), Zod, Sonner, `@react-pdf/renderer`, Vitest. PWA only (no App Store / Play).

## Commands

```bash
npm run dev          # local app on :3000
npm run typecheck    # tsc --noEmit (CI creates next-env.d.ts if missing)
npm run lint         # next lint
npm run test:run     # all unit tests, same as CI
npm run test:db      # DB integration tests, needs a test DATABASE_URL
```

Before every push: `npm run typecheck && npm run lint && npm run test:run`. CI (`.github/workflows/ci.yml`) runs exactly these on Node 20. Baseline on main (2026-10-02, after the catalog PR): 65 test files / 363 tests pass, lint shows 5 known warnings (BarcodeScanner and catalog edit page hook deps, InvoicePDF image alt) that are not yours to fix.
`vitest.config.ts` has an explicit `include` list: a new `*.test.ts` file does not run until you add it there.
`test:db` refuses to run unless `TEST_DATABASE_URL` points at a dedicated test database; never aim it at the live project.

## Data model in one paragraph

`Profile` (one per Clerk user, created lazily by `GET /api/profile`; every other API returns 404 "Profile not found" until then; there is no multi-user company membership) owns `Product`, `Category`, `Catalog`/`CatalogItem`, `Invoice`/`InvoiceItem`, `StockMovement`, `ProductIntake` (idempotency receipts). Invoice status is `DRAFT | UNPAID | PAID` (UI: Nacrt / Otvoreno / Plaćeno). Finance is cash-basis: revenue books on `paidAt`, open invoices are receivables. Invoice numbers are `YYYY-NNN` per company, reserved under an advisory lock in the same transaction. Stock moves are idempotent via `StockMovement.sourceKey` (`intake:<key>`, `invoice:<invoiceId>:<productId>`).

## Rules (never)

- Never invent parallel price fields. Use the existing names: `price`, `costPrice`, `unitPrice`, `unitCost`.
- Never validate money with `Number.isInteger(value * 100)` (fails for 19.99). Reuse the Zod schemas in `src/lib/validations.ts` (`requiredCostPriceSchema`, `optionalCostPriceSchema`, invoice item schemas); they share the internal `assertMoneyInput` (string/decimal check, max 2 decimals). DB money is `Decimal(10,2)`.
- Never trust UI-only checks: validate with Zod on client and server.
- Never ship an API route without auth unless it is listed in `isPublicRoute` (`src/lib/route-access.ts`). No debug endpoints, no unauthenticated barcode proxy.
- Never reopen anon INSERT on Supabase Storage. Uploads go Clerk session → `POST /api/uploads` (magic-byte sniff) → service role.
- Never fetch user-supplied URLs without `src/lib/safe-remote-url.ts` (blocks private IPs, SSRF).
- Never run `prisma migrate deploy` (or apply any migration to production) without asking the owner first; once the owner approves, you may run it. Production has no Prisma baseline, so check `prisma migrate status` first and report the result before deploying. Schema changes are new SQL files in `supabase/migrations/` (applied via the Supabase dashboard/MCP after approval), plus the matching `prisma/schema.prisma` edit.
- Never backfill `costPrice = 0` or fabricate historical `unitCost`.
- Never add date filters to the intake SKU lookup in `src/lib/product-intake.ts`. `(profileId, sku)` is not unique in the schema: old "daily batch" rows still exist, so intake updates the latest row for the SKU and Magacin sums quantities per SKU. Do not add the unique index or delete batch rows without an explicit migration plan.
- Never add global mutable lists. Everything is tenant-scoped by `profileId` (from the Clerk user); categories are per tenant.
- Never commit secrets (`sk_`, service role keys) or real personal/tax data.
- Never do drive-by refactors or "cleanup" of BarcodeScanner.

## Conventions

- Mutations from the client use `authorizedFetch` / `useAuthorizedFetch` (Bearer + credentials).
- Toasts via `notify` (`src/lib/notify.ts`, Sonner). Shared Serbian UI strings in `src/lib/ui-copy.ts`; landing copy in `src/lib/landing-copy.ts`.
- PDFs: load `@react-pdf/renderer` components with `next/dynamic(..., { ssr: false })`, Serbian labels. Use `PDF_FONT_FAMILY` and call `registerPdfFonts()` from `src/lib/pdf-fonts.ts` (Liberation Sans in `public/fonts`); built-in Helvetica/Courier drop č, ć, đ.
- Pure logic goes in `src/lib/*.ts` with a colocated `*.test.ts`. Add tests for the behavior you change.
- Conventional commits: `feat|fix|chore|docs|refactor|test: ...`.
- Work on a branch, open a draft PR, merge only when the owner says "merge".
- `src/lib/rate-limit.ts` is an in-memory per-instance limiter: best-effort only, not a real quota on serverless.
- Clerk middleware is skipped (public routes only) when `CLERK_SECRET_KEY` is missing; keep `route-access.ts` as the single list of public routes.
- Landing copy must stay honest: do not promise checkout, cancellation or features that do not exist yet.

## Where to look

| Flow | Start here |
|---|---|
| Product form / prices | `src/components/inventory/ProductForm.tsx`, `src/lib/validations.ts`, `src/lib/product-cost.ts`, `src/lib/product-put.ts` |
| Intake / scan save | `src/lib/product-intake.ts`, `src/lib/intake-request.ts`, `src/components/dashboard/QuickScanButton.tsx` |
| Stock | `src/app/api/stock-movements/`, `src/lib/invoice-stock.ts`, `src/components/warehouse/` |
| Invoice write | `src/lib/invoice-service.ts`, `src/app/api/invoices/`, `src/components/invoices/InvoiceForm.tsx` |
| Invoice PDF | `src/components/invoices/InvoicePDF.tsx` |
| IPS QR (PDF) | `src/lib/ips-qr.ts`, `src/components/invoices/InvoicePDF.tsx` |
| Accountant export | `src/lib/invoice-export.ts`, `src/app/api/invoices/export/route.ts`, `src/components/invoices/InvoiceExport.tsx` |
| Catalog layout / PDF | `src/lib/catalog-layout.ts`, `src/lib/catalog-picker.ts` (multi-category product picker), `src/components/catalogs/CatalogPDF.tsx`, `src/components/catalogs/CatalogItemsView.tsx`, `src/components/catalogs/CatalogForm.tsx` |
| Finance | `src/lib/invoice-finance.ts`, `src/app/(dashboard)/finance/` |
| Images | `src/lib/client-image-upload.ts`, `src/app/api/uploads/`, `src/lib/server-storage.ts` |
| Public catalog | `src/app/api/shared/catalog/[token]/` (token), `src/app/api/public/catalogs/[id]/` (must honor `shareEnabled`), `src/lib/public-catalog.ts` |
| Auth / routing | `src/middleware.ts`, `src/lib/route-access.ts`, `src/lib/after-auth.ts` (→ `/dashboard`) |
| Auth fetch | `src/lib/authorized-fetch.ts` |
| Landing / legal | `src/components/landing/`, `src/lib/landing-copy.ts`, `src/lib/operator.ts`, `src/app/privatnost`, `src/app/uslovi` |
| Schema | `prisma/schema.prisma`, `supabase/migrations/` (10 files; all hand-applied, never auto) |
| Rate limits / headers / images | `src/lib/rate-limit.ts`, `next.config.js` (security headers, allowed image hosts) |
| PWA | `src/app/manifest.ts`, `public/sw.js` (network-only worker, no caching), `src/lib/pwa-install.ts` |
| Older docs | `docs/mobile-launch-readiness-2026-09-23.md` is a dated snapshot (its P0 catalog-access and debug-ingest items are since fixed); `SEO_DEVOPS_AUDIT.md` and `README.md` are partly outdated |

## Out of scope until the owner says otherwise

SEF e-invoicing, fiscal cash register, native apps, CRM, supplier module, public storefront, cart/checkout, AI copilot, D2C shop. If asked, design on top of the existing catalog + share token instead of starting a second product.
