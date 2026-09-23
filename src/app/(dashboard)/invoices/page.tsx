'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, FileText, Trash2, Download, Loader2, Edit } from 'lucide-react'
import Link from 'next/link'
import { Invoice, InvoiceStatus } from '@/types/invoice'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/PageHeader'
import { InvoiceStatusActions } from '@/components/invoices/InvoiceStatusActions'
import { cn } from '@/lib/utils'
import { invoiceStatusLabel, isPaidInvoiceStatus } from '@/lib/invoice-status'
import { buildFinanceSnapshot, formatRsd } from '@/lib/invoice-finance'
import { notify } from '@/lib/notify'
import { readApiErrorMessage } from '@/lib/api-error'

async function fetchInvoices() {
  const response = await fetch('/api/invoices')
  if (!response.ok) {
    throw new Error('Failed to fetch invoices')
  }
  return response.json()
}

async function deleteInvoice(id: string) {
  const response = await fetch(`/api/invoices/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, 'Failed to delete invoice'))
  }

  return response.json()
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('sr-RS')
}

function getStatusBadge(status: InvoiceStatus | string) {
  if (isPaidInvoiceStatus(status)) {
    return <Badge variant="secondary">{invoiceStatusLabel(status)}</Badge>
  }

  return <Badge variant="destructive">{invoiceStatusLabel(status)}</Badge>
}

function parseInvoiceView(value: string | null): 'open' | 'paid' {
  return value === 'paid' ? 'paid' : 'open'
}

export default function InvoicesPage() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const view = parseInvoiceView(searchParams.get('status'))

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: fetchInvoices,
  })

  const didNormalizeDrafts = useRef(false)

  useEffect(() => {
    if (didNormalizeDrafts.current || invoices.length === 0) {
      return
    }

    const drafts = invoices.filter((invoice) => invoice.status === InvoiceStatus.DRAFT)
    didNormalizeDrafts.current = true
    if (drafts.length === 0) {
      return
    }

    Promise.all(
      drafts.map((invoice) =>
        fetch(`/api/invoices/${invoice.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: InvoiceStatus.UNPAID }),
        })
      )
    ).then(() => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    })
  }, [invoices, queryClient])

  const deleteMutation = useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] })
      queryClient.invalidateQueries({ queryKey: ['lowStockProducts'] })
      notify.success('Faktura je obrisana', {
        description: 'Faktura je uklonjena iz evidencije.',
        duration: 5000,
      })
    },
    onError: (error: Error) => {
      notify.error('Brisanje nije uspelo', {
        description: error.message || 'An unexpected error occurred',
        duration: 5000,
      })
    },
  })

  const handleDelete = (id: string) => {
    if (confirm('Obrisati ovu fakturu?')) {
      deleteMutation.mutate(id)
    }
  }

  const setView = (nextView: 'open' | 'paid') => {
    const params = new URLSearchParams(searchParams.toString())
    if (nextView === 'paid') {
      params.set('status', 'paid')
    } else {
      params.delete('status')
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const { openInvoices, paidInvoices, visibleInvoices } = useMemo(() => {
    const open = invoices.filter((invoice) => !isPaidInvoiceStatus(invoice.status))
    const paid = invoices.filter((invoice) => isPaidInvoiceStatus(invoice.status))
    return {
      openInvoices: open,
      paidInvoices: paid,
      visibleInvoices: view === 'paid' ? paid : open,
    }
  }, [invoices, view])

  const finance = useMemo(() => buildFinanceSnapshot(invoices), [invoices])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const hasAnyInvoices = invoices.length > 0
  const isEmptyView = visibleInvoices.length === 0

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        className="mb-6"
        title="Fakture"
        description="Otvorene fakture čekaju uplatu. Plaćene idu u arhivu."
        action={
          <Button asChild className="w-full sm:w-auto">
            <Link href="/invoices/new">
              <Plus className="mr-2 h-4 w-4" />
              Nova faktura
            </Link>
          </Button>
        }
      />

      {hasAnyInvoices ? (
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={view === 'open' ? 'default' : 'outline'}
              className="min-h-11 flex-1 sm:flex-none"
              aria-pressed={view === 'open'}
              onClick={() => setView('open')}
            >
              Otvorene ({openInvoices.length})
            </Button>
            <Button
              type="button"
              variant={view === 'paid' ? 'default' : 'outline'}
              className="min-h-11 flex-1 sm:flex-none"
              aria-pressed={view === 'paid'}
              onClick={() => setView('paid')}
            >
              Plaćene ({paidInvoices.length})
            </Button>
          </div>
          <Card>
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              {view === 'paid' ? (
                <div>
                  <p className="text-sm text-muted-foreground">Naplaćeno ovog meseca</p>
                  <p className="text-2xl font-bold">{formatRsd(finance.monthRevenue)}</p>
                  <p className="text-sm text-muted-foreground">
                    Ukupno naplaćeno {formatRsd(finance.allTimePaid)}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">Potraživanja</p>
                  <p className="text-2xl font-bold">{formatRsd(finance.receivables)}</p>
                  <p className="text-sm text-muted-foreground">
                    {finance.openCount} otvorenih faktura čeka uplatu
                  </p>
                </div>
              )}
              <Button variant="outline" asChild>
                <Link href="/finance">Finansije</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!hasAnyInvoices ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Još nema faktura</h3>
            <p className="text-muted-foreground text-center mb-4">
              Napravite prvu fakturu za klijenta.
            </p>
            <Button asChild>
              <Link href="/invoices/new">
                <Plus className="mr-2 h-4 w-4" />
                Nova faktura
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : isEmptyView && view === 'paid' ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">Nema plaćenih faktura</h3>
            <p className="text-muted-foreground text-center mb-4">
              Kada klijent uplati, označite fakturu kao plaćenu da uđe u arhivu.
            </p>
            <Button variant="outline" onClick={() => setView('open')}>
              Prikaži otvorene
            </Button>
          </CardContent>
        </Card>
      ) : isEmptyView ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">Nema otvorenih faktura</h3>
            <p className="text-muted-foreground text-center mb-4">
              Sve fakture su plaćene. Arhiva je u Pregledu plaćenih.
            </p>
            <Button variant="outline" onClick={() => setView('paid')}>
              Prikaži plaćene
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleInvoices.map((invoice) => (
            <Card key={invoice.id} className={cn(invoice.status === InvoiceStatus.PAID && 'opacity-95')}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-snug break-words">{invoice.invoiceNumber}</CardTitle>
                    <CardDescription className="mt-2 block break-words">
                      {invoice.clientName}
                    </CardDescription>
                  </div>
                  {getStatusBadge(invoice.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ukupno</span>
                    <span className="font-semibold">
                      {formatRsd(Number(invoice.totalAmount))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Rok</span>
                    <span>{formatDate(invoice.dueDate)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Kreirano</span>
                    <span>{formatDate(invoice.createdAt)}</span>
                  </div>
                  <InvoiceStatusActions
                    invoiceId={invoice.id}
                    status={invoice.status}
                    className="w-full"
                  />
                  <div className="flex flex-wrap gap-2 border-t pt-2">
                    <Button variant="outline" size="sm" className="min-h-11 flex-1" asChild>
                      <Link href={`/invoices/${invoice.id}`}>
                        <Download className="mr-2 h-4 w-4" />
                        PDF
                      </Link>
                    </Button>
                    {!isPaidInvoiceStatus(invoice.status) && (
                      <Button variant="outline" size="sm" className="min-h-11" asChild>
                        <Link href={`/invoices/${invoice.id}/edit`}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Izmeni</span>
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11"
                      onClick={() => handleDelete(invoice.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Obriši</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
