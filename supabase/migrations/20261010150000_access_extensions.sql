-- Manual billing (docs/billing-runbook.md): one row per confirmed payment that extended a company's access.
-- NOT applied yet: needs the owner's separate approval before it runs in production.
-- 1) The trace: which document/payment (reference), the bank statement date (paidOn), the period it paid for
--    and the expiry before and after. Written by scripts/extend-access.ts in the same transaction as
--    profiles."accessExpiresAt".
-- 2) The protection: reference is unique, so the same confirmed payment can never extend access twice
--    (not even for a different company by mistake). The script normalizes it (trim, upper case, single spaces).
-- 3) anchorDay keeps the renewal day of the month (31 = last day), so 31.01. -> 28.02. -> 31.03.
-- Additive only: no existing row or column changes, nothing is backfilled.
BEGIN;

CREATE TABLE IF NOT EXISTS public.access_extensions (
  id TEXT PRIMARY KEY,
  "profileId" TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reference TEXT NOT NULL,
  "paidOn" DATE NOT NULL,
  basis TEXT NOT NULL CHECK (basis IN ('continue', 'reactivate')),
  "periodFrom" DATE NOT NULL,
  "periodUntil" DATE NOT NULL,
  "anchorDay" INTEGER NOT NULL CHECK ("anchorDay" BETWEEN 1 AND 31),
  "previousExpiresAt" TIMESTAMP(3),
  "newExpiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ("periodUntil" >= "periodFrom")
);

CREATE UNIQUE INDEX IF NOT EXISTS "access_extensions_reference_key" ON public.access_extensions (reference);
CREATE INDEX IF NOT EXISTS "access_extensions_profileId_createdAt_idx" ON public.access_extensions ("profileId", "createdAt");

-- Only the owner's script (Prisma, server role) touches it; no client access.
ALTER TABLE public.access_extensions ENABLE ROW LEVEL SECURITY;

COMMIT;
