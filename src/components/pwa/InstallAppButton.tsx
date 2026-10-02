'use client'

import { CheckCircle2, Loader2, Smartphone } from 'lucide-react'
import { installButtonLabel } from '@/lib/pwa-install'
import type { InstallGuide, InstallStatus } from '@/lib/use-pwa-install'

type InstallAppButtonProps = {
  ios: boolean
  guide: InstallGuide | null
  status: InstallStatus
  onInstall: () => void
  className?: string
}

/** Install button plus the messages around it: the exact menu steps when the prompt is unavailable, and a confirmation. */
export function InstallAppButton({ ios, guide, status, onInstall, className }: InstallAppButtonProps) {
  return (
    <div className={className}>
      {guide === 'ios-guide' ? (
        <div
          role="status"
          className="mb-2 max-w-sm rounded-[12px] border border-neutral-200 bg-brand-surface px-3 py-2 text-[13px] leading-relaxed text-neutral-700"
        >
          <p className="font-medium text-neutral-900">Na iPhone-u</p>
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
      {guide === 'android-menu' ? (
        <div
          role="status"
          className="mb-2 max-w-sm rounded-[12px] border border-neutral-200 bg-brand-surface px-3 py-2 text-[13px] leading-relaxed text-neutral-700"
        >
          <p className="font-medium text-neutral-900">Na Androidu (Chrome)</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4">
            <li>
              Otvori meni <span className="font-medium">⋮</span> u gornjem desnom uglu
            </li>
            <li>
              Izaberi <span className="font-medium">Instaliraj aplikaciju</span>
            </li>
          </ol>
          <p className="mt-1 text-neutral-600">
            Ako vidiš samo „Dodaj na početni ekran“, to pravi prečicu, a ne aplikaciju. Osveži stranicu pa probaj ponovo.
          </p>
        </div>
      ) : null}
      {guide === 'open-chrome' ? (
        <p role="status" className="mb-2 max-w-sm text-[13px] leading-relaxed text-neutral-600">
          Otvori ovu stranicu u Chrome-u (Android) ili Safari-ju (iPhone) da bi mogao da instaliraš aplikaciju.
        </p>
      ) : null}
      {status === 'installing' ? (
        <p role="status" className="mb-2 flex max-w-sm items-start gap-2 text-[13px] leading-relaxed text-neutral-700">
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-brand" aria-hidden />
          Instalacija je počela. Za nekoliko sekundi TradeMaster se pojavljuje na početnom ekranu i u listi aplikacija.
        </p>
      ) : null}
      {status === 'installed' ? (
        <p role="status" className="mb-2 flex max-w-sm items-start gap-2 text-[13px] leading-relaxed text-neutral-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
          TradeMaster je instaliran. Otvori ga sa početnog ekrana.
        </p>
      ) : null}
      {status === 'installed' ? null : (
        <button
          type="button"
          onClick={onInstall}
          disabled={status === 'installing'}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-[15px] font-medium text-neutral-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
        >
          <Smartphone className="h-4 w-4 text-brand" aria-hidden />
          {installButtonLabel(ios)}
        </button>
      )}
    </div>
  )
}
