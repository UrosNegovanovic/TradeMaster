import { MetadataRoute } from 'next'

/**
 * Dynamic sitemap generation for TradeMaster
 * This tells search engines about all public pages on the site
 * 
 * Priority scale: 0.0 - 1.0 (1.0 = highest)
 * Change frequency: always, hourly, daily, weekly, monthly, yearly, never
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // Use environment variable or fallback to Vercel URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trade-master-seven.vercel.app'
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1.0, // Homepage - highest priority
    },
    {
      url: `${baseUrl}/sign-up`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8, // Sign-up is important for conversion
    },
    {
      url: `${baseUrl}/sign-in`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5, // Sign-in is less important for SEO
    },
    // Note: Public catalog pages (/shared/catalog/[id]) are dynamic
    // Consider adding them from database in the future:
    // 
    // const catalogs = await prisma.catalog.findMany({
    //   where: { isPublic: true },
    //   select: { id: true, updatedAt: true }
    // })
    // 
    // ...catalogs.map(catalog => ({
    //   url: `${baseUrl}/shared/catalog/${catalog.id}`,
    //   lastModified: catalog.updatedAt,
    //   changeFrequency: 'weekly',
    //   priority: 0.7,
    // }))
  ]
}
