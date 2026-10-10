import { isPlatformOwner, OWNER_HOME_PATH } from '@/lib/platform-owner'

/** Where signed-in users should land. PWA start_url is the same path. */
export const AFTER_AUTH_PATH = '/dashboard'

/** Public marketing home. Signed-in visits should not stay here. */
export const PUBLIC_HOME_PATH = '/'

/** The platform owner lands on the owner panel (when it is switched on); everyone else as before. */
export function afterAuthPathForUser(userId: string | null | undefined): string | null {
  if (!userId) return null
  return isPlatformOwner(userId) ? OWNER_HOME_PATH : AFTER_AUTH_PATH
}
