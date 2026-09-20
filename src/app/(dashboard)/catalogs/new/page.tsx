'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { CatalogForm } from '@/components/catalogs/CatalogForm'
import { Product } from '@/types/product'
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

async function createCatalog(data: CatalogFormData) {
  const response = await fetch('/api/catalogs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create catalog')
  }

  return response.json()
}

export default function NewCatalogPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Fetch products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  // Create catalog mutation
  const createMutation = useMutation({
    mutationFn: createCatalog,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] })
      
      // Professional success toast
      notify.success('Catalog generated', {
        description: `Your professional PDF catalog "${data.title || 'Untitled'}" is ready.`,
        duration: 5000,
      })
      
      router.push('/catalogs')
    },
    onError: (error: Error) => {
      notify.error('Failed to create catalog', {
        description: error.message || 'An unexpected error occurred',
        duration: 5000,
      })
    },
  })

  const handleSubmit = async (data: CatalogFormData) => {
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
          <h1 className="text-3xl font-bold">New Catalog</h1>
          <p className="text-muted-foreground mt-2">
            Create a new product catalog
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
        <h1 className="text-3xl font-bold">New Catalog</h1>
        <p className="text-muted-foreground mt-2">
          Create a new product catalog with selected products and discounts
        </p>
      </div>

      <CatalogForm
        products={products}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending}
      />
    </div>
  )
}
