'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DraftNumberInput } from '@/components/ui/draft-number-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Loader2, AlertTriangle, ChevronDown } from 'lucide-react'
import { Product } from '@/types/product'
import { InvoiceCreateInput, InvoiceStatus } from '@/types/invoice'
import { invoiceWriteSchema } from '@/lib/validations'
import {
  clampDiscountPercent,
  lineDiscountAmount,
  lineSubtotal,
  lineTotal,
  addReservedStock,
  remainingStock,
  stockBySku,
} from '@/lib/invoice-line'

interface InvoiceFormProps {
  products: Product[]
  onSubmit: (data: InvoiceCreateInput) => Promise<void>
  isLoading?: boolean
  initialData?: any // Invoice data for edit mode
}

interface InvoiceItemRow {
  id: string
  productId: string | null
  productName: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

const INVOICE_ITEM_TRACKS =
  'md:grid-cols-[minmax(0,2.8fr)_minmax(5.25rem,0.55fr)_minmax(5.75rem,0.6fr)_minmax(5.75rem,0.6fr)_minmax(6.5rem,0.65fr)_auto]'

function productSelectLabel(product: Pick<Product, 'name' | 'sku' | 'quantity'>) {
  return `${product.name} (SKU: ${product.sku}) — ${product.quantity} kom`
}

export function InvoiceForm({ products, onSubmit, isLoading = false, initialData }: InvoiceFormProps) {
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [dueDate, setDueDate] = useState(() => {
    // Default to 30 days from now
    const date = new Date()
    date.setDate(date.getDate() + 30)
    return date.toISOString().split('T')[0]
  })
  const [clientName, setClientName] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [items, setItems] = useState<InvoiceItemRow[]>([
    { id: '1', productId: null, productName: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 },
  ])
  const [formError, setFormError] = useState<string | null>(null)

  // ✅ Populate form with initial data for edit mode
  useEffect(() => {
    if (initialData) {
      setInvoiceNumber(initialData.invoiceNumber || '')
      setDueDate(initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '')
      setClientName(initialData.clientName || '')
      setClientAddress(initialData.clientAddress || '')
      
      if (initialData.items && initialData.items.length > 0) {
        setItems(
          initialData.items.map((item: any, index: number) => ({
            id: item.id || `${Date.now()}-${index}`,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            discount: Number(item.discount || 0),
            total: lineTotal(
              Number(item.quantity) || 1,
              Number(item.unitPrice),
              Number(item.discount || 0)
            ),
          }))
        )
      }
    }
  }, [initialData])

  // Calculate grand total
  const grandTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.total, 0)
  }, [items])

  const productsById = useMemo(() => {
    return new Map(products.map((product) => [product.id, product]))
  }, [products])
  const stockMap = useMemo(() => {
    const onHand = stockBySku(products)
    if (!initialData || initialData.status === InvoiceStatus.DRAFT) {
      return onHand
    }
    return addReservedStock(
      onHand,
      (initialData.items ?? []).map((item: { productId?: string | null; quantity: number }) => ({
        sku: item.productId ? productsById.get(item.productId)?.sku ?? null : null,
        quantity: item.quantity,
      }))
    )
  }, [initialData, products, productsById])

  const lineStock = useMemo(() => {
    const lines = items.map((item) => ({
      id: item.id,
      sku: item.productId ? productsById.get(item.productId)?.sku ?? null : null,
      quantity: item.quantity,
    }))

    return new Map(
      items.map((item) => {
        const sku = item.productId ? productsById.get(item.productId)?.sku ?? null : null
        const available = remainingStock({
          sku,
          lineId: item.id,
          lines,
          stockBySku: stockMap,
        })
        const shortage =
          available === null ? 0 : Math.max(0, item.quantity - Math.max(0, available))
        return [item.id, { available, shortage, sku }] as const
      })
    )
  }, [items, productsById, stockMap])

  const hasShortage = [...lineStock.values()].some((entry) => entry.shortage > 0)

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 2,
    }).format(value)
  }

  // Add new item row
  const addItem = () => {
    const newId = Date.now().toString()
    setItems([
      ...items,
      { id: newId, productId: null, productName: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 },
    ])
  }

  // Remove item row
  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  const updateItem = (id: string, field: keyof InvoiceItemRow, value: InvoiceItemRow[typeof field]) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }

        if (field === 'productId') {
          const selectedProduct = products.find((p) => p.id === value)
          if (selectedProduct) {
            updated.productName = selectedProduct.name
            updated.unitPrice = Number(selectedProduct.price)
          } else {
            updated.productName = ''
            updated.unitPrice = 0
          }
        }

        updated.total = lineTotal(
          Number(updated.quantity) || 0,
          Number(updated.unitPrice) || 0,
          clampDiscountPercent(Number(updated.discount) || 0)
        )

        return updated
      })
    )
  }

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const payload = {
      invoiceNumber: invoiceNumber.trim(),
      dueDate,
      clientName: clientName.trim(),
      clientAddress: clientAddress.trim() || undefined,
      items: items.map((item) => ({
        productId: item.productId || null,
        productName: item.productName.trim(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
      })),
    }

    if (hasShortage) {
      setFormError(
        'Nema dovoljno robe na stanju. Izdavanjem fakture količine se skidaju sa magacina.'
      )
      return
    }

    const validation = invoiceWriteSchema.safeParse(payload)
    if (!validation.success) {
      const firstIssue = validation.error.errors[0]
      setFormError(firstIssue?.message || 'Please correct the invalid invoice items')
      return
    }

    const formData: InvoiceCreateInput = {
      invoiceNumber: validation.data.invoiceNumber,
      dueDate: validation.data.dueDate,
      clientName: validation.data.clientName,
      clientAddress: validation.data.clientAddress || undefined,
      ...(initialData ? {} : { status: InvoiceStatus.UNPAID }),
      items: validation.data.items.map((item) => ({
        productId: item.productId ?? null,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        total: 0,
      })),
    }

    await onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
          <CardDescription>Enter invoice and client information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">
                Invoice Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g., 2024-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">
                Due Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientName">
              Client Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Enter client name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientAddress">Client Address</Label>
            <Input
              id="clientAddress"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              placeholder="Enter client address (optional)"
            />
          </div>
        </CardContent>
      </Card>

      {/* Items Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Invoice Items</CardTitle>
              <CardDescription>Add products to the invoice</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Desktop Table Header */}
            <div
              className={`hidden gap-3 border-b pb-2 text-sm font-medium text-muted-foreground md:grid ${INVOICE_ITEM_TRACKS}`}
            >
              <div>Product</div>
              <div>Quantity</div>
              <div>Unit Price</div>
              <div>Discount (%)</div>
              <div>Total</div>
              <div></div>
            </div>

            {items.map((item) => {
              const stock = lineStock.get(item.id)
              const subtotal = lineSubtotal(item.quantity, item.unitPrice)
              const saved = lineDiscountAmount(item.quantity, item.unitPrice, item.discount)
              const selectedProduct = item.productId
                ? productsById.get(item.productId)
                : undefined
              const selectedTitle = selectedProduct
                ? productSelectLabel(selectedProduct)
                : 'Select Product'

              return (
              <div
                key={item.id}
                className={`grid grid-cols-1 gap-3 border-b pb-4 md:items-start md:border-0 md:pb-0 ${INVOICE_ITEM_TRACKS}`}
              >
                {/* Product Select - Full width on mobile, widest track on desktop */}
                <div className="min-w-0">
                  <Label className="md:hidden text-sm mb-1.5 block">Product</Label>
                  <div className="relative min-w-0">
                    <select
                      className="h-11 w-full min-w-0 max-w-full appearance-none truncate rounded-md border border-input bg-background py-2 pl-3 pr-9 text-xs leading-tight md:h-10 md:text-sm"
                      value={item.productId || ''}
                      title={selectedTitle}
                      aria-label={selectedTitle}
                      onChange={(e) => updateItem(item.id, 'productId', e.target.value || null)}
                    >
                      <option value="">Select Product</option>
                      {products.map((product) => {
                        const label = productSelectLabel(product)
                        return (
                          <option key={product.id} value={product.id} title={label}>
                            {label}
                          </option>
                        )
                      })}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>

                {/* Quantity and Unit Price - Row on mobile */}
                <div className="grid grid-cols-2 gap-3 md:contents">
                  <div className="min-w-0">
                    <Label className="md:hidden text-sm mb-1.5 block">Quantity</Label>
                    <DraftNumberInput
                      kind="integer"
                      min={1}
                      emptyAs={1}
                      value={item.quantity}
                      onValueChange={(quantity) => updateItem(item.id, 'quantity', quantity)}
                      aria-invalid={Boolean(stock?.shortage)}
                      aria-label="Količina"
                    />
                    {stock?.available !== null && stock?.available !== undefined ? (
                      <p
                        className={
                          stock.shortage > 0
                            ? 'mt-1 text-xs font-medium text-amber-700'
                            : 'mt-1 text-xs text-muted-foreground'
                        }
                      >
                        {stock.shortage > 0 ? (
                          <>
                            Manjak {stock.shortage} kom (na stanju {Math.max(0, stock.available)}).
                          </>
                        ) : (
                          <>Na stanju: {Math.max(0, stock.available)} kom</>
                        )}
                      </p>
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <Label className="md:hidden text-sm mb-1.5 block">Unit Price</Label>
                    <DraftNumberInput
                      kind="decimal"
                      min={0}
                      emptyAs={0}
                      value={item.unitPrice}
                      onValueChange={(unitPrice) => updateItem(item.id, 'unitPrice', unitPrice)}
                      aria-label="Jedinična cena"
                    />
                  </div>
                </div>

                {/* Discount and Total - Row on mobile */}
                <div className="grid grid-cols-2 gap-3 md:contents">
                  <div className="min-w-0">
                    <Label className="md:hidden text-sm mb-1.5 block">Popust (%)</Label>
                    <div className="relative">
                      <DraftNumberInput
                        kind="decimal"
                        min={0}
                        max={100}
                        emptyAs={0}
                        value={item.discount}
                        onValueChange={(discount) => updateItem(item.id, 'discount', discount)}
                        placeholder="0"
                        className="pr-8"
                        aria-label="Popust u procentima"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                        %
                      </span>
                    </div>
                    {item.discount > 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        −{item.discount}% ({formatCurrency(saved)})
                      </p>
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-col justify-center">
                    <Label className="md:hidden text-sm mb-1.5 block">Total</Label>
                    {item.discount > 0 ? (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatCurrency(subtotal)}
                      </span>
                    ) : null}
                    <div className="flex h-10 items-center text-sm font-semibold">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                </div>

                {/* Delete Button */}
                <div className="flex justify-end md:justify-start">
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="w-full md:w-auto"
                    >
                      <Trash2 className="h-4 w-4 md:mr-0" />
                      <span className="md:hidden ml-2">Remove</span>
                    </Button>
                  )}
                </div>
              </div>
              )
            })}
          </div>

          {/* Summary */}
          <div className="mt-6 space-y-3 border-t pt-4">
            {hasShortage ? (
              <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Nema dovoljno robe na stanju. Izdavanjem ili označavanjem kao plaćeno količine
                  se skidaju sa magacina — faktura se ne može sačuvati dok ima manjka.
                </p>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold sm:text-lg">Grand Total:</span>
              <span className="text-xl font-bold sm:text-2xl">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}

      {/* Submit Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button type="submit" className="w-full sm:w-auto" disabled={isLoading || hasShortage}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Invoice'
          )}
        </Button>
      </div>
    </form>
  )
}
