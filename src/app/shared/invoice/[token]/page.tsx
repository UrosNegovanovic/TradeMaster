'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { summarizeVat } from '@/lib/invoice-vat'
import { getSafeEmailHref, getSafePhoneHref } from '@/lib/public-catalog'
import { isShareToken, type PublicInvoice } from '@/lib/public-invoice'
import { documentLabels } from '@/lib/document-type'
import { sr } from '@/lib/ui-copy'

const InvoicePdfDownload = dynamic(() => import('@/components/invoices/InvoicePdfDownload'), {
  ssr: false,
  loading: () => (
    <Button disabled className="min-h-11 w-full sm:w-auto">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {sr.pdf.generating}
    </Button>
  ),
})

async function fetchInvoice(token: string): Promise<PublicInvoice> {
  if (!isShareToken(token)) throw new Error('Invalid link')
  const response = await fetch(`/api/shared/invoice/${token}`, { cache: 'no-store' })
  if (!response.ok) throw new Error('Failed to fetch invoice')
  return response.json()
}

const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', minimumFractionDigits: 2 }).format(Number(value))
const formatDate = (value: string) => new Date(value).toLocaleDateString('sr-RS', { timeZone: 'Europe/Belgrade' })

function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export default function SharedInvoicePage({ params }: { params: { token: string } }) {
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['shared-invoice', params.token],
    queryFn: () => fetchInvoice(params.token),
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold">Dokument nije dostupan</h1>
          <p className="text-muted-foreground">Link je nevažeći ili ga je izdavalac opozvao.</p>
        </div>
      </div>
    )
  }

  const profile = invoice.profile
  const emailHref = getSafeEmailHref(profile.contactEmail)
  const phoneHref = getSafePhoneHref(profile.contactPhone)
  const vat = invoice.vatEnabled ? summarizeVat(invoice.items) : null
  const labels = documentLabels(invoice.documentType)
  const isProformaDoc = invoice.documentType === 'PROFORMA'

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {isValidImageUrl(profile.logoUrl) ? (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-white">
                <Image src={profile.logoUrl!} alt={profile.companyName || 'Logo'} fill className="object-contain p-1" />
              </div>
            ) : null}
            <div className="min-w-0">
              <p className="text-xl font-bold">{profile.companyName || 'Izdavalac'}</p>
              {profile.address && <p className="text-sm text-muted-foreground">{profile.address}</p>}
              {profile.pib && <p className="text-sm text-muted-foreground">PIB: {profile.pib}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            {emailHref && <a href={emailHref} className="text-primary hover:underline">{profile.contactEmail}</a>}
            {phoneHref && <a href={phoneHref} className="text-primary hover:underline">{profile.contactPhone}</a>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{labels.name} {invoice.invoiceNumber}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Datum: {formatDate(invoice.createdAt)} · {labels.dueLabel}: {formatDate(invoice.dueDate)}
              {isProformaDoc ? null : <> · {invoice.status === 'PAID' ? 'Plaćeno' : 'Otvoreno'}</>}
            </p>
          </div>
          <InvoicePdfDownload invoice={invoice} />
        </div>

        <section className="mb-6 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Kupac</p>
          <p className="font-semibold">{invoice.clientName}</p>
          {invoice.clientAddress && <p className="text-sm text-muted-foreground">{invoice.clientAddress}</p>}
          {invoice.clientPib && <p className="text-sm text-muted-foreground">PIB: {invoice.clientPib}</p>}
        </section>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Stavka</th>
                <th className="px-3 py-2 text-right font-medium">Kol.</th>
                <th className="px-3 py-2 text-right font-medium">{vat ? 'Cena bez PDV' : 'Cena'}</th>
                <th className="px-3 py-2 text-right font-medium">Popust</th>
                {vat ? <th className="px-3 py-2 text-right font-medium">PDV</th> : null}
                <th className="px-3 py-2 text-right font-medium">{vat ? 'Iznos bez PDV' : 'Ukupno'}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => {
                const discount = Number(item.discount || 0)
                return (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{item.productName}</td>
                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-3 py-2 text-right">{discount > 0 ? `${discount.toFixed(2)}%` : '-'}</td>
                    {vat ? <td className="px-3 py-2 text-right">{Number(item.vatRate)}%</td> : null}
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div className="text-sm">
            {profile.giroAccount && <>
              <p className="text-muted-foreground">Žiro-račun</p>
              <p className="font-semibold">{profile.giroAccount}</p>
              <p className="mt-1 text-muted-foreground">Pri uplati navedite broj {isProformaDoc ? 'predračuna' : 'fakture'} {invoice.invoiceNumber}.</p>
            </>}
          </div>
          <div className="w-full space-y-1 text-sm sm:w-72">
            {vat ? <>
              <div className="flex justify-between"><span className="text-muted-foreground">Osnovica:</span><span>{formatCurrency(vat.base)}</span></div>
              {vat.groups.map((group) => (
                <div key={group.rate} className="flex justify-between"><span className="text-muted-foreground">PDV {group.rate}%:</span><span>{formatCurrency(group.vat)}</span></div>
              ))}
            </> : null}
            <div className="flex items-center justify-between border-t pt-2">
              <span className="font-semibold">{vat ? 'Ukupno za uplatu:' : 'Ukupno:'}</span>
              <span className="text-xl font-bold">{formatCurrency(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
