-- Matični broj (8 digits) of the company and of saved buyers, required by SEF e-invoices.
-- Optional columns; nothing is backfilled.
BEGIN;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "registrationNumber" TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS "registrationNumber" TEXT;
COMMIT;
