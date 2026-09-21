'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

const SHOW_AFTER_PX = 360

function findDashboardScroller(): HTMLElement | null {
  return document.querySelector('main.overflow-y-auto')
}

export function BackToTop() {
  const [visible, setVisible] = useState(false)
  const [scroller, setScroller] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const element = findDashboardScroller()
    if (!element) {
      return
    }

    setScroller(element)

    const onScroll = () => {
      setVisible(element.scrollTop > SHOW_AFTER_PX)
    }

    onScroll()
    element.addEventListener('scroll', onScroll, { passive: true })
    return () => element.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) {
    return null
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      className="fixed z-40 left-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] shadow-md lg:left-auto lg:right-6 lg:bottom-6"
      aria-label="Na vrh"
      onClick={() => {
        scroller?.scrollTo({ top: 0, behavior: 'smooth' })
      }}
    >
      <ArrowUp className="h-4 w-4" />
    </Button>
  )
}
