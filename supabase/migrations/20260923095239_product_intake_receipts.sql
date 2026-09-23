BEGIN;
CREATE TABLE public.product_intakes (
  "profileId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "response" JSONB NOT NULL,
  "status" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT product_intakes_pkey PRIMARY KEY ("profileId", "key"),
  CONSTRAINT product_intakes_profileId_fkey FOREIGN KEY ("profileId") REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE
);
-- Clerk-owned data is served only by authenticated Next handlers via Prisma.
ALTER TABLE public.product_intakes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_intakes FROM PUBLIC;
DO $$
DECLARE role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON public.product_intakes FROM %I', role_name);
    END IF;
  END LOOP;
END $$;
COMMIT;
