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
import { AlertTriangle, ArrowDown, ArrowUp, Package, Minus, ChevronDown, ChevronRight } from 'lucide-react'
import { StockMovement, LowStockProduct, StockMovementCreateInput } from '@/types/warehouse'
import { Product } from '@/types/product'
import { StockOutForm } from '@/components/warehouse/StockOutForm'
import { CurrentStockTable } from '@/components/warehouse/CurrentStockTable'
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
            Poslednjih 50 ulaza i izlaza
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMovements ? (
            <p className="text-center py-8 text-muted-foreground">Loading movements...</p>
          ) : stockMovements.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 mb-3 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">
                No stock movements yet. Use the Inventory Scanner to add products, or register stock out movements above.
              </p>
            </div>
          ) : (
            <div>
              <ul className="space-y-2 lg:hidden">
                {stockMovements.map((movement) => (
                  <li
                    key={movement.id}
                    className="flex items-start gap-3 rounded-xl border p-3"
                  >
                    {movement.type === MovementType.IN ? (
                      <Badge variant="default" className="mt-0.5 bg-green-600">
                        <ArrowUp className="mr-1 h-3 w-3" />
                        UL
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="mt-0.5">
                        <ArrowDown className="mr-1 h-3 w-3" />
                        IZ
                      </Badge>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-medium leading-tight">
                        {movement.product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {movement.product.sku} · {formatDate(movement.createdAt)}
                      </p>
                      {movement.reason ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {movement.reason}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 font-semibold">
                      {movement.type === MovementType.IN ? '+' : '-'}
                      {movement.quantity}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Proizvod</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead className="text-right">Količina</TableHead>
                    <TableHead>Razlog</TableHead>
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
            </div>
          )}
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
