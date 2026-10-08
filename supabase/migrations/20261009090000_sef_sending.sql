-- SEF sending (ROADMAP A3). Applied in production 2026-10-08 with the owner's approval (Supabase migration "sef_sending").
-- 1) sef_credentials: one encrypted SEF API key per company, in its own table so no
--    profile include can ever return it. AES-256-GCM ciphertext only; the master key
--    lives in the SEF_KEY_ENCRYPTION_KEY env var, never in the database.
-- 2) invoices: SEF send state. sefRequestId is the stable requestId sent to SEF, so a
--    retry of the same invoice can never create a second SEF invoice. Nothing is backfilled.
BEGIN;

CREATE TABLE IF NOT EXISTS public.sef_credentials (
  "profileId" TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  "apiKeyCiphertext" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- The app reaches it only through the server (service role / Prisma); no client access.
ALTER TABLE public.sef_credentials ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "sefRequestId" TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "sefInvoiceId" TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "sefStatus" TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "sefStatusComment" TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "sefSentAt" TIMESTAMP(3);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "sefStatusCheckedAt" TIMESTAMP(3);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "sefLastError" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_sefRequestId_key" ON public.invoices ("sefRequestId");
CREATE INDEX IF NOT EXISTS "invoices_profileId_sefStatus_idx" ON public.invoices ("profileId", "sefStatus");

COMMIT;
