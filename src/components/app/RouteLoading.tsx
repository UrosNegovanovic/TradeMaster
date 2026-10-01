import { Loader2 } from 'lucide-react'
import { sr } from '@/lib/ui-copy'

export function RouteLoading() {
  return (
    <div
      className="flex min-h-[400px] items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label={sr.route.loading}
    >
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <span className="sr-only">{sr.route.loading}</span>
    </div>
  )
}
