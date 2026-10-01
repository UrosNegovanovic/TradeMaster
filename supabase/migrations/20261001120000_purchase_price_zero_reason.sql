-- Required purchase-price note when cost is 0.
-- Do not backfill products.costPrice (do not invent 0).
-- Do not backfill invoice_items.unitCost from current product prices.

BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS "costPriceZeroReason" TEXT;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS "products_costPriceZeroReason_when_zero";

ALTER TABLE public.products
  ADD CONSTRAINT "products_costPriceZeroReason_when_zero" CHECK (
    "costPriceZeroReason" IS NULL
    OR (
      "costPrice" = 0
      AND length(btrim("costPriceZeroReason")) > 0
    )
  );

COMMIT;
