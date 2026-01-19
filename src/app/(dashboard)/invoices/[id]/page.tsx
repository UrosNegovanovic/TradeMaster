'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useMemo } from 'react'
import { BlobProvider } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { InvoicePDF } from '@/components/invoices/InvoicePDF'
import { InvoiceWithItems } from '@/types/invoice'
import { Profile } from '@/types/profile'

async function fetchInvoice(id: string): Promise<InvoiceWithItems & { profile: Profile }> {
  const response = await fetch(`/api/invoices/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch invoice')
  }
  return response.json()
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const invoiceId = params.id as string

  // Fetch invoice
  const { data: invoice, isLoading } = useQuery<InvoiceWithItems & { profile: Profile }>({
    queryKey: ['invoice', invoiceId],
    queryFn: () => fetchInvoice(invoiceId),
  })

  // PDF document
  const pdfDocument = useMemo(() => {
    if (!invoice) return null
    return <InvoicePDF invoice={invoice} />
  }, [invoice])

  // Format currency
  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 2,
    }).format(numValue)
  }

  // Format date
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('sr-RS')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Invoice not found</p>
            <Link href="/invoices" className="mt-4">
              <Button variant="outline">Back to Invoices</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{invoice.invoiceNumber}</h1>
            <p className="text-muted-foreground mt-1">
              Invoice Details
            </p>
          </div>
        </div>
        {pdfDocument && (
          <BlobProvider document={pdfDocument}>
            {({ blob, url, loading }) => (
              <Button
                onClick={() => {
                  if (url) {
                    const link = document.createElement('a')
                    link.href = url
                    link.download = `${invoice.invoiceNumber.replace(/\s+/g, '_')}_invoice.pdf`
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  }
                }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </>
                )}
              </Button>
            )}
          </BlobProvider>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Invoice Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Invoice Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Invoice Number</p>
                <p className="text-base font-semibold">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-base font-semibold">{invoice.status}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created Date</p>
                <p className="text-base">{formatDate(invoice.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="text-base">{formatDate(invoice.dueDate)}</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Client</p>
              <p className="text-base font-semibold">{invoice.clientName}</p>
              {invoice.clientAddress && (
                <p className="text-sm text-muted-foreground mt-1">
                  {invoice.clientAddress}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items:</span>
                <span>{invoice.items?.length || 0}</span>
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-2xl font-bold">
                    {formatCurrency(Number(invoice.totalAmount))}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Invoice Items</CardTitle>
          <CardDescription>Products and services included in this invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                    Item
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                    Quantity
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                    Unit Price
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                    Discount
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item) => {
                  const discount = Number(item.discount || 0)
                  return (
                    <tr key={item.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 font-medium">{item.productName}</td>
                      <td className="py-3 px-4 text-right">{item.quantity}</td>
                      <td className="py-3 px-4 text-right">
                        {formatCurrency(Number(item.unitPrice))}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {discount > 0 ? `${discount.toFixed(2)}%` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {formatCurrency(Number(item.total))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
