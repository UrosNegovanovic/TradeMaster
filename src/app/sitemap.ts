import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/site-url'
import { tradePagePath, tradePages } from '@/lib/trade-pages'

/**
 * Public, indexable pages only (ROADMAP A2.11). Sign-in/sign-up, the app and shared customer
 * links (/shared/…) stay out: robots.ts disallows them and they carry noindex.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    ...tradePages.map((page) => ({
      url: absoluteUrl(tradePagePath(page)),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    { url: absoluteUrl('/privatnost'), changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/uslovi'), changeFrequency: 'yearly', priority: 0.3 },
  ]
}
