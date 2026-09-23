import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { InvoiceStatus, MovementType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  FileText,
  Package,
  Plus,
  Warehouse,
} from 'lucide-react'
import Link from 'next/link'
import { Decimal } from '@prisma/client/runtime/library'
import { QuickScanButton } from '@/components/dashboard/QuickScanButton'
import { formatLocalYmd, startOfLocalDay, startOfLocalTomorrow } from '@/lib/local-date'
import { formatRsd } from '@/lib/invoice-finance'
import { fetchLowStockProducts } from '@/lib/low-stock'
import {
  DASHBOARD_LOW_STOCK_PREVIEW,
  DASHBOARD_OPEN_INVOICE_PREVIEW,
  formatDashboardDate,
  formatDashboardTime,
  isInvoiceOverdue,
  movementTotalsFromGroups,
  previewTodayIntakes,
  previewTodayMovements,
} from '@/lib/dashboard-activity'

function formatPieces(value: number): string {
  return `${new Intl.NumberFormat('sr-RS').format(value)} komada`
}

/**
 * Dashboard metrics assumptions:
 * - Product.price is the catalog/invoice unit price (sale/base), not a dedicated purchase cost.
 *   Stock value label is therefore "Prodajna vrednost lagera".
 * - Daily batching allows multiple Product rows per SKU. Totals sum row quantity and
 *   row quantity × price; they are not unique-SKU counts.
 * - "Dodato danas" uses Product.createdAt in the server-local calendar day
 *   [startOfToday, startOfTomorrow). It is not complete stock-receipt history.
 * - "Današnji ulazi" uses StockMovement IN rows for the same local day, including
 *   restocks of an existing daily batch.
 * - Europe/Belgrade timezone policy is deferred.
 * - "Otvorene fakture" are DRAFT + UNPAID. The headline is receivables
 *   (sum of open totals). PAID invoices are booked as cash-basis revenue.
 */
async function getDashboardData(profileId: string) {
  const startOfToday = startOfLocalDay()
  const startOfTomorrow = startOfLocalTomorrow()
  const todayParam = formatLocalYmd(startOfToday)
  const todayRange = { gte: startOfToday, lt: startOfTomorrow }

  const [
    stockRows,
    addedToday,
    openAgg,
    openInvoices,
    overdueCount,
    productCount,
    lowStock,
    todayMovementGroups,
    todayMovements,
  ] = await Promise.all([
    prisma.$queryRaw<Array<{ totalQuantity: bigint | number | null; stockValue: Decimal | number | null }>>(
      Prisma.sql`
        SELECT
          COALESCE(SUM(quantity), 0) AS "totalQuantity",
          COALESCE(SUM(quantity * price), 0) AS "stockValue"
        FROM products
        WHERE "profileId" = ${profileId}
      `
    ),
    prisma.product.aggregate({
      where: {
        profileId,
        createdAt: todayRange,
      },
      _count: true,
      _sum: { quantity: true },
    }),
    prisma.invoice.aggregate({
      where: { profileId, status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.DRAFT] } },
      _count: true,
      _sum: { totalAmount: true },
    }),
    prisma.invoice.findMany({
      where: { profileId, status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.DRAFT] } },
      select: {
        id: true,
        invoiceNumber: true,
        clientName: true,
        totalAmount: true,
        status: true,
        dueDate: true,
      },
      orderBy: { createdAt: 'desc' },
      take: DASHBOARD_OPEN_INVOICE_PREVIEW,
    }),
    prisma.invoice.count({
      where: {
        profileId,
        status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.DRAFT] },
        dueDate: { lt: startOfToday },
      },
    }),
    prisma.product.count({
      where: { profileId },
    }),
    fetchLowStockProducts(profileId),
    prisma.stockMovement.groupBy({
      by: ['type'],
      where: { profileId, createdAt: todayRange },
      _count: { _all: true },
      _sum: { quantity: true },
    }),
    prisma.stockMovement.findMany({
      where: { profileId, createdAt: todayRange },
      select: {
        id: true,
        type: true,
        quantity: true,
        reason: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
  ])

  const stock = stockRows[0]
  const totalQuantity = Number(stock?.totalQuantity ?? 0)
  const stockValue = Number(stock?.stockValue ?? 0)
  const todayTotals = movementTotalsFromGroups(
    todayMovementGroups.map((group) => ({
      type: group.type,
      count: group._count._all,
      quantity: group._sum.quantity ?? 0,
    }))
  )

  return {
    todayParam,
    totalQuantity,
    stockValue,
    addedTodayRows: addedToday._count,
    addedTodayQuantity: addedToday._sum.quantity ?? 0,
    openCount: openAgg._count,
    openReceivables: Number(openAgg._sum.totalAmount ?? 0),
    openInvoices,
    overdueCount,
    productCount,
    lowStock,
    todayTotals,
    todayIntakes: previewTodayIntakes(todayMovements),
    todayMovementPreview: previewTodayMovements(todayMovements),
  }
}

export default async function DashboardPage() {
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

  const {
    todayParam,
    totalQuantity,
    stockValue,
    addedTodayRows,
    addedTodayQuantity,
    openCount,
    openReceivables,
    openInvoices,
    overdueCount,
    productCount,
    lowStock,
    todayTotals,
    todayIntakes,
    todayMovementPreview,
  } = await getDashboardData(profile.id)

  const showEmptyCta = productCount === 0 && openCount === 0
  const hiddenLowStock = Math.max(0, lowStock.length - DASHBOARD_LOW_STOCK_PREVIEW)
  const hiddenOpenInvoices = Math.max(0, openCount - openInvoices.length)

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Početna</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lager, današnji unosi i otvorene fakture
          </p>
        </div>
        <div className="w-full sm:max-w-sm">
          <QuickScanButton presentation="hero" />
        </div>
      </div>

      {showEmptyCta ? (
        <Card>
          <CardHeader>
            <CardTitle>Još nema asortimana</CardTitle>
            <CardDescription>
              Skenirajte prvi proizvod ili ga dodajte ručno da biste videli lager.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/inventory">
                <Plus className="mr-2 h-4 w-4" />
                Dodaj ručno
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-3">
        <Card className="min-w-0">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
            <CardTitle className="text-lg">Lager</CardTitle>
            <details className="text-xs text-muted-foreground">
              <summary className="min-h-6 cursor-pointer rounded-sm py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">O stanju lagera</summary>
              <p className="pt-1">Količine svih unosa se sabiraju, uključujući više unosa istog proizvoda. Prodajna vrednost je zbir količine × prodajne cene.</p>
            </details>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Ukupna količina</p>
                <p className="text-xl font-bold tabular-nums [overflow-wrap:anywhere]">{formatPieces(totalQuantity)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Prodajna vrednost lagera</p>
                <p className="text-xl font-bold tabular-nums [overflow-wrap:anywhere]">{formatRsd(stockValue)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="sm" asChild>
                <Link href="/inventory">
                  Asortiman
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/warehouse">
                  <Warehouse className="mr-2 h-4 w-4" />
                  Magacin
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
            <CardTitle className="text-lg">Dodato danas</CardTitle>
            <details className="text-xs text-muted-foreground">
              <summary className="min-h-6 cursor-pointer rounded-sm py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Šta se računa?</summary>
              <p className="pt-1">Unosi proizvoda kreirani danas i njihove trenutne količine. Dopune ranijih unosa nisu uključene. Dan se računa prema vremenu servera.</p>
            </details>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
            {addedTodayRows === 0 ? (
              <p className="text-sm text-muted-foreground">Danas još nije dodat nijedan proizvod.</p>
            ) : (
              <div className="space-y-1">
                <p className="text-xl font-bold tabular-nums [overflow-wrap:anywhere]">{addedTodayRows} unosa</p>
                <p className="text-sm text-muted-foreground">
                  {formatPieces(addedTodayQuantity)}
                </p>
              </div>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/inventory?date=${todayParam}`}>
                <Package className="mr-2 h-4 w-4" />
                Otvori današnji asortiman
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
            <CardTitle className="text-lg">Otvorene fakture</CardTitle>
            <CardDescription>
              {overdueCount > 0
                ? `${overdueCount} van roka od ${openCount} otvorenih`
                : 'Nacrti i neplaćene fakture'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
            {openCount === 0 ? (
              <p className="text-sm text-muted-foreground">Nema otvorenih faktura.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xl font-bold tabular-nums [overflow-wrap:anywhere]">{formatRsd(openReceivables)}</p>
                  <p className="text-sm text-muted-foreground">{openCount} otvorenih</p>
                </div>
                <ul className="space-y-2">
                  {openInvoices.map((invoice) => {
                    const overdue = isInvoiceOverdue(invoice.dueDate)
                    return (
                      <li key={invoice.id}>
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
                        >
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                              <span className="break-words font-medium [overflow-wrap:anywhere]">
                                {invoice.invoiceNumber}
                              </span>
                              <span className="break-words text-muted-foreground [overflow-wrap:anywhere]">
                                {invoice.clientName}
                              </span>
                            </span>
                            <span className={overdue ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
                              {overdue ? 'Van roka' : 'Rok'} {formatDashboardDate(invoice.dueDate)}
                            </span>
                          </span>
                          <span className="min-w-0 font-medium tabular-nums [overflow-wrap:anywhere]">
                            {formatRsd(Number(invoice.totalAmount))}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
                {hiddenOpenInvoices > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Još {hiddenOpenInvoices} na listi faktura
                  </p>
                ) : null}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/invoices">
                  <FileText className="mr-2 h-4 w-4" />
                  Otvorene
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/finance">Finansije</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
            <CardTitle className="text-lg">Nizak lager</CardTitle>
            <CardDescription>
              {lowStock.length === 0
                ? 'Isti prag kao na Magacinu: količina SKU-a je na ili ispod minimuma.'
                : `${lowStock.length} ${lowStock.length === 1 ? 'proizvod je' : 'proizvoda su'} na minimumu`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nema proizvoda na minimumu.</p>
            ) : (
              <ul className="space-y-2">
                {lowStock.slice(0, DASHBOARD_LOW_STOCK_PREVIEW).map((product) => (
                  <li
                    key={product.id}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-medium leading-tight [overflow-wrap:anywhere]">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {product.quantity} / {product.minStock} kom
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {product.quantity === 0 ? 'Nema na stanju' : 'Nizak lager'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {hiddenLowStock > 0 ? (
              <p className="text-xs text-muted-foreground">Još {hiddenLowStock} na Magacinu</p>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <Link href="/warehouse">
                <Warehouse className="mr-2 h-4 w-4" />
                Otvori Magacin
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
            <CardTitle className="text-lg">Današnji ulazi</CardTitle>
            <details className="text-xs text-muted-foreground">
              <summary className="min-h-6 cursor-pointer rounded-sm py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Šta se računa?</summary>
              <p className="pt-1">
                IN kretanja od ponoći — skener i ručni ulaz, uključujući dopune postojećeg unosa. Kartica „Dodato danas“ broji samo nove redove proizvoda.
              </p>
            </details>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
            {todayTotals.intakeCount === 0 ? (
              <p className="text-sm text-muted-foreground">Danas još nema ulaza. Skenirajte robu ili je unesite ručno.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xl font-bold tabular-nums [overflow-wrap:anywhere]">
                    {todayTotals.intakeCount} {todayTotals.intakeCount === 1 ? 'ulaz' : 'ulaza'}
                  </p>
                  <p className="text-sm text-muted-foreground">{formatPieces(todayTotals.intakeQuantity)}</p>
                </div>
                <ul className="space-y-2">
                  {todayIntakes.map((movement) => (
                    <li
                      key={movement.id}
                      className="flex min-h-11 items-start justify-between gap-3 rounded-md border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="break-words font-medium leading-tight [overflow-wrap:anywhere]">
                          {movement.product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {movement.product.sku} · {formatDashboardTime(movement.createdAt)}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">+{movement.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/inventory?date=${todayParam}`}>
                <Package className="mr-2 h-4 w-4" />
                Današnji asortiman
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0">
        <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
          <CardTitle className="text-lg">Današnja kretanja</CardTitle>
          <CardDescription>Ulazi i izlazi od ponoći, isto knjiženje kao na Magacinu</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
          {todayTotals.intakeCount === 0 && todayTotals.outCount === 0 ? (
            <p className="text-sm text-muted-foreground">Danas još nema kretanja na lageru.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default" className="bg-green-600 hover:bg-green-600">
                  <ArrowUp className="mr-1 h-3 w-3" />
                  {todayTotals.intakeCount} ulaz · +{todayTotals.intakeQuantity}
                </Badge>
                <Badge variant="destructive">
                  <ArrowDown className="mr-1 h-3 w-3" />
                  {todayTotals.outCount} izlaz · −{todayTotals.outQuantity}
                </Badge>
              </div>
              <ul className="space-y-2">
                {todayMovementPreview.map((movement) => (
                  <li
                    key={movement.id}
                    className="flex min-h-11 items-start gap-3 rounded-md border px-3 py-2"
                  >
                    {movement.type === MovementType.IN ? (
                      <Badge variant="default" className="mt-0.5 bg-green-600 hover:bg-green-600">
                        <ArrowUp className="mr-1 h-3 w-3" />
                        UL
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="mt-0.5">
                        <ArrowDown className="mr-1 h-3 w-3" />
                        IZ
                      </Badge>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-medium leading-tight [overflow-wrap:anywhere]">
                        {movement.product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {movement.product.sku} · {formatDashboardTime(movement.createdAt)}
                        {movement.reason ? ` · ${movement.reason}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {movement.type === MovementType.IN ? '+' : '−'}
                      {movement.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href="/warehouse">
              <Warehouse className="mr-2 h-4 w-4" />
              Istorija na Magacinu
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
