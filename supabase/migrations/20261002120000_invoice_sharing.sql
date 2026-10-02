-- Revocable share link for issued invoices (same contract as catalogs."shareToken").
-- Existing invoices start unshared; nothing is backfilled.
BEGIN;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "shareToken" TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "shareEnabled" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_shareToken_key" ON public.invoices("shareToken");
COMMIT;
