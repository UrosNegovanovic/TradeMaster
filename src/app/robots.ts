import { MetadataRoute } from 'next'

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL || 'https://trade-master-seven.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/shared/catalog/'],
      disallow: ['/dashboard', '/inventory', '/warehouse', '/catalogs', '/invoices', '/finance', '/settings', '/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
