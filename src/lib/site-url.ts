/**
 * The public address of the site, one source for metadataBase, canonical URLs, robots and the
 * sitemap (ROADMAP A2.11). Set NEXT_PUBLIC_APP_URL to the production domain once it exists (A1.10);
 * until then Vercel's production URL is used.
 */
export const FALLBACK_SITE_URL = 'https://trade-master-seven.vercel.app'

export function siteUrl(env: NodeJS.ProcessEnv = process.env): string {
  const candidates = [
    env.NEXT_PUBLIC_APP_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined,
  ]
  for (const raw of candidates) {
    const value = raw?.trim()
    if (!value) continue
    try {
      const url = new URL(value)
      if (url.protocol === 'https:' || url.hostname === 'localhost') return url.origin
    } catch {
      // ignore a malformed value and try the next one
    }
  }
  return FALLBACK_SITE_URL
}

export function absoluteUrl(path: string, env: NodeJS.ProcessEnv = process.env): string {
  return new URL(path.startsWith('/') ? path : `/${path}`, siteUrl(env)).href
}
