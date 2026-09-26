BEGIN;
ALTER TABLE public.catalogs ADD COLUMN "shareToken" TEXT;
ALTER TABLE public.catalogs ADD COLUMN "shareEnabled" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "catalogs_shareToken_key" ON public.catalogs("shareToken");
COMMIT;
