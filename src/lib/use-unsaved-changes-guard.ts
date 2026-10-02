'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { internalNavigationTarget } from '@/lib/unsaved-changes'

/**
 * Warns before unsaved form changes are lost.
 * - Links inside the app (back link, cancel, tab bar, sidebar): intercepted with a confirm dialog,
 *   because the App Router has no route-change event to hook into.
 * - Refresh, closing the tab or an external link: the browser's own beforeunload prompt.
 * Not covered: the phone's system back gesture/button, which a web page cannot reliably intercept
 * (that is why every sub-page also has an explicit back link).
 * Saving navigates with router.push, which is not a link click, so a successful save is never blocked.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const router = useRouter()
  const asking = useRef(false)

  useEffect(() => {
    if (!dirty) return

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor) return

      const target = internalNavigationTarget(
        { href: anchor.href, target: anchor.target, hasDownload: anchor.hasAttribute('download') },
        window.location.href
      )
      if (!target) return

      // Capture phase: stop Next's Link handler before it navigates.
      event.preventDefault()
      event.stopPropagation()
      if (asking.current) return
      asking.current = true
      confirmDialog({
        title: 'Odbaciti nesačuvane izmene?',
        description: 'Ako napustite ovu stranicu, unete izmene će biti izgubljene.',
        confirmLabel: 'Napusti stranicu',
        cancelLabel: 'Ostani',
        variant: 'destructive',
      })
        .then((leave) => {
          if (leave) router.push(target)
        })
        .finally(() => {
          asking.current = false
        })
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [dirty, router])
}
