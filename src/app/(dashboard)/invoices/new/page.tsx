'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { InvoiceForm } from '@/components/invoices/InvoiceForm'
import { Product } from '@/types/product'
import { InvoiceCreateInput } from '@/types/invoice'
import { Loader2 } from 'lucide-react'

async function fetchProducts(): Promise<Product[]> {
  const response = await fetch('/api/products')
  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }
  return response.json()
}

async function createInvoice(data: InvoiceCreateInput) {
  const response = await fetch('/api/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create invoice')
  }

  return response.json()
}

export default function NewInvoicePage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Fetch products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  // Create invoice mutation
  const createMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      router.push('/invoices')
      alert('Invoice created successfully!')
    },
    onError: (error: Error) => {
      alert(error.message || 'Failed to create invoice')
    },
  })

  const handleSubmit = async (data: InvoiceCreateInput) => {
    await createMutation.mutateAsync(data)
  }

  if (isLoadingProducts) {
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
          <h1 className="text-3xl font-bold">New Invoice</h1>
          <p className="text-muted-foreground mt-2">
            Create a new invoice
          </p>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            You need to add products to your inventory first.
          </p>
          <a href="/inventory" className="text-primary hover:underline">
            Go to Inventory
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">New Invoice</h1>
        <p className="text-muted-foreground mt-2">
          Create a new invoice with selected products
        </p>
      </div>

      <InvoiceForm
        products={products}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending}
      />
    </div>
  )
}
