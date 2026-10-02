'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { InvoiceForm } from '@/components/invoices/InvoiceForm'
import { FirstRunEmptyState } from '@/components/onboarding/FirstRunEmptyState'
import { Product } from '@/types/product'
import type { Client } from '@/types/client'
import { InvoiceCreateInput } from '@/types/invoice'
import { Loader2 } from 'lucide-react'
import { notify } from '@/lib/notify'
import { readApiErrorMessage } from '@/lib/api-error'
import { useAuthorizedFetch } from '@/lib/use-authorized-fetch'
import type { SessionFetch } from '@/lib/authorized-fetch'

async function fetchProducts(): Promise<Product[]> {
  const response = await fetch('/api/products')
  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }
  return response.json()
}

async function fetchProfile(): Promise<{ inVatSystem?: boolean }> {
  const response = await fetch('/api/profile')
  if (!response.ok) {
    throw new Error('Failed to fetch profile')
  }
  return response.json()
}

async function createInvoice(data: InvoiceCreateInput, request: SessionFetch) {
  const response = await request('/api/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, 'Failed to create invoice'))
  }

  return response.json()
}

export default function NewInvoicePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const request = useAuthorizedFetch()

  // Fetch products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  // Saved buyers are optional: a failed fetch just hides the picker.
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients')
      if (!response.ok) throw new Error('Failed to fetch clients')
      return response.json()
    },
  })

  // The PDV setting decides which line fields the form shows
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  })

  // Create invoice mutation
  const createMutation = useMutation({
    mutationFn: (data: InvoiceCreateInput) => createInvoice(data, request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] })
      queryClient.invalidateQueries({ queryKey: ['lowStockProducts'] })
      
      // Professional success toast
      notify.success('Invoice created', {
        description: `Invoice #${data.invoiceNumber || 'N/A'} has been saved.`,
        duration: 5000,
      })
      
      router.push('/invoices')
    },
    onError: (error: Error) => {
      notify.error('Failed to create invoice', {
        description: error.message || 'An unexpected error occurred',
        duration: 5000,
      })
    },
  })

  const handleSubmit = async (data: InvoiceCreateInput) => {
    await createMutation.mutateAsync(data)
  }

  if (isLoadingProducts || isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold lg:text-3xl">Nova faktura</h1>
        </div>
        <FirstRunEmptyState kind="invoice" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold lg:text-3xl">New Invoice</h1>
        <p className="text-muted-foreground mt-2">
          Create a new invoice with selected products
        </p>
      </div>

      <InvoiceForm
        products={products}
        clients={clients}
        inVatSystem={profile?.inVatSystem === true}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending}
      />
    </div>
  )
}
