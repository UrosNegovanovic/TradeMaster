'use client'

import { useEffect, useRef, useState } from 'react'
import { Smartphone } from 'lucide-react'
import {
  type BeforeInstallPromptEvent,
  isIosDevice,
  isStandaloneDisplay,
  resolveInstallClick,
  takeCapturedInstallPrompt,
} from '@/lib/pwa-install'

function readInstalled() {
  return isStandaloneDisplay({
    displayModeStandalone: window.matchMedia('(display-mode: standalone)').matches,
    safariStandalone: (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
  })
}

function readIos() {
  return isIosDevice({
    userAgent: window.navigator.userAgent,
    touchMac: window.navigator.userAgent.includes('Mac') && 'ontouchend' in document,
    hasMsStream: Boolean((window as Window & { MSStream?: unknown }).MSStream),
  })
}

export function LandingInstall() {
  const [ready, setReady] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [ios, setIos] = useState(false)
  const [sheet, setSheet] = useState<'ios-guide' | 'open-chrome' | null>(null)
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    setInstalled(readInstalled())
    setIos(readIos())
    deferredRef.current = takeCapturedInstallPrompt()
    setReady(true)

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' })
    }

    function onPrompt(event: Event) {
      event.preventDefault()
      deferredRef.current = event as BeforeInstallPromptEvent
    }

    function onInstalled() {
      setInstalled(true)
      setSheet(null)
      deferredRef.current = null
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function onAdd() {
    if (installed) return

    if (!ios && !deferredRef.current) {
      await new Promise<void>((resolve) => {
        const timer = window.setTimeout(finish, 400)
        function onPrompt(event: Event) {
          event.preventDefault()
          deferredRef.current = event as BeforeInstallPromptEvent
          finish()
        }
        function finish() {
          window.clearTimeout(timer)
          window.removeEventListener('beforeinstallprompt', onPrompt)
          resolve()
        }
        window.addEventListener('beforeinstallprompt', onPrompt)
      })
    }

    const kind = resolveInstallClick({
      installed,
      ios,
      hasPrompt: Boolean(deferredRef.current),
    })

    if (kind === 'prompt') {
      const promptEvent = deferredRef.current
      if (!promptEvent) return
      await promptEvent.prompt()
      const { outcome } = await promptEvent.userChoice
      if (outcome === 'accepted') setInstalled(true)
      deferredRef.current = null
      setSheet(null)
      return
    }

    if (kind === 'ios-guide' || kind === 'open-chrome') setSheet(kind)
  }

  if (!ready) return null

  if (installed) {
    return (
      <p className="mt-4 text-[14px] text-neutral-600 lg:hidden">Već je na početnom ekranu.</p>
    )
  }

  return (
    <div className="mt-4 lg:hidden">
      {sheet === 'ios-guide' ? (
        <div
          role="status"
          className="mb-2 max-w-sm rounded-[12px] border border-neutral-200 bg-brand-surface px-3 py-2 text-[13px] leading-relaxed text-neutral-700"
        >
          <p className="font-medium text-neutral-900">Na iPhone</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4">
            <li>
              Tapni <span className="font-medium">Podeli</span> (kvadrat sa strelicom)
            </li>
            <li>
              Izaberi <span className="font-medium">Dodaj na početni ekran</span>
            </li>
          </ol>
        </div>
      ) : null}
      {sheet === 'open-chrome' ? (
        <p role="status" className="mb-2 max-w-sm text-[13px] leading-relaxed text-neutral-600">
          Otvori ovu stranicu u Chrome-u na telefonu.
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void onAdd()}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-[15px] font-medium text-neutral-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Smartphone className="h-4 w-4 text-brand" aria-hidden />
        Dodaj na početni ekran
      </button>
    </div>
  )
}
