'use client'

import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export type AppToastVariant = 'success' | 'error' | 'info'

const variants: Record<
  AppToastVariant,
  {
    accent: string
    iconWrap: string
    Icon: typeof CheckCircle2
  }
> = {
  success: {
    accent: 'bg-emerald-600',
    iconWrap: 'bg-emerald-50 text-emerald-700',
    Icon: CheckCircle2,
  },
  error: {
    accent: 'bg-destructive',
    iconWrap: 'bg-red-50 text-destructive',
    Icon: AlertCircle,
  },
  info: {
    accent: 'bg-primary',
    iconWrap: 'bg-secondary text-primary',
    Icon: Info,
  },
}

interface AppToastProps {
  id: string | number
  variant: AppToastVariant
  title: string
  description?: string
}

export function showAppToast(
  variant: AppToastVariant,
  title: string,
  options: { description?: string; duration?: number; id?: string | number } = {}
) {
  const { description, duration, id } = options

  return toast.custom(
    (toastId) => (
      <AppToast
        id={toastId}
        variant={variant}
        title={title}
        description={description}
      />
    ),
    {
      id,
      duration: duration ?? (variant === 'error' ? 5600 : 4200),
      unstyled: true,
    }
  )
}

export function AppToast({ id, variant, title, description }: AppToastProps) {
  const { accent, iconWrap, Icon } = variants[variant]

  return (
    <div className="pointer-events-auto w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border/80 bg-card shadow-[0_16px_40px_-18px_rgba(15,23,42,0.35)]">
      <div className="flex">
        <div className={cn('w-1 shrink-0', accent)} />
        <div className="flex min-w-0 flex-1 items-start gap-3 px-3.5 py-3">
          <div
            className={cn(
              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              iconWrap
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-semibold tracking-tight text-foreground">{title}</p>
            {description ? (
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => toast.dismiss(id)}
            className="mt-0.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
