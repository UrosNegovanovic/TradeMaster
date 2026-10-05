-- Predračun (proforma) lives in the invoices table with its own number series.
-- Existing rows are invoices; nothing else is backfilled.
-- A proforma never moves stock and is never revenue or a receivable (enforced in the app).
BEGIN;
DO $$ BEGIN
  CREATE TYPE "DocumentType" AS ENUM ('INVOICE', 'PROFORMA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "documentType" "DocumentType" NOT NULL DEFAULT 'INVOICE';
-- Set on a proforma once it is turned into an invoice; cleared if that invoice is deleted.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "convertedInvoiceId" TEXT;
DO $$ BEGIN
  ALTER TABLE public.invoices
    ADD CONSTRAINT "invoices_convertedInvoiceId_fkey"
    FOREIGN KEY ("convertedInvoiceId") REFERENCES public.invoices(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_convertedInvoiceId_key" ON public.invoices("convertedInvoiceId");
CREATE INDEX IF NOT EXISTS "invoices_profileId_documentType_idx" ON public.invoices("profileId", "documentType");
COMMIT;
