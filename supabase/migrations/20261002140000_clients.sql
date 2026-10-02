-- Saved buyers per merchant. Invoices keep their own snapshot of name/PIB/address,
-- so there is no foreign key from invoices and nothing to backfill.

BEGIN;

CREATE TABLE IF NOT EXISTS public.clients (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "pib" TEXT,
  "address" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "profileId" TEXT NOT NULL REFERENCES public.profiles("id") ON DELETE CASCADE,
  CONSTRAINT "clients_pib_format" CHECK ("pib" IS NULL OR "pib" ~ '^[0-9]{9}$')
);

CREATE INDEX IF NOT EXISTS "clients_profileId_name_idx"
  ON public.clients ("profileId", "name");

-- Same posture as the other tables: only the server (service role / Prisma) touches the data.
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

COMMIT;
