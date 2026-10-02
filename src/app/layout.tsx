import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import { ClerkProvider } from "@clerk/nextjs"
import { srRS } from "@clerk/localizations/sr-RS"
import "./globals.css"
import { Providers } from "./providers"
import { Toaster } from "sonner"
import { AFTER_AUTH_PATH } from "@/lib/after-auth"
import { VercelAnalytics } from "@/components/analytics/VercelAnalytics"

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://trade-master-seven.vercel.app'),
  
  title: {
    default: "TradeMaster — od barkoda do fakture",
    template: "%s | TradeMaster",
  },
  
  description: "Skeniraj robu, prati lager i pošalji fakturu sa PDV-om i QR kodom za plaćanje. Na telefonu i računaru.",
  
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
    title: 'TradeMaster — od barkoda do fakture',
    description: 'Skeniraj robu, prati lager i pošalji fakturu sa PDV-om i QR kodom za plaćanje. Za trgovce i malu veleprodaju.',
    siteName: 'TradeMaster',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TradeMaster — od barkoda do fakture',
      },
    ],
  },
  
  twitter: {
    card: 'summary_large_image',
    title: 'TradeMaster — od barkoda do fakture',
    description: 'Skeniraj robu, prati lager i pošalji fakturu sa PDV-om i QR kodom za plaćanje.',
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
  
  manifest: '/manifest.webmanifest',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const tree = (
    <html lang="sr" className="scroll-smooth motion-reduce:scroll-auto">
      <body className={inter.className}>
        <Script id="tm-pwa-capture" src="/pwa-capture.js" strategy="beforeInteractive" />
        <Providers>{children}</Providers>
        <VercelAnalytics />
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
    <ClerkProvider
      localization={srRS}
      appearance={{
        variables: {
          colorPrimary: '#1a6e5c',
          borderRadius: '0.5rem',
          fontFamily: inter.style.fontFamily,
        },
      }}
      signInFallbackRedirectUrl={AFTER_AUTH_PATH}
      signUpFallbackRedirectUrl={AFTER_AUTH_PATH}
    >
      {tree}
    </ClerkProvider>
  )
}
