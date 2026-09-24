'use client'

import { useEffect, useState } from 'react'
import { Smartphone } from 'lucide-react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone() {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  const safari = window.navigator as Navigator & { standalone?: boolean }
  return safari.standalone === true
}

function isIosSafari() {
  const ua = window.navigator.userAgent
  const ios = /iPad|iPhone|iPod/.test(ua)
  const touchMac = ua.includes('Mac') && 'ontouchend' in document
  return (ios || touchMac) && !(window as Window & { MSStream?: unknown }).MSStream
}

export function LandingInstall() {
  const [ready, setReady] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [ios, setIos] = useState(false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [help, setHelp] = useState(false)

  useEffect(() => {
    setInstalled(isStandalone())
    setIos(isIosSafari())
    setReady(true)

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' })
    }

    function onPrompt(event: Event) {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }

    function onInstalled() {
      setInstalled(true)
      setHelp(false)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!ready || installed) return null

  async function onAdd() {
    if (deferred) {
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setDeferred(null)
      return
    }
    setHelp((open) => !open)
  }

  return (
    <div className="mt-4 lg:hidden">
      <button
        type="button"
        onClick={() => void onAdd()}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-[15px] font-medium text-neutral-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Smartphone className="h-4 w-4 text-brand" aria-hidden />
        Dodaj na početni ekran
      </button>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-neutral-600">
        Ista veb-aplikacija kao prečica na telefonu. Nema App Store, Play ni APK.
      </p>
      {help ? (
        <p className="mt-2 max-w-sm rounded-[12px] border border-neutral-200 bg-brand-surface px-3 py-2 text-[13px] leading-relaxed text-neutral-700">
          {ios
            ? 'Na iPhone: tapni Podeli (kvadrat sa strelicom), pa „Dodaj na početni ekran“.'
            : 'U meniju pregledača (⋮) izaberi „Dodaj na početni ekran“ ili „Install app“.'}
        </p>
      ) : null}
    </div>
  )
}
