'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type BeforeInstallPromptEvent,
  type InstallClickKind,
  isAndroidDevice,
  isIosDevice,
  isStandaloneDisplay,
  resolveInstallClick,
  takeCapturedInstallPrompt,
} from '@/lib/pwa-install'

export type InstallGuide = Extract<InstallClickKind, 'ios-guide' | 'android-menu' | 'open-chrome'>
export type InstallStatus = 'idle' | 'installing' | 'installed'

function readInstalled() {
  return isStandaloneDisplay({
    displayModeStandalone: window.matchMedia('(display-mode: standalone)').matches,
    safariStandalone: (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
  })
}

/**
 * Install state for the PWA, shared by the landing page and the signed-in app.
 * Chrome's own prompt does the real install (WebAPK); when it is not available the hook falls back to a
 * guide that names the exact menu item, because "Dodaj na početni ekran" can create only a shortcut.
 */
export function usePwaInstall() {
  const [ready, setReady] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [ios, setIos] = useState(false)
  const [guide, setGuide] = useState<InstallGuide | null>(null)
  const [status, setStatus] = useState<InstallStatus>('idle')
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const userAgent = window.navigator.userAgent
    setInstalled(readInstalled())
    setIos(
      isIosDevice({
        userAgent,
        touchMac: userAgent.includes('Mac') && 'ontouchend' in document,
        hasMsStream: Boolean((window as Window & { MSStream?: unknown }).MSStream),
      })
    )
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
      setStatus('installed')
      setGuide(null)
      deferredRef.current = null
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (installed) return
    const userAgent = window.navigator.userAgent

    // Chrome can fire the prompt a moment after load: give it a short window before falling back to the guide.
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
      android: isAndroidDevice(userAgent),
      hasPrompt: Boolean(deferredRef.current),
    })

    if (kind === 'prompt') {
      const promptEvent = deferredRef.current
      if (!promptEvent) return
      await promptEvent.prompt()
      const { outcome } = await promptEvent.userChoice
      deferredRef.current = null
      setGuide(null)
      // Android finishes the install in the background; `appinstalled` confirms it.
      if (outcome === 'accepted') setStatus((current) => (current === 'installed' ? current : 'installing'))
      return
    }

    if (kind === 'ios-guide' || kind === 'android-menu' || kind === 'open-chrome') setGuide(kind)
  }, [installed, ios])

  return { ready, installed, ios, guide, status, install }
}
