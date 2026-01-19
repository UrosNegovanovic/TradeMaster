'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertTriangle, ArrowDown, ArrowUp, Package, Plus, Minus, ChevronDown, ChevronRight } from 'lucide-react'
import { StockMovement, LowStockProduct, StockMovementCreateInput } from '@/types/warehouse'
import { Product } from '@/types/product'
import { StockInForm } from '@/components/warehouse/StockInForm'
import { StockOutForm } from '@/components/warehouse/StockOutForm'
import { MovementType } from '@prisma/client'
import { toast } from 'sonner'
import Image from 'next/image'

// Fetch products for the user
async function fetchProducts(): Promise<Product[]> {
  const response = await fetch('/api/products')
  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }
  return response.json()
}

// Fetch low stock products
async function fetchLowStockProducts(): Promise<LowStockProduct[]> {
  const response = await fetch('/api/warehouse/low-stock')
  if (!response.ok) {
    throw new Error('Failed to fetch low stock products')
  }
  return response.json()
}

// Fetch stock movements
async function fetchStockMovements(): Promise<StockMovement[]> {
  const response = await fetch('/api/stock-movements?limit=50')
  if (!response.ok) {
    throw new Error('Failed to fetch stock movements')
  }
  return response.json()
}

// Create stock movement
async function createStockMovement(data: StockMovementCreateInput): Promise<StockMovement> {
  const response = await fetch('/api/stock-movements', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create stock movement')
  }

  return response.json()
}

// Format date for display
function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export default function WarehousePage() {
  const queryClient = useQueryClient()
  const [stockInOpen, setStockInOpen] = useState(false)
  const [stockOutOpen, setStockOutOpen] = useState(false)
  const [lowStockOpen, setLowStockOpen] = useState(false)

  // Fetch data
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  const { data: lowStockProducts = [], isLoading: isLoadingLowStock } = useQuery({
    queryKey: ['lowStockProducts'],
    queryFn: fetchLowStockProducts,
  })

  const { data: stockMovements = [], isLoading: isLoadingMovements } = useQuery({
    queryKey: ['stockMovements'],
    queryFn: fetchStockMovements,
  })

  // Create stock movement mutation
  const createMovementMutation = useMutation({
    mutationFn: createStockMovement,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['lowStockProducts'] })
      
      const actionText = data.type === MovementType.IN ? 'added to' : 'removed from'
      toast.success('Stock movement registered', {
        description: `${data.quantity} units ${actionText} ${data.product.name}`,
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to register stock movement', {
        description: error.message,
      })
    },
  })

  const handleStockIn = async (data: any) => {
    await createMovementMutation.mutateAsync({
      ...data,
      type: MovementType.IN,
    })
  }

  const handleStockOut = async (data: any) => {
    await createMovementMutation.mutateAsync({
      ...data,
      type: MovementType.OUT,
    })
  }

  if (isLoadingProducts) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading warehouse data...</p>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Magacin (Warehouse)</h1>
          <p className="text-muted-foreground mt-2">
            Track stock movements and manage inventory levels
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>No Products Yet</CardTitle>
            <CardDescription>
              Add products to your inventory first to start tracking stock movements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/inventory">Go to Inventory</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Magacin (Warehouse)</h1>
        <p className="text-muted-foreground mt-2">
          Track stock movements and manage inventory levels
        </p>
      </div>

      {/* Low Stock Alerts - Collapsible */}
      {!isLoadingLowStock && lowStockProducts.length > 0 && (
        <Collapsible open={lowStockOpen} onOpenChange={setLowStockOpen}>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-80 transition-opacity">
              <AlertTitle className="mb-0">
                ⚠️ Low Stock Alerts ({lowStockProducts.length} {lowStockProducts.length === 1 ? 'product' : 'products'})
              </AlertTitle>
              {lowStockOpen ? (
                <ChevronDown className="h-5 w-5 transition-transform" />
              ) : (
                <ChevronRight className="h-5 w-5 transition-transform" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <AlertDescription className="mt-3">
                <p className="mb-3">
                  The following products have stock levels at or below the minimum threshold:
                </p>
                <div className="space-y-2">
                  {lowStockProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-2 bg-background rounded-md"
                    >
                      {product.imageUrl ? (
                        <div className="relative h-10 w-10 rounded-md overflow-hidden border flex-shrink-0">
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-md border flex items-center justify-center bg-muted flex-shrink-0">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {product.quantity} / {product.minStock} units
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {product.quantity === 0 ? 'Out of stock' : 'Low stock'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </CollapsibleContent>
          </Alert>
        </Collapsible>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => setStockInOpen(true)} className="flex-1 sm:flex-none">
          <Plus className="mr-2 h-4 w-4" />
          Register Stock In
        </Button>
        <Button
          onClick={() => setStockOutOpen(true)}
          variant="destructive"
          className="flex-1 sm:flex-none"
        >
          <Minus className="mr-2 h-4 w-4" />
          Register Stock Out
        </Button>
      </div>

      {/* Stock Movement History */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Movement History</CardTitle>
          <CardDescription>
            Latest 50 stock movements (purchases, sales, adjustments)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMovements ? (
            <p className="text-center py-8 text-muted-foreground">Loading movements...</p>
          ) : stockMovements.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 mb-3 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">
                No stock movements yet. Register your first stock in or out above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(movement.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{movement.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            SKU: {movement.product.sku}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {movement.type === MovementType.IN ? (
                          <Badge variant="default" className="bg-green-500">
                            <ArrowUp className="mr-1 h-3 w-3" />
                            IN
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <ArrowDown className="mr-1 h-3 w-3" />
                            OUT
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {movement.type === MovementType.IN ? '+' : '-'}
                        {movement.quantity}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {movement.reason}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock In Form */}
      <StockInForm
        open={stockInOpen}
        onOpenChange={setStockInOpen}
        products={products}
        onSubmit={handleStockIn}
        isLoading={createMovementMutation.isPending}
      />

      {/* Stock Out Form */}
      <StockOutForm
        open={stockOutOpen}
        onOpenChange={setStockOutOpen}
        products={products}
        onSubmit={handleStockOut}
        isLoading={createMovementMutation.isPending}
      />
    </div>
  )
}
