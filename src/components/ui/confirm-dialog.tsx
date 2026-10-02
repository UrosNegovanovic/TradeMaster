'use client'

import { AlertTriangle, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface ConfirmDialogOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
}

/**
 * Promise-based replacement for the native `window.confirm()`.
 * Renders a card styled the same way as the app's toast notifications
 * (see `app-toast.tsx`) instead of the browser's default confirm popup.
 */
export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  const {
    title,
    description,
    confirmLabel = 'Potvrdi',
    cancelLabel = 'Otkaži',
    variant = 'default',
  } = options

  return new Promise<boolean>((resolve) => {
    let settled = false
    const settle = (result: boolean, toastId: string | number) => {
      if (settled) return
      settled = true
      toast.dismiss(toastId)
      resolve(result)
    }

    const toastId = toast.custom(
      (id) => (
        <ConfirmToast
          title={title}
          description={description}
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          variant={variant}
          onResolve={(result) => settle(result, id)}
        />
      ),
      {
        duration: Infinity,
        unstyled: true,
        onDismiss: () => settle(false, toastId),
        onAutoClose: () => settle(false, toastId),
      }
    )
  })
}

interface ConfirmToastProps {
  title: string
  description?: string
  confirmLabel: string
  cancelLabel: string
  variant: 'default' | 'destructive'
  onResolve: (result: boolean) => void
}

function ConfirmToast({
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant,
  onResolve,
}: ConfirmToastProps) {
  const isDestructive = variant === 'destructive'

  return (
    <div className="pointer-events-auto w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border/80 bg-card shadow-[0_16px_40px_-18px_rgba(15,23,42,0.35)]">
      <div className="flex">
        <div className={cn('w-1 shrink-0', isDestructive ? 'bg-destructive' : 'bg-primary')} />
        <div className="flex min-w-0 flex-1 flex-col gap-3 px-3.5 py-3.5">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                isDestructive ? 'bg-red-50 text-destructive' : 'bg-secondary text-primary'
              )}
            >
              {isDestructive ? (
                <AlertTriangle className="h-4 w-4" strokeWidth={2.25} />
              ) : (
                <HelpCircle className="h-4 w-4" strokeWidth={2.25} />
              )}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold tracking-tight text-foreground">{title}</p>
              {description ? (
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
              ) : null}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onResolve(false)}>
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={isDestructive ? 'destructive' : 'default'}
              size="sm"
              onClick={() => onResolve(true)}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
