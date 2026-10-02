import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * "Up" navigation for sub-pages (new / edit / detail). The installed PWA has no browser chrome, so every
 * sub-page needs its own way back. It links to the explicit parent page instead of history.back(), which
 * would leave the app when the page was opened from a notification, a shared link or a cold start.
 */
export function BackLink({
  href,
  children,
  className,
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Button variant="ghost" size="sm" className={cn('mb-2 -ml-2 min-h-11', className)} asChild>
      <Link href={href}>
        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
        {children}
      </Link>
    </Button>
  )
}
