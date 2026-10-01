'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { sr } from '@/lib/ui-copy'

type RouteErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
  homeHref: '/' | '/dashboard'
  homeLabel: string
}

export function RouteError({ error, reset, homeHref, homeLabel }: RouteErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[400px] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardContent className="py-10 text-center">
          <h1 className="mb-2 text-xl font-bold">{sr.route.errorTitle}</h1>
          <p className="mb-6 text-muted-foreground">{sr.route.errorDescription}</p>
          <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Button className="min-h-11 w-full sm:w-auto" onClick={() => reset()}>
              {sr.common.retry}
            </Button>
            <Button variant="outline" className="min-h-11 w-full sm:w-auto" asChild>
              <Link href={homeHref}>{homeLabel}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
