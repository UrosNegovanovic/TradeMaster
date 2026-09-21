import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, FileText, Wallet } from 'lucide-react'
import { buildFinanceSnapshot, formatRsd, type FinanceInvoiceInput } from '@/lib/invoice-finance'
import { PageHeader } from '@/components/layout/PageHeader'

export default async function FinancePage() {
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
    where: { profileId: profile.id },
    select: {
      id: true,
      invoiceNumber: true,
      clientName: true,
      status: true,
      totalAmount: true,
      createdAt: true,
      paidAt: true,
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
        createdAt: invoice.createdAt,
        paidAt: invoice.paidAt,
      })
    )
  )

  const maxMonthTotal = Math.max(...snapshot.months.map((month) => month.total), 0)
  const hasAnyInvoices = invoices.length > 0

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Finansije"
        description="Potraživanja su otvorene fakture. Prihod se knjiži na dan kada fakturu obeležite kao plaćenu."
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
          <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Potraživanja</CardTitle>
                <CardDescription>Iznos na otvorenim fakturama</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-2xl font-bold">{formatRsd(snapshot.receivables)}</p>
                <p className="text-sm text-muted-foreground">
                  {snapshot.openCount} otvorenih faktura
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

          <Card>
            <CardHeader>
              <CardTitle>Prihod po mesecu</CardTitle>
              <CardDescription>
                Knjiži se mesec u koj je faktura plaćena, ne mesec izdavanja.
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
                      {month.count === 0 ? 'Nema naplate' : `${month.count} naplaćenih`}
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
                        <span className="ml-3 shrink-0 font-medium">
                          {formatRsd(Number(invoice.totalAmount))}
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
