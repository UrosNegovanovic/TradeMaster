'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { Product } from '@/types/product'
import { InvoiceCreateInput, InvoiceStatus } from '@/types/invoice'
import { Decimal } from '@prisma/client/runtime/library'

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
            discount: item.discount || 0,
            total: Number(item.total),
          }))
        )
      }
    }
  }, [initialData])

  // Calculate grand total
  const grandTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.total, 0)
  }, [items])

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

  // Update item
  const updateItem = (id: string, field: keyof InvoiceItemRow, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value }

          // If product selected, auto-fill name and price
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

          // Recalculate total with discount
          const subtotal = updated.quantity * updated.unitPrice
          updated.total = subtotal * (1 - updated.discount / 100)

          return updated
        }
        return item
      })
    )
  }

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!invoiceNumber.trim() || !clientName.trim() || !dueDate) {
      alert('Please fill in all required fields')
      return
    }

    const validItems = items.filter(
      (item) => item.productName.trim() && item.quantity > 0 && item.unitPrice > 0 && item.discount >= 0 && item.discount <= 100
    )

    if (validItems.length === 0) {
      alert('Please add at least one valid item')
      return
    }

    const formData: InvoiceCreateInput = {
      invoiceNumber: invoiceNumber.trim(),
      dueDate,
      clientName: clientName.trim(),
      clientAddress: clientAddress.trim() || undefined,
      status: InvoiceStatus.DRAFT,
      items: validItems.map((item) => ({
        productId: item.productId || null,
        productName: item.productName.trim(),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount) || 0,
        total: Number(item.total),
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
            <div className="hidden md:grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
              <div className="col-span-3">Product</div>
              <div className="col-span-2">Quantity</div>
              <div className="col-span-2">Unit Price</div>
              <div className="col-span-2">Discount (%)</div>
              <div className="col-span-2">Total</div>
              <div className="col-span-1"></div>
            </div>

            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-start border-b pb-4 md:border-0 md:pb-0">
                {/* Product Select - Full width on mobile */}
                <div className="md:col-span-3">
                  <Label className="md:hidden text-sm mb-1.5 block">Product</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={item.productId || ''}
                    onChange={(e) => updateItem(item.id, 'productId', e.target.value || null)}
                  >
                    <option value="">Select Product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} (SKU: {product.sku})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity and Unit Price - Row on mobile */}
                <div className="grid grid-cols-2 gap-3 md:contents">
                  <div className="md:col-span-2">
                    <Label className="md:hidden text-sm mb-1.5 block">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity || ''}
                      onChange={(e) =>
                        updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)
                      }
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="md:hidden text-sm mb-1.5 block">Unit Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice || ''}
                      onChange={(e) =>
                        updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                      }
                      required
                    />
                  </div>
                </div>

                {/* Discount and Total - Row on mobile */}
                <div className="grid grid-cols-2 gap-3 md:contents">
                  <div className="md:col-span-2">
                    <Label className="md:hidden text-sm mb-1.5 block">Discount (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={item.discount || ''}
                      onChange={(e) =>
                        updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="md:col-span-2 flex flex-col">
                    <Label className="md:hidden text-sm mb-1.5 block">Total</Label>
                    <div className="flex items-center h-10 text-sm font-semibold">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                </div>

                {/* Delete Button */}
                <div className="md:col-span-1 flex justify-end md:justify-start">
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
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-base sm:text-lg font-semibold">Grand Total:</span>
              <span className="text-xl sm:text-2xl font-bold">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isLoading}>
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
