'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InstallAppButton } from '@/components/pwa/InstallAppButton'
import { usePwaInstall } from '@/lib/use-pwa-install'

const DISMISS_KEY = 'tm:pwa-install-dismissed'

/** Mobile-only hint on the dashboard: shown until the app is installed or the user says "Ne sada". */
export function InstallAppCard() {
  const { ready, installed, ios, guide, status, install } = usePwaInstall()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  // Keep the card on screen after installing so the confirmation message stays visible.
  if (!ready || dismissed || (installed && status !== 'installed')) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Private mode: the card simply comes back next visit.
    }
  }

  return (
    <Card className="lg:hidden">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">Instaliraj TradeMaster na telefon</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Otvara se kao prava aplikacija, preko celog ekrana, sa ikonicom na početnom ekranu.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="-mr-2 -mt-2 h-11 w-11 shrink-0"
            onClick={dismiss}
            aria-label="Sakrij"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <InstallAppButton ios={ios} guide={guide} status={status} onInstall={() => void install()} />
        {status === 'idle' ? (
          <button type="button" onClick={dismiss} className="text-sm text-muted-foreground underline underline-offset-2">
            Ne sada
          </button>
        ) : null}
      </CardContent>
    </Card>
  )
}
