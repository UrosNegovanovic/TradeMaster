import { createRouteMatcher } from '@clerk/nextjs/server'
import type { NextRequest } from 'next/server'

export const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/',
  '/privatnost',
  '/uslovi',
  '/za/(.*)', // Pages per trade (ROADMAP A2.11)
  '/opengraph-image(.*)', // Link-preview image read by WhatsApp, Viber, search engines
  '/twitter-image(.*)',
  '/privacy',
  '/terms',
  '/shared/catalog/(.*)', // Public catalog preview
  '/api/public/catalogs/(.*)', // Unlisted catalog JSON for that preview
  '/api/shared/catalog/(.*)', // Revocable token-based catalog JSON
  '/shared/invoice/(.*)', // Public invoice view for the buyer
  '/api/shared/invoice/(.*)', // Revocable token-based invoice JSON
  '/api/cron/(.*)', // Vercel Cron; each handler checks Authorization: Bearer $CRON_SECRET
  '/robots.txt',
  '/sitemap.xml',
])

export const isApiRoute = createRouteMatcher(['/api(.*)'])

/** HTML pages stay behind Clerk protect(); API handlers return their own JSON 401. */
export function shouldProtectHtmlRoute(request: NextRequest): boolean {
  return !isPublicRoute(request) && !isApiRoute(request)
}
