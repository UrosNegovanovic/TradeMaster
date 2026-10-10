import type { Metadata } from 'next'

// Platform owner panel (ROADMAP O1): its own shell, no tenant navigation, never indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>
}
