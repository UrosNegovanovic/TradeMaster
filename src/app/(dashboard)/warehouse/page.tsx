'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LoadErrorState } from '@/components/layout/LoadErrorState'
import { failedBeforeFirstLoad } from '@/lib/query-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { AlertTriangle, FileSpreadsheet, Minus, Package, Plus, Upload, ChevronDown, ChevronRight } from 'lucide-react'
import { StockMovement, LowStockProduct, StockMovementCreateInput } from '@/types/warehouse'
import { Product } from '@/types/product'
import { StockInForm, type StockInFormData } from '@/components/warehouse/StockInForm'
import { StockOutForm } from '@/components/warehouse/StockOutForm'
import { AssortmentImportDialog } from '@/components/warehouse/AssortmentImportDialog'
import { StockAdjustImportDialog } from '@/components/warehouse/StockAdjustImportDialog'
import { CurrentStockTable } from '@/components/warehouse/CurrentStockTable'
import { StockMovementHistory } from '@/components/warehouse/StockMovementHistory'
import { MovementType } from '@prisma/client'
import { notify } from '@/lib/notify'
import { ProductImage } from '@/components/shared/ProductImage'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthorizedFetch } from '@/lib/use-authorized-fetch'
import type { SessionFetch } from '@/lib/authorized-fetch'
import { readApiErrorMessage } from '@/lib/api-error'
import { sr } from '@/lib/ui-copy'

async function fetchProducts(): Promise<Product[]> {
  const response = await fetch('/api/products')
  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }
  return response.json()
}

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

async function createStockMovement(data: StockMovementCreateInput, request: SessionFetch): Promise<StockMovement> {
  const response = await request('/api/stock-movements', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, 'Kretanje nije sačuvano.'))
  }

  return response.json()
}

export default function WarehousePage() {
  const queryClient = useQueryClient()
  const request = useAuthorizedFetch()
  const [stockInOpen, setStockInOpen] = useState(false)
  const [stockOutOpen, setStockOutOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [lowStockOpen, setLowStockOpen] = useState(false)

  const { data: products = [], isLoading: isLoadingProducts, isError: loadFailed, dataUpdatedAt: loadedAt, refetch: reload, isFetching: reloading } = useQuery({
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

  const invalidateStock = () => {
    queryClient.invalidateQueries({ queryKey: ['stockMovements'] })
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['lowStockProducts'] })
  }

  const createMovementMutation = useMutation({
    mutationFn: (data: StockMovementCreateInput) => createStockMovement(data, request),
    onSuccess: (data) => {
      invalidateStock()
      const isOut = data.type === MovementType.OUT
      notify.success(isOut ? 'Izlaz je zabeležen' : 'Ulaz je zabeležen', {
        description: isOut
          ? `${data.quantity} kom uklonjeno sa ${data.product.name}`
          : `${data.quantity} kom dodato na ${data.product.name}`,
      })
    },
    onError: (error: Error) => {
      notify.error('Kretanje nije sačuvano', {
        description: error.message,
      })
    },
  })

  const handleStockOut = async (data: { productId: string; quantity: number; reason: string }) => {
    await createMovementMutation.mutateAsync({
      ...data,
      type: MovementType.OUT,
    })
  }

  const handleStockIn = async (data: StockInFormData) => {
    await createMovementMutation.mutateAsync({
      productId: data.productId,
      quantity: data.quantity,
      reason: data.reason,
      type: MovementType.IN,
      ...(data.costPrice !== undefined && data.costPrice !== null
        ? { costPrice: data.costPrice, costPriceZeroReason: data.costPriceZeroReason }
        : {}),
    })
  }

  const importActions = (
    <>
      <Button
        onClick={() => setImportOpen(true)}
        variant="outline"
        className="w-full sm:w-auto"
      >
        <Upload className="mr-2 h-4 w-4" />
        Uvezi iz CSV/Excel
      </Button>
      <Button
        onClick={() => setAdjustOpen(true)}
        variant="outline"
        className="w-full sm:w-auto"
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Ažuriraj stanje
      </Button>
    </>
  )

  const dialogs = (
    <>
      <AssortmentImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onCompleted={invalidateStock}
      />
      <StockAdjustImportDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        onCompleted={invalidateStock}
      />
    </>
  )

  if (isLoadingProducts) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Učitavanje magacina…</p>
      </div>
    )
  }

  if (failedBeforeFirstLoad({ isError: loadFailed, dataUpdatedAt: loadedAt })) {
    return <LoadErrorState title="Magacin" onRetry={() => reload()} retrying={reloading} />
  }

  if (products.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Magacin"
          description={sr.pages.warehouse}
          action={importActions}
        />
        <Card>
          <CardHeader>
            <CardTitle>Još nema proizvoda</CardTitle>
            <CardDescription>
              Uvezite asortiman iz CSV/Excel fajla ili dodajte proizvode ručno.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Uvezi iz CSV/Excel
            </Button>
            <Button asChild variant="outline">
              <a href="/inventory">Idi na asortiman</a>
            </Button>
          </CardContent>
        </Card>
        {dialogs}
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Magacin"
        description={sr.pages.warehouse}
        action={
          <>
            {importActions}
            <Button
              onClick={() => setStockInOpen(true)}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Ulaz
            </Button>
            <Button
              onClick={() => setStockOutOpen(true)}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              <Minus className="mr-2 h-4 w-4" />
              Izlaz / korekcija
            </Button>
          </>
        }
      />

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
        Ulaz u lager ide skeniranjem ili ručnim ulazom. CSV uvoz dodaje nov asortiman; ažuriranje stanja
        postavlja količinu postojećih proizvoda.
      </p>

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

      <StockInForm
        open={stockInOpen}
        onOpenChange={setStockInOpen}
        products={products}
        onSubmit={handleStockIn}
        isLoading={createMovementMutation.isPending}
      />
      <StockOutForm
        open={stockOutOpen}
        onOpenChange={setStockOutOpen}
        products={products}
        onSubmit={handleStockOut}
        isLoading={createMovementMutation.isPending}
      />
      {dialogs}
    </div>
  )
}
