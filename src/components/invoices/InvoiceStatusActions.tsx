'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import { Check, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InvoiceStatus } from '@/types/invoice'
import { notify } from '@/lib/notify'
import { invoicesListHref, isPaidInvoiceStatus } from '@/lib/invoice-status'

async function patchInvoiceStatus(id: string, status: InvoiceStatus) {
  const response = await fetch(`/api/invoices/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update invoice' }))
    throw new Error(error.error || 'Failed to update invoice')
  }

  return response.json()
}

interface InvoiceStatusActionsProps {
  invoiceId: string
  status: InvoiceStatus | string
  size?: 'sm' | 'default'
  className?: string
}

export function InvoiceStatusActions({
  invoiceId,
  status,
  size = 'sm',
  className,
}: InvoiceStatusActionsProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const isPaid = isPaidInvoiceStatus(status)

  const mutation = useMutation({
    mutationFn: (nextStatus: InvoiceStatus) => patchInvoiceStatus(invoiceId, nextStatus),
    onSuccess: (updated, nextStatus) => {
      queryClient.setQueryData(['invoices'], (current: Array<{ id: string; status: string }> | undefined) => {
        if (!Array.isArray(current)) {
          return current
        }
        return current.map((invoice) =>
          invoice.id === invoiceId ? { ...invoice, ...updated, status: nextStatus } : invoice
        )
      })
      queryClient.setQueryData(['invoice', invoiceId], (current: Record<string, unknown> | undefined) =>
        current ? { ...current, ...updated, status: nextStatus } : current
      )
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] })
      queryClient.invalidateQueries({ queryKey: ['lowStockProducts'] })
      if (pathname === '/invoices') {
        router.push(invoicesListHref(nextStatus))
      } else {
        router.refresh()
      }

      if (nextStatus === InvoiceStatus.PAID) {
        notify.success('Faktura je plaćena', {
          description: 'Pomerena je u arhivu plaćenih i više se ne prikazuje na početnoj.',
        })
      } else {
        notify.success('Faktura je ponovo otvorena', {
          description: 'Vraćena je među otvorene fakture. Ponovo može da se menja.',
        })
      }
    },
    onError: (error: Error) => {
      notify.error('Status nije sačuvan', {
        description: error.message,
      })
    },
  })

  if (isPaid) {
    return (
      <Button
        type="button"
        variant="ghost"
        size={size}
        className={className}
        disabled={mutation.isPending}
        onClick={() => {
          const confirmed = window.confirm(
            'Vratiti plaćenu fakturu među otvorene? Posle toga mogu ponovo da se menjaju proizvodi i cene.'
          )
          if (!confirmed) {
            return
          }
          mutation.mutate(InvoiceStatus.UNPAID)
        }}
      >
        {mutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RotateCcw className="mr-2 h-4 w-4" />
        )}
        Vrati među otvorene
      </Button>
    )
  }

  return (
    <Button
      type="button"
      size={size}
      className={className}
      disabled={mutation.isPending}
      onClick={() => mutation.mutate(InvoiceStatus.PAID)}
    >
      {mutation.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Check className="mr-2 h-4 w-4" />
      )}
      Obeleži kao plaćeno
    </Button>
  )
}
