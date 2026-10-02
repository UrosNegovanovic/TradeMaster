-- Manual billing: "access until" date per company, extended by hand after a paid invoice.
-- NULL = no limit. Existing companies stay NULL (nobody is cut off or put on a clock by this migration);
-- only companies created after this feature get an initial period from the application code.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "accessExpiresAt" TIMESTAMP(3);

COMMIT;
