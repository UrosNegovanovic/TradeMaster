BEGIN;

ALTER TABLE public.products
  ADD COLUMN "costPrice" DECIMAL(10, 2);

ALTER TABLE public.invoice_items
  ADD COLUMN "unitCost" DECIMAL(10, 2);

ALTER TABLE public.products
  ADD CONSTRAINT "products_costPrice_nonnegative" CHECK ("costPrice" IS NULL OR "costPrice" >= 0);

ALTER TABLE public.invoice_items
  ADD CONSTRAINT "invoice_items_unitCost_nonnegative" CHECK ("unitCost" IS NULL OR "unitCost" >= 0);

COMMIT;
