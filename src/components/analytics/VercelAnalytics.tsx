import Script from 'next/script'
import { isAnalyticsEnabled } from '@/lib/analytics'

/** Page views and custom events through Vercel Analytics; renders nothing unless NEXT_PUBLIC_ANALYTICS=on. */
export function VercelAnalytics() {
  if (!isAnalyticsEnabled()) return null

  return (
    <>
      <Script id="tm-va-queue" strategy="afterInteractive">
        {'window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };'}
      </Script>
      <Script id="tm-va" src="/_vercel/insights/script.js" strategy="afterInteractive" />
    </>
  )
}
