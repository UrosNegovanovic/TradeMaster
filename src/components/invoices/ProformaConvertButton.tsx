'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { FileCheck2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { notify } from '@/lib/notify'
import { readApiErrorMessage } from '@/lib/api-error'
import { useAuthorizedFetch } from '@/lib/use-authorized-fetch'

type ProformaConvertButtonProps = {
  proformaId: string
  proformaNumber: string
  className?: string
}

/** Issues an invoice from the proforma; stock leaves the warehouse at that moment. */
export function ProformaConvertButton({ proformaId, proformaNumber, className }: ProformaConvertButtonProps) {
  const request = useAuthorizedFetch()
  const queryClient = useQueryClient()
  const router = useRouter()

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await request(`/api/invoices/${proformaId}/convert`, { method: 'POST' })
      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, 'Pretvaranje nije uspelo'))
      }
      return (await response.json()) as { id: string; invoiceNumber: string }
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice', proformaId] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] })
      queryClient.invalidateQueries({ queryKey: ['lowStockProducts'] })
      notify.success(`Izdata je faktura ${invoice.invoiceNumber}`, {
        description: 'Roba je skinuta sa magacina. Fakturu možete poslati kupcu.',
      })
      router.push(`/invoices/${invoice.id}`)
    },
    onError: (error: Error) => {
      notify.error('Pretvaranje nije uspelo', { description: error.message })
    },
  })

  return (
    <Button
      type="button"
      className={className}
      disabled={mutation.isPending}
      onClick={async () => {
        const confirmed = await confirmDialog({
          title: `Izdati fakturu iz predračuna ${proformaNumber}?`,
          description:
            'Faktura dobija novi broj, iste stavke i cene. Roba se tada skida sa magacina. Predračun se posle ne menja.',
          confirmLabel: 'Izdaj fakturu',
          cancelLabel: 'Otkaži',
        })
        if (confirmed) mutation.mutate()
      }}
    >
      {mutation.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileCheck2 className="mr-2 h-4 w-4" />
      )}
      Pretvori u fakturu
    </Button>
  )
}
