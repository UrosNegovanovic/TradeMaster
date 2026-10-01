/** Where signed-in users should land. PWA start_url is the same path. */
export const AFTER_AUTH_PATH = '/dashboard'

/** Public marketing home. Signed-in visits should not stay here. */
export const PUBLIC_HOME_PATH = '/'

export function afterAuthPathForUser(userId: string | null | undefined): string | null {
  return userId ? AFTER_AUTH_PATH : null
}
