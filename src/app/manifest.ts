import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TradeMaster',
    short_name: 'TradeMaster',
    description: 'Skeniraj robu, vidi lager, pošalji katalog, izdaj fakturu.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#1a6e5c',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
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
        purpose: 'any',
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
        description: 'Pregled lagera i faktura',
        url: '/dashboard',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Skeniraj',
        short_name: 'Sken',
        description: 'Skeniraj barkod proizvoda',
        url: '/inventory',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Magacin',
        short_name: 'Magacin',
        description: 'Stanje i izlaz robe',
        url: '/warehouse',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  }
}
