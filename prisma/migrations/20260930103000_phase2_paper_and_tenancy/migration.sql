-- Phase 2: merchant žiro-račun, buyer PIB, tenant-scoped categories.
-- Safe category backfill: attach per-tenant or copy; do not wipe existing names.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "giroAccount" TEXT;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS "clientPib" TEXT;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS "profileId" TEXT;

-- Live unique is an index, not a table constraint. Drop it before tenant copies
-- or unused names (e.g. Chocolates) collide with the original global row.
DROP INDEX IF EXISTS public.categories_name_key;
ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_name_key;

-- Categories used by exactly one merchant keep their row.
UPDATE public.categories AS c
SET "profileId" = owned."profileId"
FROM (
  SELECT p."categoryId" AS id, MIN(p."profileId") AS "profileId"
  FROM public.products p
  WHERE p."categoryId" IS NOT NULL
  GROUP BY p."categoryId"
  HAVING COUNT(DISTINCT p."profileId") = 1
) AS owned
WHERE c.id = owned.id
  AND c."profileId" IS NULL;

-- Categories shared by more than one merchant: keep the original for one tenant, copy for the others.
DO $$
DECLARE
  cat RECORD;
  owner RECORD;
  keep_profile TEXT;
  copy_id TEXT;
BEGIN
  FOR cat IN
    SELECT c.id, c.name, c.description
    FROM public.categories c
    WHERE EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p."categoryId" = c.id
      GROUP BY p."categoryId"
      HAVING COUNT(DISTINCT p."profileId") > 1
    )
  LOOP
    SELECT MIN(p."profileId") INTO keep_profile
    FROM public.products p
    WHERE p."categoryId" = cat.id;

    UPDATE public.categories
    SET "profileId" = keep_profile
    WHERE id = cat.id;

    FOR owner IN
      SELECT DISTINCT p."profileId"
      FROM public.products p
      WHERE p."categoryId" = cat.id
        AND p."profileId" <> keep_profile
    LOOP
      SELECT existing.id INTO copy_id
      FROM public.categories existing
      WHERE existing."profileId" = owner."profileId"
        AND existing.name = cat.name
      LIMIT 1;

      IF copy_id IS NULL THEN
        copy_id := 'c' || replace(gen_random_uuid()::text, '-', '');
        INSERT INTO public.categories (id, name, description, "profileId", "createdAt", "updatedAt")
        VALUES (copy_id, cat.name, cat.description, owner."profileId", NOW(), NOW());
      END IF;

      UPDATE public.products
      SET "categoryId" = copy_id
      WHERE "categoryId" = cat.id
        AND "profileId" = owner."profileId";
    END LOOP;
  END LOOP;
END $$;

-- Unused global names: copy onto every merchant so nobody loses a label they created.
INSERT INTO public.categories (id, name, description, "profileId", "createdAt", "updatedAt")
SELECT
  'c' || replace(gen_random_uuid()::text, '-', ''),
  c.name,
  c.description,
  p.id,
  NOW(),
  NOW()
FROM public.categories c
CROSS JOIN public.profiles p
WHERE c."profileId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.products pr WHERE pr."categoryId" = c.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.categories existing
    WHERE existing."profileId" = p.id
      AND existing.name = c.name
  );

DELETE FROM public.categories c
WHERE c."profileId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.products pr WHERE pr."categoryId" = c.id
  );

-- Empty databases with leftover unscoped rows and no profiles: drop the orphans so NOT NULL can apply.
DELETE FROM public.categories
WHERE "profileId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.categories WHERE "profileId" IS NULL) THEN
    RAISE EXCEPTION 'categories still missing profileId after tenant backfill';
  END IF;
END $$;

ALTER TABLE public.categories
  ALTER COLUMN "profileId" SET NOT NULL;

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_profileId_fkey;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_profileId_fkey
  FOREIGN KEY ("profileId") REFERENCES public.profiles(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS categories_profileId_name_key;
CREATE UNIQUE INDEX categories_profileId_name_key ON public.categories ("profileId", name);

DROP INDEX IF EXISTS categories_profileId_idx;
CREATE INDEX categories_profileId_idx ON public.categories ("profileId");

COMMIT;
