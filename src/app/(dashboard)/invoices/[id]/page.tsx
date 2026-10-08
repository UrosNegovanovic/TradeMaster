'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ArrowLeft, Copy } from 'lucide-react'
import Link from 'next/link'
import { InvoiceWithItems } from '@/types/invoice'
import { Profile } from '@/types/profile'
import { InvoiceStatusActions } from '@/components/invoices/InvoiceStatusActions'
import { InvoiceSharing } from '@/components/invoices/InvoiceSharing'
import { summarizeVat } from '@/lib/invoice-vat'
import { invoicesListHref, isPaidInvoiceStatus } from '@/lib/invoice-status'
import { INVOICE_TONE_BADGE_VARIANT, documentStatusView } from '@/lib/invoice-status-view'
import { Badge } from '@/components/ui/badge'
import { ProformaConvertButton } from '@/components/invoices/ProformaConvertButton'
import { SefXmlDownloadButton } from '@/components/invoices/SefXmlDownloadButton'
import { DeliveryNoteButton } from '@/components/invoices/DeliveryNoteButton'
import { SefSendPanel } from '@/components/sef/SefSendPanel'
import { canPrintDeliveryNote, documentLabels } from '@/lib/document-type'
import { invoiceCopyHref } from '@/lib/invoice-copy'

const InvoicePdfDownload = dynamic(() => import('@/components/invoices/InvoicePdfDownload'), {
  ssr: false,
  loading: () => (
    <Button disabled className="min-h-11 w-full sm:w-auto">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      PDF…
    </Button>
  ),
})

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
            <p className="text-muted-foreground">Dokument nije pronađen.</p>
            <Link href="/invoices" className="mt-4">
              <Button variant="outline">Nazad na fakture</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const vat = invoice.vatEnabled ? summarizeVat(invoice.items ?? []) : null
  const isProformaDoc = invoice.documentType === 'PROFORMA'
  const labels = documentLabels(invoice.documentType)
  const statusView = documentStatusView(invoice)
  const backHref = isProformaDoc ? '/invoices?view=proforma' : invoicesListHref(invoice.status)

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button variant="outline" size="sm" className="min-h-11 shrink-0" asChild>
            <Link href={backHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Nazad
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold lg:text-3xl">{invoice.invoiceNumber}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{labels.name}</p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          {isProformaDoc ? (
            invoice.convertedInvoiceId ? (
              <Button variant="outline" className="min-h-11 w-full sm:w-auto" asChild>
                <Link href={`/invoices/${invoice.convertedInvoiceId}`}>Otvori fakturu</Link>
              </Button>
            ) : (
              <ProformaConvertButton
                proformaId={invoice.id}
                proformaNumber={invoice.invoiceNumber}
                className="min-h-11 w-full sm:w-auto"
              />
            )
          ) : isPaidInvoiceStatus(invoice.status) ? null : (
            <InvoiceStatusActions
              invoiceId={invoice.id}
              status={invoice.status}
              size="default"
              className="min-h-11 w-full sm:w-auto"
            />
          )}
          <InvoicePdfDownload invoice={invoice} />
          <Button variant="outline" className="min-h-11 w-full sm:w-auto" asChild>
            <Link href={invoiceCopyHref(invoice)}>
              <Copy className="mr-2 h-4 w-4" />
              Kopiraj
            </Link>
          </Button>
          {canPrintDeliveryNote(invoice) ? (
            <>
              <DeliveryNoteButton invoice={invoice} />
              <SefXmlDownloadButton invoiceId={invoice.id} invoiceNumber={invoice.invoiceNumber} />
            </>
          ) : null}
        </div>
      </div>

      <SefSendPanel invoiceId={invoice.id} />

      <InvoiceSharing
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
        status={invoice.status}
        companyName={invoice.profile?.companyName}
        documentType={invoice.documentType}
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Invoice Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Podaci</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">{labels.numberLabel}</p>
                <p className="text-base font-semibold">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">
                  <Badge variant={INVOICE_TONE_BADGE_VARIANT[statusView.tone]}>{statusView.label}</Badge>
                </div>
                {!isProformaDoc && isPaidInvoiceStatus(invoice.status) ? (
                  <div className="mt-3">
                    <InvoiceStatusActions invoiceId={invoice.id} status={invoice.status} />
                  </div>
                ) : null}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Datum</p>
                <p className="text-base">{formatDate(invoice.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{labels.dueLabel}</p>
                <p className="text-base">{formatDate(invoice.dueDate)}</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Kupac</p>
              <p className="text-base font-semibold">{invoice.clientName}</p>
              {invoice.clientPib && (
                <p className="text-sm text-muted-foreground mt-1">PIB: {invoice.clientPib}</p>
              )}
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
            <CardTitle>Ukupno</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Broj stavki:</span>
                <span>{invoice.items?.length || 0}</span>
              </div>
              {vat ? (
                <div className="space-y-1 border-t pt-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Osnovica:</span>
                    <span>{formatCurrency(vat.base)}</span>
                  </div>
                  {vat.groups.map((group) => (
                    <div key={group.rate} className="flex justify-between">
                      <span className="text-muted-foreground">PDV {group.rate}%:</span>
                      <span>{formatCurrency(group.vat)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">{vat ? 'Ukupno za uplatu:' : 'Ukupno:'}</span>
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
          <CardTitle>Stavke</CardTitle>
          {isProformaDoc ? (
            <CardDescription>Predračun ne skida robu sa magacina; to se dešava kada ga pretvorite u fakturu.</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                    Stavka
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                    Količina
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                    Jed. cena
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                    Popust
                  </th>
                  {vat ? (
                    <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                      PDV
                    </th>
                  ) : null}
                  <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                    Iznos
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
                      {vat ? (
                        <td className="py-3 px-4 text-right">{Number(item.vatRate ?? 0)}%</td>
                      ) : null}
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
