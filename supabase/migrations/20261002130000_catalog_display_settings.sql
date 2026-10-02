-- Catalog display settings: layout, category grouping, sort order and visible fields.
-- Defaults reproduce the current look, so existing catalogs render unchanged.
BEGIN;
ALTER TABLE public.catalogs ADD COLUMN "layout" TEXT NOT NULL DEFAULT 'GRID_4';
ALTER TABLE public.catalogs ADD COLUMN "groupByCategory" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.catalogs ADD COLUMN "sortMode" TEXT NOT NULL DEFAULT 'MANUAL';
ALTER TABLE public.catalogs ADD COLUMN "showSku" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.catalogs ADD COLUMN "showDescription" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.catalogs ADD COLUMN "showOriginalPrice" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.catalogs ADD CONSTRAINT "catalogs_layout_check"
  CHECK ("layout" IN ('GRID_4', 'GRID_12', 'LIST'));
ALTER TABLE public.catalogs ADD CONSTRAINT "catalogs_sortMode_check"
  CHECK ("sortMode" IN ('MANUAL', 'NAME', 'PRICE_ASC', 'PRICE_DESC'));
COMMIT;
