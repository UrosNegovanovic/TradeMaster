'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { CatalogForm } from '@/components/catalogs/CatalogForm'
import { Product } from '@/types/product'
import { CatalogWithItems } from '@/types/catalog'
import { CatalogFormData } from '@/lib/validations'
import { Loader2 } from 'lucide-react'
import { notify } from '@/lib/notify'

async function fetchProducts(): Promise<Product[]> {
  const response = await fetch('/api/products')
  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }
  return response.json()
}

async function fetchCatalog(id: string): Promise<CatalogWithItems> {
  const response = await fetch(`/api/catalogs/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch catalog')
  }
  return response.json()
}

async function updateCatalog(id: string, data: CatalogFormData) {
  const response = await fetch(`/api/catalogs/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update catalog')
  }

  return response.json()
}

export default function EditCatalogPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Fetch products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  // Fetch catalog
  const { data: catalog, isLoading: isLoadingCatalog } = useQuery({
    queryKey: ['catalog', params.id],
    queryFn: () => fetchCatalog(params.id),
  })

  // Update catalog mutation
  const updateMutation = useMutation({
    mutationFn: (data: CatalogFormData) => updateCatalog(params.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] })
      queryClient.invalidateQueries({ queryKey: ['catalog', params.id] })
      router.push('/catalogs')
      notify.success('Catalog updated', {
        description: 'Your catalog changes have been saved.',
      })
    },
    onError: (error: Error) => {
      notify.error('Failed to update catalog', {
        description: error.message || 'Please try again.',
      })
    },
  })

  const handleSubmit = async (data: CatalogFormData) => {
    await updateMutation.mutateAsync(data)
  }

  // Memoize initialData to prevent unnecessary re-renders
  // MUST be called before any early returns (React hooks rule)
  const initialData = useMemo<{
    name: string
    clientName: string | null
    discount: number
    notes: string | null
    productIds: string[]
  } | undefined>(
    () => {
      if (!catalog) return undefined
      
      return {
        name: catalog.name,
        clientName: catalog.clientName,
        discount: Number(catalog.discount),
        notes: catalog.notes,
        productIds: catalog.items?.map((item) => item.productId) || [],
      }
    },
    // Use catalog.id and stringified productIds for stable comparison
    [
      catalog?.id,
      catalog?.name,
      catalog?.clientName,
      catalog?.discount,
      catalog?.notes,
      catalog?.items?.map((item) => item.productId).join(',') || '',
    ]
  )

  if (isLoadingProducts || isLoadingCatalog) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!catalog) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Catalog not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Catalog</h1>
        <p className="text-muted-foreground mt-2">
          Update catalog information and products
        </p>
      </div>

      <CatalogForm
        products={products}
        onSubmit={handleSubmit}
        isLoading={updateMutation.isPending}
        initialData={initialData}
      />
    </div>
  )
}
