import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"
import { Providers } from "./providers"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TradeMaster - Inventory & Catalog Management",
  description: "B2B application for managing inventory and creating professional PDF catalogs",
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
            position="top-center"
            richColors
            expand={false}
            closeButton
          />
        </body>
      </html>
    </ClerkProvider>
  )
}
