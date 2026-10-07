-- How often a shared catalog link was opened (ROADMAP A8). Counted by the public catalog APIs.
-- Existing catalogs start at 0 / NULL; nothing is backfilled.
BEGIN;
ALTER TABLE public.catalogs ADD COLUMN IF NOT EXISTS "shareViewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.catalogs ADD COLUMN IF NOT EXISTS "shareLastViewedAt" TIMESTAMP(3);
COMMIT;
