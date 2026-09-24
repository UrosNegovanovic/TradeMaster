'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const hideSelectors = ['#demo-player', '#zavrsi-cta']

export function LandingStickyCta() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const nodes = hideSelectors
      .map((selector) => document.querySelector(selector))
      .filter((node): node is Element => node instanceof Element)

    if (nodes.length === 0) return

    const visible = new Set<Element>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target)
          else visible.delete(entry.target)
        }
        setHidden(visible.size > 0)
      },
      { root: null, threshold: 0, rootMargin: '0px 0px -88px 0px' }
    )

    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  if (hidden) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-100 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
      <Button className="h-12 min-h-11 w-full rounded-full shadow-sm" size="lg" asChild>
        <Link href="/sign-up">
          Registruj se
          <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
      </Button>
    </div>
  )
}
