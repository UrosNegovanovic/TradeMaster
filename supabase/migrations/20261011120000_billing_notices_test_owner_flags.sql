-- Automatic predračun, part 2 (docs/billing-runbook.md). Applied in production 2026-10-10 with the owner's approval.
-- 1) isTest: a predračun made by `npm run billing:send -- --test` (sent only to the owner's test address, note
--    "TEST, ne plaćati"). Test rows never count as the real predračun for that month.
-- 2) ownerOnly: sent only to the owner (BILLING_EMAIL_BCC) because BILLING_AUTO_SEND was off; the customer did
--    not get it, the owner forwards it.
-- 3) The once-per-month guarantee moves from (profileId, periodFrom) to (profileId, periodFrom, isTest): still one
--    real predračun per company and month, and a test can never block or duplicate it.
-- The table is empty in production (created 2026-10-10, BILLING_AUTO_SEND never on); nothing is backfilled.
BEGIN;

ALTER TABLE public.billing_notices ADD COLUMN IF NOT EXISTS "isTest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.billing_notices ADD COLUMN IF NOT EXISTS "ownerOnly" BOOLEAN NOT NULL DEFAULT false;

DROP INDEX IF EXISTS public."billing_notices_profileId_periodFrom_key";
CREATE UNIQUE INDEX IF NOT EXISTS "billing_notices_profileId_periodFrom_isTest_key"
  ON public.billing_notices ("profileId", "periodFrom", "isTest");

COMMIT;
