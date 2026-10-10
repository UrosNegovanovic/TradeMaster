import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Platform owner (the operator of TradeMaster, not a tenant): ROADMAP "Owner panel", step O1.
 * The role lives only in server env, never on `Profile` or in Clerk metadata, so a tenant cannot get it
 * through anything they can edit. `OWNER_PANEL=on` switches the panel on; `PLATFORM_OWNER_USER_IDS` is a
 * comma-separated list of Clerk user ids (ids, not e-mails: an e-mail can be changed or added in Clerk).
 * Empty list or switch off = nobody is an owner.
 */

type OwnerEnv = Record<string, string | undefined>

/** Where the owner lands after sign-in; the panel lives under this path. */
export const OWNER_HOME_PATH = '/owner'

export function isPlatformOwner(userId: string | null | undefined, env: OwnerEnv = process.env): boolean {
  if (!userId || env.OWNER_PANEL !== 'on') return false
  return (env.PLATFORM_OWNER_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(userId)
}

export type PlatformOwnerCheck = { ok: true; userId: string } | { ok: false; response: NextResponse }

/**
 * Gate for every `/owner` page and `/api/owner/*` handler. Everyone else (signed out, a tenant, panel off)
 * gets the same 404, not 403, so the panel's existence is not revealed. Pages call `notFound()` on `!ok`.
 */
export async function requirePlatformOwner(): Promise<PlatformOwnerCheck> {
  const notFound = () => ({ ok: false as const, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) })
  if (process.env.OWNER_PANEL !== 'on') return notFound()
  const { userId } = await auth()
  if (!userId || !isPlatformOwner(userId)) return notFound()
  return { ok: true, userId }
}

/**
 * Tenant pages are closed to the platform owner, who works only in the owner panel: returns the path the
 * `(dashboard)` layout redirects to, or null for everyone else. With the panel off Clerk is not even asked,
 * so tenant pages render exactly as before.
 */
export async function ownerRedirectFromTenantPages(): Promise<string | null> {
  if (process.env.OWNER_PANEL !== 'on') return null
  const { userId } = await auth()
  return isPlatformOwner(userId) ? OWNER_HOME_PATH : null
}
