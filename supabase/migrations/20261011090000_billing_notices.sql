-- Automatic predračun for the TradeMaster subscription (docs/billing-runbook.md, src/lib/billing-run.ts).
-- Applied in production 2026-10-10 with the owner's approval (Supabase migration "billing_notices").
-- One row per company and paid month: which predračun (in the issuer's account) was sent, to whom, when, the NBS
-- rate used, the Resend message id and the last error. The owner reads it with `npm run billing:due`.
-- Protection: (profileId, periodFrom) is unique, so a company never gets two predračuni for the same month, even
-- if the daily job runs twice. Additive only: no existing row or column changes, nothing is backfilled.
BEGIN;

CREATE TABLE IF NOT EXISTS public.billing_notices (
  id TEXT PRIMARY KEY,
  "profileId" TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  "periodFrom" DATE NOT NULL,
  "periodUntil" DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  "invoiceId" TEXT REFERENCES public.invoices(id) ON DELETE SET NULL,
  "invoiceNumber" TEXT,
  recipient TEXT,
  "eurRate" DECIMAL(10, 4),
  "messageId" TEXT,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ("periodUntil" >= "periodFrom")
);

CREATE UNIQUE INDEX IF NOT EXISTS "billing_notices_profileId_periodFrom_key" ON public.billing_notices ("profileId", "periodFrom");
CREATE UNIQUE INDEX IF NOT EXISTS "billing_notices_invoiceId_key" ON public.billing_notices ("invoiceId");
CREATE INDEX IF NOT EXISTS "billing_notices_status_idx" ON public.billing_notices (status);

-- Only the server (Prisma) touches it; no client access.
ALTER TABLE public.billing_notices ENABLE ROW LEVEL SECURITY;

COMMIT;
