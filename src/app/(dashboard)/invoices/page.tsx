'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Plus, Trash2, Download, Loader2, Edit, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { Invoice, InvoiceStatus } from '@/types/invoice'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/PageHeader'
import { FirstRunEmptyState } from '@/components/onboarding/FirstRunEmptyState'
import { InvoiceStatusActions } from '@/components/invoices/InvoiceStatusActions'
import { InvoiceExport } from '@/components/invoices/InvoiceExport'
import { cn } from '@/lib/utils'
import { isPaidInvoiceStatus } from '@/lib/invoice-status'
import { INVOICE_TONE_BADGE_VARIANT, documentStatusView } from '@/lib/invoice-status-view'
import { isProforma, onlyInvoices } from '@/lib/document-type'
import { buildFinanceSnapshot, formatRsd } from '@/lib/invoice-finance'
import { currentMonthKey, groupInvoicesByMonth } from '@/lib/invoice-archive'
import { notify } from '@/lib/notify'
import { SefStatusBadge } from '@/components/sef/SefStatusBadge'
import { isLockedBySef } from '@/lib/sef-status'
import { invoiceEditHref } from '@/lib/invoice-edit'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { readApiErrorMessage } from '@/lib/api-error'
import { useAuthorizedFetch } from '@/lib/use-authorized-fetch'
import type { SessionFetch } from '@/lib/authorized-fetch'

async function fetchInvoices() {
  const response = await fetch('/api/invoices')
  if (!response.ok) {
    throw new Error('Failed to fetch invoices')
  }
  return response.json()
}

async function deleteInvoice(id: string, request: SessionFetch) {
  const response = await request(`/api/invoices/${id}`, {
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

function getStatusBadge(invoice: Invoice) {
  const view = documentStatusView(invoice)
  return <Badge variant={INVOICE_TONE_BADGE_VARIANT[view.tone]}>{view.label}</Badge>
}

type InvoiceListView = 'open' | 'paid' | 'proforma' | 'sef-rejected'

function parseInvoiceView(status: string | null, view: string | null): InvoiceListView {
  if (view === 'proforma') return 'proforma'
  if (view === 'sef-rejected') return 'sef-rejected'
  return status === 'paid' ? 'paid' : 'open'
}

interface InvoiceCardProps {
  invoice: Invoice
  onDelete: (id: string) => void
  isDeleting: boolean
}

function InvoiceCard({ invoice, onDelete, isDeleting }: InvoiceCardProps) {
  // Sent to SEF: no edit or delete here (storno goes through SEF).
  const sefLocked = isLockedBySef(invoice.sefStatus)
  const editHref = invoiceEditHref(invoice)
  return (
    <Card className={cn(invoice.status === InvoiceStatus.PAID && 'opacity-95')}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg leading-snug break-words">{invoice.invoiceNumber}</CardTitle>
            <CardDescription className="mt-2 block break-words">
              {invoice.clientName}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getStatusBadge(invoice)}
            <SefStatusBadge status={invoice.sefStatus} />
          </div>
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
            <span className="text-muted-foreground">{isProforma(invoice) ? 'Važi do' : 'Rok'}</span>
            <span>{formatDate(invoice.dueDate)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Kreirano</span>
            <span>{formatDate(invoice.createdAt)}</span>
          </div>
          {isProforma(invoice) ? null : (
            <InvoiceStatusActions
              invoiceId={invoice.id}
              status={invoice.status}
              className="w-full"
            />
          )}
          <div className="flex flex-wrap gap-2 border-t pt-2">
            <Button variant="outline" size="sm" className="min-h-11 flex-1" asChild>
              <Link href={`/invoices/${invoice.id}`}>
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Link>
            </Button>
            {editHref && (
              <Button variant="outline" size="sm" className="min-h-11" asChild>
                <Link href={editHref}>
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Izmeni</span>
                </Link>
              </Button>
            )}
            {sefLocked ? null : (
              <Button
                variant="outline"
                size="sm"
                className="min-h-11"
                onClick={() => onDelete(invoice.id)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Obriši</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface MonthArchiveSectionProps {
  group: ReturnType<typeof groupInvoicesByMonth>[number]
  onDelete: (id: string) => void
  isDeleting: boolean
}

function MonthArchiveSection({ group, onDelete, isDeleting }: MonthArchiveSectionProps) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-accent">
        <span className="font-medium">{group.label}</span>
        <span className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            {group.invoices.length} {group.invoices.length === 1 ? 'faktura' : 'faktura'} · {formatRsd(group.total)}
          </span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {group.invoices.map((invoice) => (
          <InvoiceCard key={invoice.id} invoice={invoice} onDelete={onDelete} isDeleting={isDeleting} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

export default function InvoicesPage() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const request = useAuthorizedFetch()
  const view = parseInvoiceView(searchParams.get('status'), searchParams.get('view'))

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
        request(`/api/invoices/${invoice.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: InvoiceStatus.UNPAID }),
        })
      )
    ).then(() => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    })
  }, [invoices, queryClient, request])

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInvoice(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] })
      queryClient.invalidateQueries({ queryKey: ['lowStockProducts'] })
      notify.success('Dokument je obrisan', {
        description: 'Uklonjen je iz evidencije.',
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

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDialog({
      title: view === 'proforma' ? 'Obrisati ovaj predračun?' : 'Obrisati ovu fakturu?',
      description: 'Ova radnja se ne može opozvati.',
      confirmLabel: 'Obriši',
      cancelLabel: 'Otkaži',
      variant: 'destructive',
    })
    if (confirmed) {
      deleteMutation.mutate(id)
    }
  }

  const setView = (nextView: InvoiceListView) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('status')
    params.delete('view')
    if (nextView === 'paid') params.set('status', 'paid')
    if (nextView === 'proforma') params.set('view', 'proforma')
    if (nextView === 'sef-rejected') params.set('view', 'sef-rejected')
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const { openInvoices, paidInvoices, proformas, sefRejected, visibleInvoices } = useMemo(() => {
    const realInvoices = onlyInvoices(invoices)
    const open = realInvoices.filter((invoice) => !isPaidInvoiceStatus(invoice.status))
    const paid = realInvoices.filter((invoice) => isPaidInvoiceStatus(invoice.status))
    const proformaList = invoices.filter((invoice) => isProforma(invoice))
    // ROADMAP A3: what the buyer rejected in SEF, so it is fixed first.
    const rejected = realInvoices.filter((invoice) => invoice.sefStatus === 'REJECTED')
    return {
      openInvoices: open,
      paidInvoices: paid,
      proformas: proformaList,
      sefRejected: rejected,
      visibleInvoices:
        view === 'paid' ? paid : view === 'proforma' ? proformaList : view === 'sef-rejected' ? rejected : open,
    }
  }, [invoices, view])

  // Plaćene fakture samo rastu tokom vremena, pa ih grupišemo po mesecu: tekući
  // mesec se prikazuje odmah, a stariji meseci idu u arhivu koja se otvara na klik.
  const { currentMonthGroup, archivedMonthGroups } = useMemo(() => {
    const groups = groupInvoicesByMonth(paidInvoices)
    const thisMonth = currentMonthKey()
    return {
      currentMonthGroup: groups.find((group) => group.key === thisMonth) ?? null,
      archivedMonthGroups: groups.filter((group) => group.key !== thisMonth),
    }
  }, [paidInvoices])

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
        description="Otvorene fakture čekaju uplatu. Plaćene idu u arhivu. Predračun šaljete pre uplate."
        action={
          view === 'proforma' ? (
            <Button asChild className="w-full sm:w-auto">
              <Link href="/invoices/new?type=proforma">
                <Plus className="mr-2 h-4 w-4" />
                Novi predračun
              </Link>
            </Button>
          ) : (
            <Button asChild className="w-full sm:w-auto">
              <Link href="/invoices/new">
                <Plus className="mr-2 h-4 w-4" />
                Nova faktura
              </Link>
            </Button>
          )
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
            <Button
              type="button"
              variant={view === 'proforma' ? 'default' : 'outline'}
              className="min-h-11 flex-1 sm:flex-none"
              aria-pressed={view === 'proforma'}
              onClick={() => setView('proforma')}
            >
              Predračuni ({proformas.length})
            </Button>
            {sefRejected.length > 0 || view === 'sef-rejected' ? (
              <Button
                type="button"
                variant={view === 'sef-rejected' ? 'destructive' : 'outline'}
                className="min-h-11 flex-1 sm:flex-none"
                aria-pressed={view === 'sef-rejected'}
                onClick={() => setView('sef-rejected')}
              >
                Odbijene u SEF-u ({sefRejected.length})
              </Button>
            ) : null}
          </div>
          {view === 'proforma' || view === 'sef-rejected' ? null : (
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
          )}
        </div>
      ) : null}

      {hasAnyInvoices ? (
        <div className="mb-6">
          <InvoiceExport />
        </div>
      ) : null}

      {!hasAnyInvoices ? (
        <FirstRunEmptyState kind="invoice" />
      ) : isEmptyView && view === 'proforma' ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">Nema predračuna</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Predračun pošaljite kupcu pre uplate. Ne skida robu sa magacina; kada kupac uplati, jednim
              klikom ga pretvorite u fakturu.
            </p>
            <Button asChild>
              <Link href="/invoices/new?type=proforma">
                <Plus className="mr-2 h-4 w-4" />
                Novi predračun
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : isEmptyView && view === 'sef-rejected' ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">Nema odbijenih faktura u SEF-u</h3>
            <Button variant="outline" onClick={() => setView('open')}>
              Prikaži otvorene
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
      ) : view === 'paid' ? (
        <div className="space-y-8">
          {currentMonthGroup ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">{currentMonthGroup.label} (tekući mesec)</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {currentMonthGroup.invoices.map((invoice) => (
                  <InvoiceCard
                    key={invoice.id}
                    invoice={invoice}
                    onDelete={handleDelete}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {archivedMonthGroups.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Arhiva po mesecima</h3>
              <div className="space-y-3">
                {archivedMonthGroups.map((group) => (
                  <MonthArchiveSection
                    key={group.key}
                    group={group}
                    onDelete={handleDelete}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleInvoices.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              onDelete={handleDelete}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}
