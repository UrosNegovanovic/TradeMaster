'use client'

import { Loader2, RefreshCw, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { sr } from '@/lib/ui-copy'

/**
 * Shown instead of an empty list when the first load failed (ROADMAP A9.5).
 * With `title` it is the whole page; without, it sits under the page's own header.
 */
export function LoadErrorState({
  title,
  onRetry,
  retrying = false,
}: {
  title?: string
  onRetry: () => void
  retrying?: boolean
}) {
  const card = (
    <Card role="alert">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <WifiOff className="h-10 w-10 text-muted-foreground" aria-hidden />
        <p className="font-medium">{sr.loadError.title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{sr.loadError.description}</p>
        <Button onClick={onRetry} disabled={retrying} className="min-h-11">
          {retrying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {sr.common.retry}
        </Button>
      </CardContent>
    </Card>
  )
  if (!title) return card
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title={title} />
      {card}
    </div>
  )
}
