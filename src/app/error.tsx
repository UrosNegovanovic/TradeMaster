'use client'

import { RouteError } from '@/components/app/RouteError'
import { sr } from '@/lib/ui-copy'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteError error={error} reset={reset} homeHref="/" homeLabel={sr.common.home} />
  )
}
