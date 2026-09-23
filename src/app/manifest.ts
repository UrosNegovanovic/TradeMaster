import { MetadataRoute } from 'next'

/**
 * PWA Manifest for TradeMaster
 * This enables "Add to Home Screen" functionality on mobile devices
 * 
 * To fully enable PWA:
 * 1. Add icon files to /public: icon-192.png, icon-512.png, apple-touch-icon.png
 * 2. Deploy with HTTPS (already done on Vercel)
 * 3. Optionally add a service worker for offline support
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TradeMaster - Inventory & Catalog Management',
    short_name: 'TradeMaster',
    description: 'Professional B2B inventory management and PDF catalog generation platform for wholesale businesses',
    start_url: '/',
    display: 'standalone', // Opens as a standalone app (no browser UI)
    background_color: '#ffffff',
    theme_color: '#0F766E',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable', // For Android adaptive icons
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any', // Standard icon
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    categories: ['business', 'productivity', 'finance'],
    shortcuts: [
      {
        name: 'Početna',
        short_name: 'Početna',
        description: 'Pregled poslovanja',
        url: '/dashboard',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Asortiman',
        short_name: 'Asortiman',
        description: 'Pregled proizvoda',
        url: '/inventory',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Magacin',
        short_name: 'Magacin',
        description: 'Pregled stanja magacina',
        url: '/warehouse',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  }
}
