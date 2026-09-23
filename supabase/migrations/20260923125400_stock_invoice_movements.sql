BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StockMovementSource') THEN
    CREATE TYPE "StockMovementSource" AS ENUM ('INTAKE', 'INVOICE', 'MANUAL');
  END IF;
END $$;

ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS source "StockMovementSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "sourceKey" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_invoiceId_fkey'
  ) THEN
    ALTER TABLE public.stock_movements
      ADD CONSTRAINT stock_movements_invoiceId_fkey
      FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS stock_movements_profileId_source_sourceKey_key
  ON public.stock_movements ("profileId", source, "sourceKey");

CREATE INDEX IF NOT EXISTS stock_movements_invoiceId_idx
  ON public.stock_movements ("invoiceId");

WITH intake_due AS (
  SELECT
    pi."profileId",
    pi.key,
    pi."createdAt",
    pi.response->>'id' AS "productId",
    COALESCE(
      NULLIF(pi.response->>'quantityAdded', '')::int,
      NULLIF(pi.response->>'quantity', '')::int
    ) AS quantity
  FROM public.product_intakes pi
  WHERE pi.response->>'id' IS NOT NULL
),
intake_ins AS (
  INSERT INTO public.stock_movements (
    id, type, quantity, reason, source, "sourceKey", "createdAt", "profileId", "productId"
  )
  SELECT
    concat('smin_', replace(gen_random_uuid()::text, '-', '')),
    'IN',
    intake_due.quantity,
    'Ulaz robe',
    'INTAKE',
    concat('intake:', intake_due.key),
    intake_due."createdAt",
    intake_due."profileId",
    intake_due."productId"
  FROM intake_due
  JOIN public.products p ON p.id = intake_due."productId"
  WHERE intake_due.quantity IS NOT NULL AND intake_due.quantity > 0
    AND NOT EXISTS (
      SELECT 1
      FROM public.stock_movements sm
      WHERE sm."profileId" = intake_due."profileId"
        AND sm.source = 'INTAKE'
        AND sm."sourceKey" = concat('intake:', intake_due.key)
    )
  RETURNING id
)
SELECT COUNT(*) FROM intake_ins;

WITH invoice_due AS (
  SELECT
    i.id AS "invoiceId",
    i."invoiceNumber",
    i."profileId",
    ii."productId",
    SUM(ii.quantity)::int AS quantity,
    MIN(i."createdAt") AS "createdAt"
  FROM public.invoice_items ii
  JOIN public.invoices i ON i.id = ii."invoiceId"
  WHERE i.status <> 'DRAFT' AND ii."productId" IS NOT NULL
  GROUP BY i.id, i."invoiceNumber", i."profileId", ii."productId"
),
invoice_ins AS (
  INSERT INTO public.stock_movements (
    id, type, quantity, reason, source, "sourceKey", "createdAt", "profileId", "productId", "invoiceId"
  )
  SELECT
    concat('smout_', replace(gen_random_uuid()::text, '-', '')),
    'OUT',
    invoice_due.quantity,
    concat('Faktura ', invoice_due."invoiceNumber"),
    'INVOICE',
    concat('invoice:', invoice_due."invoiceId", ':', invoice_due."productId"),
    invoice_due."createdAt",
    invoice_due."profileId",
    invoice_due."productId",
    invoice_due."invoiceId"
  FROM invoice_due
  JOIN public.products p ON p.id = invoice_due."productId"
  WHERE invoice_due.quantity > 0
    AND NOT EXISTS (
      SELECT 1
      FROM public.stock_movements sm
      WHERE sm."profileId" = invoice_due."profileId"
        AND sm.source = 'INVOICE'
        AND sm."sourceKey" = concat('invoice:', invoice_due."invoiceId", ':', invoice_due."productId")
    )
  RETURNING "productId", quantity
)
UPDATE public.products p
SET quantity = GREATEST(0, p.quantity - x.qty)
FROM (
  SELECT "productId", SUM(quantity)::int AS qty
  FROM invoice_ins
  GROUP BY "productId"
) x
WHERE p.id = x."productId";

COMMIT;
