import { cn } from '@/lib/utils'

type TradeMasterMarkProps = {
  className?: string
  title?: string
}

/** Circular TM mark from Figma: top bar, four stems, third stem longer. */
export function TradeMasterMark({
  className,
  title = 'TradeMaster',
}: TradeMasterMarkProps) {
  return (
    <svg
      viewBox="0 0 128 128"
      className={cn('shrink-0', className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <circle cx="64" cy="64" r="64" fill="currentColor" />
      <rect x="28" y="32" width="72" height="14" fill="#fff" />
      <rect x="28" y="32" width="12" height="52" fill="#fff" />
      <rect x="48" y="32" width="12" height="52" fill="#fff" />
      <rect x="68" y="32" width="12" height="64" fill="#fff" />
      <rect x="88" y="32" width="12" height="52" fill="#fff" />
    </svg>
  )
}
