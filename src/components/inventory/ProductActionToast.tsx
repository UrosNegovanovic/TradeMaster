'use client'

import { CheckCircle2, ScanBarcode, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProductImage } from '@/components/shared/ProductImage'

interface ProductActionToastProps {
  variant: 'scan' | 'create' | 'delete'
  product: {
    name: string
    sku: string
    imageUrl?: string | null
  }
  onDismiss?: () => void
  customBadge?: string
  customSubBadge?: string
}

const variants = {
  scan: {
    icon: ScanBarcode,
    accent: 'bg-primary',
    iconWrap: 'bg-secondary text-primary',
    badge: 'Scanned',
  },
  create: {
    icon: CheckCircle2,
    accent: 'bg-emerald-600',
    iconWrap: 'bg-emerald-50 text-emerald-700',
    badge: 'Created',
  },
  delete: {
    icon: Trash2,
    accent: 'bg-destructive',
    iconWrap: 'bg-red-50 text-destructive',
    badge: 'Deleted',
  },
} as const

export function ProductActionToast({
  variant,
  product,
  onDismiss,
  customBadge,
  customSubBadge,
}: ProductActionToastProps) {
  const config = variants[variant]
  const Icon = config.icon

  return (
    <div className="pointer-events-auto w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border/80 bg-card shadow-[0_16px_40px_-18px_rgba(15,23,42,0.35)]">
      <div className="flex">
        <div className={cn('w-1 shrink-0', config.accent)} />
        <div className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-3">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            size={48}
            className="rounded-lg"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                  config.iconWrap
                )}
              >
                <Icon className="h-3 w-3" strokeWidth={2.25} />
                {customBadge || config.badge}
              </span>
              {customSubBadge ? (
                <span className="text-[10px] font-medium text-muted-foreground">
                  {customSubBadge}
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-sm font-semibold tracking-tight text-foreground">
              {product.name}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">SKU: {product.sku}</p>
          </div>

          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
