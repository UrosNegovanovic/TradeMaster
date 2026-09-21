'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || url.trim() === '') return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function isOptimizedHost(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith('.supabase.co')
  } catch {
    return false
  }
}

type ProductImageProps = {
  src: string | null | undefined
  alt: string
  size?: number
  className?: string
  imageClassName?: string
}

export function ProductImage({
  src,
  alt,
  size,
  className,
  imageClassName,
}: ProductImageProps) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  const valid = isValidImageUrl(src) && !failed
  const boxStyle = size ? { width: size, height: size } : undefined

  if (!valid) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md border bg-muted',
          !size && 'h-full w-full',
          className
        )}
        style={boxStyle}
        aria-hidden
      >
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-md border bg-muted',
        !size && 'h-full w-full',
        className
      )}
      style={boxStyle}
    >
      {isOptimizedHost(src!) ? (
        <Image
          src={src!}
          alt={alt}
          fill
          sizes={size ? `${size}px` : '(max-width: 768px) 50vw, 200px'}
          className={cn('object-contain', imageClassName)}
          onError={() => setFailed(true)}
        />
      ) : (
        // External CDNs (Open Food Facts, etc.) time out in the Next optimizer.
        // Native img with no-referrer loads them directly in the browser.
        <img
          src={src!}
          alt={alt}
          referrerPolicy="no-referrer"
          className={cn('absolute inset-0 h-full w-full object-contain', imageClassName)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}
