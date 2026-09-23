'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { AlertTriangle, Package, Minus, ChevronDown, ChevronRight } from 'lucide-react'
import { StockMovement, LowStockProduct, StockMovementCreateInput } from '@/types/warehouse'
import { Product } from '@/types/product'
import { StockOutForm } from '@/components/warehouse/StockOutForm'
import { CurrentStockTable } from '@/components/warehouse/CurrentStockTable'
import { StockMovementHistory } from '@/components/warehouse/StockMovementHistory'
import { MovementType } from '@prisma/client'
import { notify } from '@/lib/notify'
import { ProductImage } from '@/components/shared/ProductImage'
import { PageHeader } from '@/components/layout/PageHeader'

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

type StockMovementList = {
  movements: StockMovement[]
  totalCount: number
}

// Fetch stock movements
async function fetchStockMovements(): Promise<StockMovementList> {
  const response = await fetch('/api/stock-movements?limit=50')
  if (!response.ok) {
    throw new Error('Failed to fetch stock movements')
  }
  const movements: StockMovement[] = await response.json()
  const headerCount = Number(response.headers.get('X-Total-Count'))
  return {
    movements,
    totalCount: Number.isFinite(headerCount) ? headerCount : movements.length,
  }
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

export default function WarehousePage() {
  const queryClient = useQueryClient()
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

  const { data: movementList, isLoading: isLoadingMovements } = useQuery({
    queryKey: ['stockMovements'],
    queryFn: fetchStockMovements,
  })
  const stockMovements = movementList?.movements ?? []
  const movementTotalCount = movementList?.totalCount ?? stockMovements.length

  // Create stock movement mutation (OUT only - IN is handled by Scanner)
  const createMovementMutation = useMutation({
    mutationFn: createStockMovement,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['lowStockProducts'] })
      
      notify.success('Izlaz je zabeležen', {
        description: `${data.quantity} kom uklonjeno sa ${data.product.name}`,
      })
    },
    onError: (error: Error) => {
      notify.error('Izlaz nije sačuvan', {
        description: error.message,
      })
    },
  })

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
        <PageHeader
          title="Magacin"
          description="Pratite stanje i kretanje robe"
        />
        <Card>
          <CardHeader>
            <CardTitle>Još nema proizvoda</CardTitle>
            <CardDescription>
              Prvo dodajte asortiman da biste pratili promet u magacinu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/inventory">Idi na asortiman</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Magacin"
        description="Pratite stanje i kretanje robe"
        action={
          <Button
            onClick={() => setStockOutOpen(true)}
            variant="destructive"
            className="w-full sm:w-auto"
          >
            <Minus className="mr-2 h-4 w-4" />
            Izlaz / korekcija
          </Button>
        }
      />

      {/* Low Stock Alerts - Collapsible */}
      {!isLoadingLowStock && lowStockProducts.length > 0 && (
        <Collapsible open={lowStockOpen} onOpenChange={setLowStockOpen}>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <CollapsibleTrigger className="flex w-full items-center justify-between hover:opacity-80 transition-opacity">
              <AlertTitle className="mb-0">
                Nizak lager ({lowStockProducts.length} {lowStockProducts.length === 1 ? 'proizvod' : 'proizvoda'})
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
                  Ovi proizvodi su na ili ispod minimalnog stanja:
                </p>
                <div className="space-y-2">
                  {lowStockProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-2 bg-background rounded-md"
                    >
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        size={40}
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {product.quantity} / {product.minStock} kom
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {product.quantity === 0 ? 'Nema na stanju' : 'Nizak lager'}
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

      <p className="text-sm text-muted-foreground">
        Ulaz u lager ide skeniranjem. Ovde evidencirate izlaz.
      </p>

      {/* Current Inventory Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            Trenutno stanje
          </CardTitle>
          <CardDescription>
            Pregled proizvoda i količina
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CurrentStockTable products={products} />
        </CardContent>
      </Card>

      {/* Stock Movement History */}
      <Card>
        <CardHeader>
          <CardTitle>Istorija kretanja</CardTitle>
          <CardDescription>
            Prvih 10 ulaza i izlaza
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StockMovementHistory
            movements={stockMovements}
            totalCount={movementTotalCount}
            isLoading={isLoadingMovements}
          />
        </CardContent>
      </Card>

      {/* Stock Out / Movement Form */}
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
