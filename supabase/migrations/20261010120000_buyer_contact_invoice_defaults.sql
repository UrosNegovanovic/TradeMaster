-- ROADMAP A9.21: saved buyers get a phone and an e-mail, so a payment reminder or a shared link goes
-- straight to the buyer (wa.me/<number>, mailto:).
-- ROADMAP A9.22: company defaults for new invoices (payment term in days, a note printed on every invoice)
-- and the note each document was issued with (a snapshot: changing the default never rewrites old PDFs).
-- All columns are optional; nothing is backfilled. Existing code keeps working before the deploy.
BEGIN;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS "email" TEXT;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "defaultPaymentDays" INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "invoiceNote" TEXT;

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "note" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_default_payment_days_range') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_default_payment_days_range
      CHECK ("defaultPaymentDays" IS NULL OR "defaultPaymentDays" BETWEEN 0 AND 365);
  END IF;
END $$;

COMMIT;
