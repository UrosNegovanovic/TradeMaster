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
import { readApiErrorMessage } from '@/lib/api-error'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { BackLink } from '@/components/layout/BackLink'
import { useAuthorizedFetch } from '@/lib/use-authorized-fetch'
import type { SessionFetch } from '@/lib/authorized-fetch'

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

async function updateInvoice(id: string, data: InvoiceCreateInput, request: SessionFetch) {
  const response = await request(`/api/invoices/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, 'Failed to update invoice'))
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

export default function EditInvoicePage() {
  const router = useRouter()
  const params = useParams()
  const queryClient = useQueryClient()
  const invoiceId = params.id as string
  const request = useAuthorizedFetch()

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

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  })

  // Update invoice mutation
  const updateMutation = useMutation({
    mutationFn: (data: InvoiceCreateInput) => updateInvoice(invoiceId, data, request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] })
      queryClient.invalidateQueries({ queryKey: ['lowStockProducts'] })
      
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

  if (isLoadingProducts || isLoadingInvoice || isLoadingProfile) {
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
          <BackLink href={`/invoices/${invoiceId}`}>Nazad na fakturu</BackLink>
          <h1 className="text-2xl font-bold lg:text-3xl">Izmena fakture</h1>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            Prvo dodajte proizvode u asortiman.
          </p>
          <a href="/inventory" className="text-primary hover:underline">
            Otvori asortiman
          </a>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <BackLink href="/invoices">Nazad na fakture</BackLink>
          <h1 className="text-2xl font-bold lg:text-3xl">Faktura nije pronađena</h1>
          <p className="text-muted-foreground mt-2">
            Faktura koju tražite ne postoji.
          </p>
        </div>
      </div>
    )
  }

  if (isPaidInvoiceStatus(invoice.status)) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <BackLink href={invoicesListHref(invoice.status)}>Nazad na plaćene</BackLink>
          <h1 className="text-2xl font-bold lg:text-3xl">Faktura je zaključana</h1>
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
        <BackLink href={`/invoices/${invoice.id}`}>Nazad na fakturu</BackLink>
        <h1 className="text-2xl font-bold lg:text-3xl">Izmena fakture</h1>
        <p className="text-muted-foreground mt-2">
          Faktura #{invoice.invoiceNumber}
        </p>
      </div>

      <InvoiceForm
        products={products}
        inVatSystem={profile?.inVatSystem === true}
        onSubmit={handleSubmit}
        isLoading={updateMutation.isPending}
        initialData={invoice}
        cancelHref={`/invoices/${invoice.id}`}
      />
    </div>
  )
}
