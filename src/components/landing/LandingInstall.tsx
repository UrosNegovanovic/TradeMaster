'use client'

import { InstallAppButton } from '@/components/pwa/InstallAppButton'
import { usePwaInstall } from '@/lib/use-pwa-install'

export function LandingInstall() {
  const { ready, installed, ios, guide, status, install } = usePwaInstall()

  if (!ready) return null

  if (installed && status !== 'installed') {
    return (
      <p className="mt-4 text-[14px] text-neutral-600 lg:hidden">Već je na početnom ekranu.</p>
    )
  }

  return (
    <InstallAppButton
      className="mt-4 lg:hidden"
      ios={ios}
      guide={guide}
      status={status}
      onInstall={() => void install()}
    />
  )
}
