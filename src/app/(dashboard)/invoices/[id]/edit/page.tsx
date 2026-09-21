'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
import { InvoiceForm } from '@/components/invoices/InvoiceForm'
import { InvoiceStatusActions } from '@/components/invoices/InvoiceStatusActions'
import { invoicesListHref, isPaidInvoiceStatus } from '@/lib/invoice-status'
import { Product } from '@/types/product'
import { InvoiceCreateInput } from '@/types/invoice'
import { Loader2 } from 'lucide-react'
import { notify } from '@/lib/notify'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

async function fetchProducts(): Promise<Product[]> {
  const response = await fetch('/api/products')
  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }
  return response.json()
}

async function fetchInvoice(id: string) {
  const response = await fetch(`/api/invoices/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch invoice')
  }
  return response.json()
}

async function updateInvoice(id: string, data: InvoiceCreateInput) {
  const response = await fetch(`/api/invoices/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update invoice')
  }

  return response.json()
}

export default function EditInvoicePage() {
  const router = useRouter()
  const params = useParams()
  const queryClient = useQueryClient()
  const invoiceId = params.id as string

  // Fetch products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  // Fetch invoice data
  const { data: invoice, isLoading: isLoadingInvoice } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => fetchInvoice(invoiceId),
  })

  // Update invoice mutation
  const updateMutation = useMutation({
    mutationFn: (data: InvoiceCreateInput) => updateInvoice(invoiceId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      
      notify.success('Invoice updated', {
        description: `Invoice #${data.invoiceNumber} has been saved.`,
        duration: 5000,
      })
      
      router.push('/invoices')
    },
    onError: (error: Error) => {
      notify.error('Failed to update invoice', {
        description: error.message || 'An unexpected error occurred',
        duration: 5000,
      })
    },
  })

  const handleSubmit = async (data: InvoiceCreateInput) => {
    await updateMutation.mutateAsync(data)
  }

  if (isLoadingProducts || isLoadingInvoice) {
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
          <h1 className="text-3xl font-bold">Edit Invoice</h1>
          <p className="text-muted-foreground mt-2">
            Update invoice details
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

  if (!invoice) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Invoice Not Found</h1>
          <p className="text-muted-foreground mt-2">
            The invoice you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
        <a href="/invoices" className="text-primary hover:underline">
          Back to Invoices
        </a>
      </div>
    )
  }

  if (isPaidInvoiceStatus(invoice.status)) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href={invoicesListHref(invoice.status)}>Nazad na plaćene</Link>
          </Button>
          <h1 className="text-3xl font-bold mt-4">Faktura je zaključana</h1>
          <p className="text-muted-foreground mt-2">
            Plaćena faktura #{invoice.invoiceNumber} ne može da se menja.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Proizvodi i cene su zaključani</CardTitle>
            <CardDescription>
              Da biste menjali stavke, prvo vratite fakturu među otvorene.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <InvoiceStatusActions invoiceId={invoice.id} status={invoice.status} size="default" />
            <Button variant="outline" asChild>
              <Link href={`/invoices/${invoice.id}`}>Otvori fakturu</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Invoice</h1>
        <p className="text-muted-foreground mt-2">
          Update invoice #{invoice.invoiceNumber}
        </p>
      </div>

      <InvoiceForm
        products={products}
        onSubmit={handleSubmit}
        isLoading={updateMutation.isPending}
        initialData={invoice}
      />
    </div>
  )
}
