'use client'

import { RouteError } from '@/components/app/RouteError'
import { sr } from '@/lib/ui-copy'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      homeHref="/dashboard"
      homeLabel={sr.common.dashboard}
    />
  )
}
