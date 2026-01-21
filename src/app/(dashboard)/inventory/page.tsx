'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { Product } from '@/types/product'
import { ProductForm } from '@/components/inventory/ProductForm'
import { ProductList } from '@/components/inventory/ProductList'
import { InventoryFilters } from '@/components/inventory/InventoryFilters'
import { ProductActionToast } from '@/components/inventory/ProductActionToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search } from 'lucide-react'
import { ProductFormData } from '@/lib/validations'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

async function fetchProducts(): Promise<Product[]> {
  const response = await fetch('/api/products')
  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }
  return response.json()
}

async function createProduct(data: ProductFormData): Promise<Product> {
  const response = await fetch('/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create product')
  }

  return response.json()
}

async function updateProduct(
  id: string,
  data: ProductFormData
): Promise<Product> {
  const response = await fetch(`/api/products/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update product')
  }

  return response.json()
}

async function deleteProduct(id: string): Promise<void> {
  const response = await fetch(`/api/products/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete product')
  }
}

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [scannedData, setScannedData] = useState<Partial<ProductFormData> | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Handle Quick Scan from Dashboard - automatically open form with pre-filled data
  useEffect(() => {
    const fromScan = searchParams.get('scan')
    if (fromScan === 'true') {
      const sku = searchParams.get('sku') || ''
      const name = searchParams.get('name') || ''
      const description = searchParams.get('description') || ''
      const imageUrl = searchParams.get('imageUrl') || ''
      
      setScannedData({
        sku,
        name,
        description,
        imageUrl,
        price: 0, // User must enter price manually
      })
      setIsFormOpen(true)
      
      // Clear URL params after reading (optional - keeps URL clean)
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/inventory')
      }
    }
  }, [searchParams])

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  // Filter products based on search query, category, and date
  const filteredProducts = useMemo(() => {
    let filtered = products

    // Filter by search query (name or SKU)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query)
      )
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((product) => product.categoryId === selectedCategory)
    }

    // Filter by date (only products created on selected date)
    if (selectedDate) {
      filtered = filtered.filter((product) => {
        const productDate = new Date(product.createdAt)
        const selectedDateOnly = new Date(selectedDate)
        
        // Compare only date parts (ignore time)
        return (
          productDate.getFullYear() === selectedDateOnly.getFullYear() &&
          productDate.getMonth() === selectedDateOnly.getMonth() &&
          productDate.getDate() === selectedDateOnly.getDate()
        )
      })
    }

    return filtered
  }, [products, searchQuery, selectedCategory, selectedDate])

  // Create product mutation (with inventory upsert support)
  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (response: Product & { action?: 'created' | 'updated'; quantityAdded?: number; previousQuantity?: number }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setIsFormOpen(false)
      setScannedData(null)
      
      // Check if this was an update (stock increment) or a new product creation
      if (response.action === 'updated') {
        // Show stock increment toast
        toast.custom((id) => (
          <ProductActionToast
            variant="scan"
            product={{
              name: response.name,
              sku: response.sku,
              imageUrl: response.imageUrl,
            }}
            onDismiss={() => toast.dismiss(id)}
          />
        ), {
          duration: 4000,
        })
        
        // Show additional info about stock update
        toast.success('Stock updated!', {
          description: `Added ${response.quantityAdded || 0} units. Total stock: ${response.quantity}`,
          duration: 4000,
        })
      } else {
        // Show product created toast (default)
        toast.custom((id) => (
          <ProductActionToast
            variant="create"
            product={{
              name: response.name,
              sku: response.sku,
              imageUrl: response.imageUrl,
            }}
            onDismiss={() => toast.dismiss(id)}
          />
        ), {
          duration: 4000,
        })
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to create product', {
        description: error.message || 'An error occurred while creating the product.',
      })
    },
  })

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductFormData }) =>
      updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setIsFormOpen(false)
      setEditingProduct(null)
      toast.success('Product updated successfully!')
    },
    onError: (error: Error) => {
      toast.error('Failed to update product', {
        description: error.message || 'An error occurred while updating the product.',
      })
    },
  })

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: ({ id, product }: { id: string; product: Product }) => deleteProduct(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setDeleteConfirm(null)
      
      // Show rich toast for deleted product
      toast.custom((id) => (
        <ProductActionToast
          variant="delete"
          product={{
            name: variables.product.name,
            sku: variables.product.sku,
            imageUrl: variables.product.imageUrl,
          }}
          onDismiss={() => toast.dismiss(id)}
        />
      ), {
        duration: 4000,
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to delete product', {
        description: error.message || 'An error occurred while deleting the product.',
      })
    },
  })

  const handleSubmit = async (data: ProductFormData) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setIsFormOpen(true)
  }

  const handleDelete = (productId: string) => {
    setDeleteConfirm(productId)
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      const product = products.find((p) => p.id === deleteConfirm)
      if (product) {
        deleteMutation.mutate({ id: deleteConfirm, product })
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading products...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground mt-2">
            Manage your product inventory
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <InventoryFilters
          selectedCategory={selectedCategory}
          selectedDate={selectedDate}
          onCategoryChange={setSelectedCategory}
          onDateChange={setSelectedDate}
        />
      </div>

      {/* Show empty state message for search results */}
      {searchQuery.trim() && filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No products found matching &quot;{searchQuery}&quot;
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Try adjusting your search terms.
          </p>
        </div>
      ) : (
        <ProductList
          products={filteredProducts}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isDeleting={deleteMutation.isPending ? deleteConfirm : null}
        />
      )}

      <ProductForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) {
            setEditingProduct(null)
            setScannedData(null)
          }
        }}
        onSubmit={handleSubmit}
        product={editingProduct}
        initialData={scannedData}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-4 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
