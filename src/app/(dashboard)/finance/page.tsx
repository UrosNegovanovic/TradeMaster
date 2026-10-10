import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ArrowRight, FileText, Wallet } from 'lucide-react'
import {
  buildFinanceSnapshot,
  formatRsd,
  invoiceBaseAmount,
  type FinanceInvoiceInput,
} from '@/lib/invoice-finance'
import { PageHeader } from '@/components/layout/PageHeader'
import { sr } from '@/lib/ui-copy'
import { buyerInvoicesHref, receivablesByBuyer } from '@/lib/receivables-by-buyer'
import {
  SALES_PERIODS,
  SALES_PERIOD_LABELS,
  parseSalesPeriod,
  salesPeriodStart,
  topBuyers,
  topProducts,
} from '@/lib/sales-ranking'
import { formatDaysOverdue } from '@/lib/overdue-invoices'
import { countSr, formatPercent } from '@/lib/sr-format'

export default async function FinancePage({
  searchParams,
}: {
  searchParams?: { period?: string | string[] }
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const profile = await prisma.profile.findUnique({
    where: { clerkUserId: userId },
  })

  if (!profile) {
    redirect('/settings')
  }

  const invoices = await prisma.invoice.findMany({
    where: { profileId: profile.id, documentType: 'INVOICE' },
    select: {
      id: true,
      invoiceNumber: true,
      clientName: true,
      clientPib: true,
      dueDate: true,
      status: true,
      totalAmount: true,
      vatAmount: true,
      createdAt: true,
      paidAt: true,
      items: {
        select: {
          productId: true,
          productName: true,
          quantity: true,
          total: true,
          unitCost: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const snapshot = buildFinanceSnapshot(
    invoices.map(
      (invoice): FinanceInvoiceInput => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        status: invoice.status,
        totalAmount: invoice.totalAmount.toString(),
        vatAmount: invoice.vatAmount.toString(),
        createdAt: invoice.createdAt,
        paidAt: invoice.paidAt,
        items: invoice.items.map((item) => ({
          quantity: item.quantity,
          unitCost: item.unitCost?.toString() ?? null,
        })),
      })
    )
  )

  // ROADMAP A9.18: who owes what, the most late first.
  const debtors = receivablesByBuyer(
    invoices.map((invoice) => ({
      status: invoice.status,
      clientName: invoice.clientName,
      clientPib: invoice.clientPib,
      totalAmount: invoice.totalAmount.toString(),
      dueDate: invoice.dueDate,
      createdAt: invoice.createdAt,
    }))
  )
  const DEBTORS_SHOWN = 10

  // ROADMAP A9.20: best sellers and best buyers in a period (paid invoices, without PDV).
  const salesPeriod = parseSalesPeriod(searchParams?.period)
  const salesFrom = salesPeriodStart(salesPeriod)
  const rankingInput = invoices.map((invoice) => ({
    status: invoice.status,
    paidAt: invoice.paidAt,
    clientName: invoice.clientName,
    clientPib: invoice.clientPib,
    totalAmount: invoice.totalAmount.toString(),
    vatAmount: invoice.vatAmount.toString(),
    items: invoice.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      total: item.total.toString(),
      unitCost: item.unitCost?.toString() ?? null,
    })),
  }))
  const bestProducts = topProducts(rankingInput, salesFrom)
  const bestBuyers = topBuyers(rankingInput, salesFrom)

  const maxMonthTotal = Math.max(...snapshot.months.map((month) => month.total), 0)
  const hasAnyInvoices = invoices.length > 0

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Finansije"
        description="Potraživanja su otvorene fakture. Prihod se knjiži na dan kada fakturu obeležite kao plaćenu. Prihod i profit su bez PDV-a."
      />

      {!hasAnyInvoices ? (
        <Card>
          <CardHeader>
            <CardTitle>Još nema prometa</CardTitle>
            <CardDescription>
              Kada izdate i naplatite fakture, ovde ćete videti potraživanja i mesečni prihod.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/invoices/new">
                <FileText className="mr-2 h-4 w-4" />
                Nova faktura
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Potraživanja</CardTitle>
                <CardDescription>Iznos na otvorenim fakturama</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-2xl font-bold">{formatRsd(snapshot.receivables)}</p>
                <p className="text-sm text-muted-foreground">
                  {countSr(snapshot.openCount, 'otvorena faktura', 'otvorene fakture', 'otvorenih faktura')}
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/invoices">
                    Otvorene
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Profit ovog meseca</CardTitle>
                <CardDescription>{sr.finance.profitMonth}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {snapshot.monthProfit === null ? (
                  <>
                    <p className="flex items-center gap-2 font-semibold text-amber-700">
                      <AlertTriangle className="h-4 w-4" />
                      {sr.finance.missingCost}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {sr.finance.missingCostDescription(snapshot.monthMissingCostCount)}
                    </p>
                    <Link href="/inventory?filter=missing-cost" className="text-sm font-medium text-primary underline-offset-2 hover:underline">
                      Proizvodi bez nabavne cene →
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold">{formatRsd(snapshot.monthProfit)}</p>
                    <p className="text-sm text-muted-foreground">
                      Trošak {formatRsd(snapshot.monthCost ?? 0)} · Marža{' '}
                      {formatPercent(snapshot.monthMarginPercent)}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Prihod ovog meseca</CardTitle>
                <CardDescription>Naplaćeno od početka meseca</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-2xl font-bold">{formatRsd(snapshot.monthRevenue)}</p>
                <p className="text-sm text-muted-foreground">
                  {snapshot.thisMonthInvoices.length} plaćenih faktura
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/invoices?status=paid">
                    Plaćene
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Profit ove godine</CardTitle>
                <CardDescription>{sr.finance.profitYear}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {snapshot.yearProfit === null ? (
                  <>
                    <p className="flex items-center gap-2 font-semibold text-amber-700">
                      <AlertTriangle className="h-4 w-4" />
                      {sr.finance.missingCost}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {sr.finance.missingCostDescription(snapshot.yearMissingCostCount)}
                    </p>
                    <Link href="/inventory?filter=missing-cost" className="text-sm font-medium text-primary underline-offset-2 hover:underline">
                      Proizvodi bez nabavne cene →
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold">{formatRsd(snapshot.yearProfit)}</p>
                    <p className="text-sm text-muted-foreground">
                      Trošak {formatRsd(snapshot.yearCost ?? 0)} · Marža{' '}
                      {formatPercent(snapshot.yearMarginPercent)}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Prihod ove godine</CardTitle>
                <CardDescription>Zbir naplate od 1. januara</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatRsd(snapshot.yearRevenue)}</p>
                <p className="text-sm text-muted-foreground mt-3">
                  Ukupno naplaćeno: {formatRsd(snapshot.allTimePaid)}
                </p>
              </CardContent>
            </Card>
          </div>

          <p className="text-sm text-muted-foreground">{sr.finance.profitNote}</p>

          <Card>
            <CardHeader className="space-y-3">
              <div>
                <CardTitle>Najprodavanije i najbolji kupci</CardTitle>
                <CardDescription>Plaćene fakture u periodu, bez PDV-a. Profit samo gde je poznata nabavna cena.</CardDescription>
              </div>
              <nav aria-label="Period" className="flex flex-wrap gap-2">
                {SALES_PERIODS.map((period) => (
                  <Button key={period} size="sm" variant={period === salesPeriod ? 'default' : 'outline'} asChild>
                    <Link href={`/finance?period=${period}`} aria-current={period === salesPeriod ? 'page' : undefined} scroll={false}>
                      {SALES_PERIOD_LABELS[period]}
                    </Link>
                  </Button>
                ))}
              </nav>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="min-w-0">
                <h3 className="mb-2 text-sm font-semibold">Proizvodi</h3>
                {bestProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nema naplaćene prodaje u ovom periodu.</p>
                ) : (
                  <ol className="divide-y text-sm">
                    {bestProducts.map((row, index) => (
                      <li key={`${row.productName}-${index}`} className="flex items-start justify-between gap-3 py-2">
                        <span className="min-w-0">
                          <span className="break-words font-medium [overflow-wrap:anywhere]">
                            {index + 1}. {row.productName}
                          </span>
                          <span className="block text-xs text-muted-foreground">{row.quantity} kom</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-semibold tabular-nums">{formatRsd(row.revenue)}</span>
                          <span className="block text-xs text-muted-foreground tabular-nums">
                            {row.profit === null ? 'profit: nedostaje nabavna' : `profit ${formatRsd(row.profit)}`}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="mb-2 text-sm font-semibold">Kupci</h3>
                {bestBuyers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nema naplaćene prodaje u ovom periodu.</p>
                ) : (
                  <ol className="divide-y text-sm">
                    {bestBuyers.map((row, index) => (
                      <li key={`${row.clientPib ?? ''}-${row.clientName}`}>
                        <Link
                          href={buyerInvoicesHref(row)}
                          className="flex items-start justify-between gap-3 py-2 hover:underline"
                        >
                          <span className="min-w-0">
                            <span className="break-words font-medium [overflow-wrap:anywhere]">
                              {index + 1}. {row.clientName}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {countSr(row.invoiceCount, 'plaćena faktura', 'plaćene fakture', 'plaćenih faktura')}
                            </span>
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums">{formatRsd(row.revenue)}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </CardContent>
          </Card>

          {debtors.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Ko mi duguje</CardTitle>
                <CardDescription>
                  Otvorene fakture po kupcu, sa PDV-om. Prvo kupci koji najduže kasne.
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {debtors.slice(0, DEBTORS_SHOWN).map((buyer) => (
                  <Link
                    key={`${buyer.clientPib ?? ''}-${buyer.clientName}`}
                    href={buyerInvoicesHref(buyer)}
                    className="flex items-start justify-between gap-3 px-6 py-3 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-medium [overflow-wrap:anywhere]">{buyer.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {countSr(buyer.openCount, 'otvorena faktura', 'otvorene fakture', 'otvorenih faktura')}
                        {buyer.clientPib ? ` · PIB ${buyer.clientPib}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold tabular-nums">{formatRsd(buyer.openTotal)}</p>
                      {buyer.maxDaysOverdue > 0 ? (
                        <p className="text-xs font-medium text-destructive">
                          Kasni {formatDaysOverdue(buyer.maxDaysOverdue)}
                          {buyer.overdueTotal < buyer.openTotal ? ` · ${formatRsd(buyer.overdueTotal)}` : ''}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Rok {buyer.oldestDueDate.toLocaleDateString('sr-RS')}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
                {debtors.length > DEBTORS_SHOWN ? (
                  <p className="px-6 py-3 text-sm text-muted-foreground">
                    Još kupaca: {debtors.length - DEBTORS_SHOWN}. Svi su na stranici Fakture.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Prihod po mesecu</CardTitle>
              <CardDescription>
                Knjiži se mesec u kom je faktura plaćena, ne mesec izdavanja.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {snapshot.months.map((month) => {
                const width =
                  maxMonthTotal > 0 ? Math.max((month.total / maxMonthTotal) * 100, month.total > 0 ? 4 : 0) : 0

                return (
                  <div key={month.key} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="capitalize font-medium">{month.label}</span>
                      <span className="tabular-nums font-semibold">{formatRsd(month.total)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {month.count === 0 ? 'Nema naplate' : countSr(month.count, 'naplaćena faktura', 'naplaćene fakture', 'naplaćenih faktura')}
                    </p>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Naplaćeno ovog meseca</CardTitle>
              <CardDescription>Fakture knjižene u tekućem mesecu</CardDescription>
            </CardHeader>
            <CardContent>
              {snapshot.thisMonthInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ovog meseca još nije naplaćena nijedna faktura.
                </p>
              ) : (
                <ul className="space-y-2">
                  {snapshot.thisMonthInvoices.map((invoice) => (
                    <li key={invoice.id}>
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
                      >
                        <span className="truncate">
                          <Wallet className="mr-2 inline h-4 w-4 text-muted-foreground" />
                          {invoice.invoiceNumber}
                          <span className="ml-2 text-muted-foreground">{invoice.clientName}</span>
                        </span>
                        <span className="ml-3 shrink-0 text-right">
                          <span className="block font-medium">
                            {formatRsd(invoiceBaseAmount(invoice))}
                          </span>
                          {invoice.hasCompleteCost ? (
                            <span className="block text-xs text-muted-foreground">
                              Profit {formatRsd(invoice.profit ?? 0)} · {formatPercent(invoice.marginPercent)}
                            </span>
                          ) : (
                            <span className="block text-xs text-amber-700">
                              {sr.finance.missingCost}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
