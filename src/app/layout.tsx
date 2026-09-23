import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"
import { Providers } from "./providers"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin", "latin-ext"] })

// Viewport configuration for optimal mobile experience
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1a6e5c' },
    { media: '(prefers-color-scheme: dark)', color: '#1a6e5c' },
  ],
}

// Enhanced SEO metadata with OpenGraph and Twitter Card support
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://trade-master-git-main-uros-projects-fe7ff8aa.vercel.app'),
  
  title: {
    default: "TradeMaster — skeniraj, lager, katalog, faktura",
    template: "%s | TradeMaster",
  },
  
  description: "Skeniraj robu, vidi lager, pošalji katalog i izdaj fakturu. Alat za trgovce, veleprodaju i mali magacin.",
  
  keywords: [
    'B2B magacin',
    'veleprodaja',
    'lager',
    'barkod skener',
    'katalog PDF',
    'faktura',
    'trgovac',
    'inventory',
    'TradeMaster',
  ],
  
  authors: [{ name: 'TradeMaster' }],
  creator: 'TradeMaster',
  publisher: 'TradeMaster',
  
  applicationName: 'TradeMaster',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TradeMaster',
  },
  
  referrer: 'origin-when-cross-origin',
  
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
  
  openGraph: {
    type: 'website',
    locale: 'sr_RS',
    url: '/',
    title: 'TradeMaster — skeniraj, lager, katalog, faktura',
    description: 'Od kamere u hali do PDF-a za klijenta. Za trgovce, veleprodaju i mali magacin.',
    siteName: 'TradeMaster',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TradeMaster — skeniraj robu, vidi lager, pošalji katalog, izdaj fakturu',
      },
    ],
  },
  
  twitter: {
    card: 'summary_large_image',
    title: 'TradeMaster — skeniraj, lager, katalog, faktura',
    description: 'Od kamere u hali do PDF-a za klijenta.',
    images: ['/og-image.png'],
  },
  
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/mark.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const tree = (
    <html lang="sr">
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
  )

  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  if (!clerkKey) {
    return tree
  }

  return (
    <ClerkProvider appearance={{ variables: { colorPrimary: '#1a6e5c' } }}>
      {tree}
    </ClerkProvider>
  )
}
