'use client'

import Link from 'next/link'
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { 
  Package, 
  FileText, 
  Download,
  ArrowRight
} from 'lucide-react'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: App Name */}
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">TradeMaster</h1>
            </Link>

            {/* Right: Authentication */}
            <div className="flex items-center gap-4">
              <SignedOut>
                <Link href="/sign-in">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/sign-up">
                  <Button>Get Started</Button>
                </Link>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard">
                  <Button variant="outline">Go to Dashboard</Button>
                </Link>
                <UserButton />
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Simplify Your Wholesale Business
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Manage inventory, create stunning PDF catalogs, and share offers with clients in seconds.
          </p>
          <SignedOut>
            <Link href="/sign-up">
              <Button size="lg" className="text-lg px-8 py-6">
                Start for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard">
              <Button size="lg" className="text-lg px-8 py-6">
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </SignedIn>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1: Smart Inventory */}
            <div className="text-center p-6 rounded-lg bg-background border">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                <Package className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Inventory</h3>
              <p className="text-muted-foreground">
                Track products, prices, and SKUs easily. Keep your stock organized and up-to-date.
              </p>
            </div>

            {/* Feature 2: Instant Catalogs */}
            <div className="text-center p-6 rounded-lg bg-background border">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Instant Catalogs</h3>
              <p className="text-muted-foreground">
                Select products and apply discounts dynamically. Create custom catalogs for your clients instantly.
              </p>
            </div>

            {/* Feature 3: PDF Export */}
            <div className="text-center p-6 rounded-lg bg-background border">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                <Download className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">PDF Export</h3>
              <p className="text-muted-foreground">
                Generate professional, printable catalogs with one click. Share beautiful PDFs with your clients.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} TradeMaster. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
