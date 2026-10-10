-- Clerk Development -> Production cutover (ROADMAP A0.3, docs/identity-cutover-runbook.md).
-- NOT applied in production yet: needs the owner's approval (A0.7).
-- A production Clerk user gets a new id, while profiles."clerkUserId" holds the Development id, so swapping
-- the keys alone would cut every company off from its owner. This table is the only way a production
-- identity may be attached to an existing profile:
-- 1) one row per profile the owner approved to carry over (scripts/clerk-link.ts --register), with the
--    Development id it had at that moment and the class from the account inventory (A0.1);
-- 2) the production id is written when that user is created in the Production instance (--create-users);
-- 3) --apply swaps profiles."clerkUserId" only while it still equals "oldClerkUserId", in the same
--    transaction that marks the row LINKED; --revert puts the old id back the same way.
-- A profile, an old id and a new id each appear at most once.
-- Additive only: no existing row or column changes, nothing is backfilled.
BEGIN;

CREATE TABLE IF NOT EXISTS public.clerk_identity_links (
  id TEXT PRIMARY KEY,
  "profileId" TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  "oldClerkUserId" TEXT NOT NULL,
  "newClerkUserId" TEXT,
  "accountClass" TEXT NOT NULL CHECK ("accountClass" IN ('REAL', 'OWNER', 'DEMO', 'TEST')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'LINKED', 'REVERTED')),
  "approvedBy" TEXT NOT NULL,
  "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "linkedAt" TIMESTAMP(3),
  "revertedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ("newClerkUserId" IS NULL OR "newClerkUserId" <> "oldClerkUserId")
);

CREATE UNIQUE INDEX IF NOT EXISTS "clerk_identity_links_profileId_key" ON public.clerk_identity_links ("profileId");
CREATE UNIQUE INDEX IF NOT EXISTS "clerk_identity_links_oldClerkUserId_key" ON public.clerk_identity_links ("oldClerkUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "clerk_identity_links_newClerkUserId_key" ON public.clerk_identity_links ("newClerkUserId");

-- Only the owner's script (Prisma, server role) touches it; no client access.
ALTER TABLE public.clerk_identity_links ENABLE ROW LEVEL SECURITY;

COMMIT;
