-- PDV (VAT) on invoices.
-- profiles."inVatSystem": company setting, default false (nobody is switched into VAT by this migration).
-- invoices."vatEnabled": snapshot of the setting at issue time, so toggling it later never rewrites history.
-- invoices."vatAmount":  total VAT; "totalAmount" stays the amount payable (osnovica + PDV).
-- invoice_items."vatRate": per-line rate snapshot (0, 10 or 20).
-- Existing rows get the defaults (false / 0 / 0): every historical invoice was issued without PDV,
-- so no historical value is invented and no existing total changes.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "inVatSystem" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS "vatEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "vatAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS "vatRate" DECIMAL(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.invoice_items
  DROP CONSTRAINT IF EXISTS "invoice_items_vatRate_allowed";

ALTER TABLE public.invoice_items
  ADD CONSTRAINT "invoice_items_vatRate_allowed" CHECK ("vatRate" IN (0, 10, 20));

COMMIT;
