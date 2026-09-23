import Link from 'next/link'
import { cn } from '@/lib/utils'
import { brand } from '@/lib/brand'
import { TradeMasterMark } from './TradeMasterMark'

const sizes = {
  sm: {
    mark: 'h-7 w-7',
    name: 'text-base',
    tagline: 'text-[8px] tracking-[0.16em]',
    gap: 'gap-2',
  },
  md: {
    mark: 'h-8 w-8',
    name: 'text-lg',
    tagline: 'text-[9px] tracking-[0.18em]',
    gap: 'gap-2.5',
  },
  lg: {
    mark: 'h-11 w-11',
    name: 'text-2xl',
    tagline: 'text-[10px] tracking-[0.2em]',
    gap: 'gap-3',
  },
} as const

type TradeMasterWordmarkProps = {
  href?: string
  size?: keyof typeof sizes
  showTagline?: boolean
  className?: string
  taglineClassName?: string
  onClick?: () => void
}

export function TradeMasterWordmark({
  href = '/',
  size = 'md',
  showTagline = false,
  className,
  taglineClassName,
  onClick,
}: TradeMasterWordmarkProps) {
  const s = sizes[size]

  const content = (
    <>
      <TradeMasterMark className={cn('text-primary', s.mark)} />
      <span className="min-w-0 leading-none">
        <span className={cn('block font-bold text-primary', s.name)}>
          {brand.name}
        </span>
        {showTagline ? (
          <span
            className={cn(
              'mt-0.5 block font-medium uppercase text-muted-foreground',
              s.tagline,
              taglineClassName
            )}
          >
            {brand.tagline}
          </span>
        ) : null}
      </span>
    </>
  )

  const shared = cn('inline-flex min-w-0 items-center', s.gap, className)

  if (!href) {
    return <span className={shared}>{content}</span>
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(shared, 'hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md')}
    >
      {content}
    </Link>
  )
}
