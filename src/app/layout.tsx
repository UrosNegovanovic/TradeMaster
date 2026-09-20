import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"
import { Providers } from "./providers"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

// Viewport configuration for optimal mobile experience
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

// Enhanced SEO metadata with OpenGraph and Twitter Card support
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://trade-master-git-main-uros-projects-fe7ff8aa.vercel.app'),
  
  // Title configuration with template for child pages
  title: {
    default: "TradeMaster - B2B Inventory & Catalog Management System",
    template: "%s | TradeMaster",
  },
  
  // Detailed description for search engines
  description: "Professional B2B inventory management and PDF catalog generation platform. Streamline your wholesale business with smart inventory tracking, barcode scanning, instant catalog creation, and client management tools.",
  
  // Keywords for SEO (helps with search engine discovery)
  keywords: [
    'B2B inventory management',
    'wholesale catalog',
    'PDF catalog generator',
    'inventory tracking',
    'product management',
    'wholesale business software',
    'catalog management system',
    'merchant tools',
    'stock management',
    'business inventory',
    'barcode scanner',
    'warehouse management',
    'invoice generator',
    'wholesale trade',
  ],
  
  // Author and creator information
  authors: [{ name: 'TradeMaster Team' }],
  creator: 'TradeMaster',
  publisher: 'TradeMaster',
  
  // Application name for PWA
  applicationName: 'TradeMaster',
  
  // Referrer policy for security
  referrer: 'origin-when-cross-origin',
  
  // Robots meta tags for search engine crawling
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // OpenGraph metadata (for Facebook, LinkedIn, WhatsApp sharing)
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'TradeMaster - B2B Inventory & Catalog Management',
    description: 'Professional inventory management and PDF catalog generation for wholesale businesses. Track products, manage warehouse, create stunning catalogs.',
    siteName: 'TradeMaster',
    images: [
      {
        url: '/og-image.png', // TODO: Create this image (1200x630px)
        width: 1200,
        height: 630,
        alt: 'TradeMaster - B2B Inventory Management Platform',
      },
    ],
  },
  
  // Twitter Card metadata (for Twitter/X sharing)
  twitter: {
    card: 'summary_large_image',
    title: 'TradeMaster - B2B Inventory & Catalog Management',
    description: 'Professional inventory management and PDF catalog generation for wholesale businesses',
    images: ['/twitter-image.png'], // TODO: Create this image (1200x600px)
    creator: '@TradeMaster', // TODO: Update with actual Twitter handle
  },
  
  // Icons and favicons
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png', // TODO: Create this (180x180px)
    other: [
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        url: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        url: '/favicon-16x16.png',
      },
    ],
  },
  
  // PWA manifest
  manifest: '/manifest.json',
  
  // Alternate languages (if you add i18n in the future)
  // alternates: {
  //   canonical: '/',
  //   languages: {
  //     'en-US': '/en-US',
  //     'sr-RS': '/sr-RS',
  //   },
  // },
  
  // Verification tokens for search engines (add these when available)
  // verification: {
  //   google: 'google-site-verification-token',
  //   yandex: 'yandex-verification-token',
  //   yahoo: 'yahoo-verification-token',
  // },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <Providers>{children}</Providers>
          <Toaster
            position="top-right"
            offset={16}
            gap={12}
            visibleToasts={4}
            expand={false}
            toastOptions={{
              unstyled: true,
              className: 'w-auto bg-transparent p-0 shadow-none border-0',
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  )
}
