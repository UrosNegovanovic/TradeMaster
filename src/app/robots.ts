import type { MetadataRoute } from 'next'
import { absoluteUrl, siteUrl } from '@/lib/site-url'

/**
 * Single robots source (ROADMAP A2.11; public/robots.txt is gone). Shared catalog and invoice
 * links belong to customers: they are never crawled (and carry noindex as well).
 */
const PRIVATE_PATHS = [
  '/api/',
  '/shared/',
  '/sign-in',
  '/sign-up',
  '/dashboard',
  '/inventory',
  '/warehouse',
  '/catalogs',
  '/invoices',
  '/clients',
  '/finance',
  '/settings',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: siteUrl(),
  }
}
