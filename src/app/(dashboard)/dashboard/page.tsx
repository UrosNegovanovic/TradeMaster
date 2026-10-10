import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { InvoiceStatus, MovementType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  FileText,
  Package,
  Warehouse,
} from 'lucide-react'
import Link from 'next/link'
import { Decimal } from '@prisma/client/runtime/library'
import { QuickScanButton } from '@/components/dashboard/QuickScanButton'
import { PaymentReminderButtons } from '@/components/dashboard/PaymentReminderButtons'
import { invoiceSharePath } from '@/lib/public-invoice'
import { canRemindPayment } from '@/lib/sef-status'
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist'
import { AnalyticsMilestones } from '@/components/analytics/AnalyticsMilestones'
import { InstallAppCard } from '@/components/pwa/InstallAppCard'
import { getOnboardingProgress } from '@/lib/onboarding'
import { formatLocalYmd, startOfLocalDay, startOfLocalMonth, startOfLocalTomorrow } from '@/lib/local-date'
import { formatRsd, sumInvoiceBaseAmounts } from '@/lib/invoice-finance'
import { countSr } from '@/lib/sr-format'
import { findSavedClientForInvoice } from '@/lib/client-fill'
import { FilePlus2, PackagePlus } from 'lucide-react'
import { fetchLowStockProducts } from '@/lib/low-stock'
import { sr } from '@/lib/ui-copy'
import { DASHBOARD_OVERDUE_PREVIEW, daysOverdue, formatDaysOverdue } from '@/lib/overdue-invoices'
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
 * - "Dodato danas" uses Product.createdAt in the Europe/Belgrade calendar day
 *   [startOfToday, startOfTomorrow). It is not complete stock-receipt history.
 * - "Današnji ulazi" uses StockMovement IN rows for the same Belgrade day, including
 *   restocks of an existing SKU row.
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
    overdueAgg,
    overdueInvoices,
    productCount,
    invoiceCount,
    sharedCatalogCount,
    sharedInvoiceCount,
    missingPriceCount,
    lowStock,
    todayMovementGroups,
    todayMovements,
    paidThisMonth,
    reminderClients,
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
      where: { profileId, documentType: 'INVOICE', status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.DRAFT] } },
      _count: true,
      _sum: { totalAmount: true },
    }),
    prisma.invoice.findMany({
      where: { profileId, documentType: 'INVOICE', status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.DRAFT] } },
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
        documentType: 'INVOICE',
        status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.DRAFT] },
        dueDate: { lt: startOfToday },
      },
    }),
    // Kasni naplata: issued (UNPAID) invoices past the due day. Drafts were never sent, so they are not receivables.
    prisma.invoice.aggregate({
      where: { profileId, documentType: 'INVOICE', status: InvoiceStatus.UNPAID, dueDate: { lt: startOfToday } },
      _count: true,
      _sum: { totalAmount: true },
    }),
    prisma.invoice.findMany({
      where: { profileId, documentType: 'INVOICE', status: InvoiceStatus.UNPAID, dueDate: { lt: startOfToday } },
      select: {
        id: true,
        invoiceNumber: true,
        clientName: true,
        clientPib: true,
        totalAmount: true,
        dueDate: true,
        shareEnabled: true,
        shareToken: true,
        sefStatus: true,
      },
      orderBy: { dueDate: 'asc' },
      take: DASHBOARD_OVERDUE_PREVIEW,
    }),
    prisma.product.count({
      where: { profileId },
    }),
    prisma.invoice.count({
      where: { profileId, documentType: 'INVOICE' },
    }),
    // Analytics milestones only (no personal data leaves the server).
    prisma.catalog.count({ where: { profileId, shareEnabled: true } }),
    prisma.invoice.count({ where: { profileId, documentType: 'INVOICE', shareEnabled: true } }),
    prisma.product.count({
      where: { profileId, price: { lte: 0 } },
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
    // ROADMAP A9.17: "Naplaćeno ovog meseca", the same figure as "Prihod ovog meseca" on Finansije (bez PDV-a).
    prisma.invoice.findMany({
      where: { profileId, documentType: 'INVOICE', status: InvoiceStatus.PAID, paidAt: { gte: startOfLocalMonth() } },
      select: { totalAmount: true, vatAmount: true },
    }),
    // ROADMAP A9.21: saved buyers' contacts, so a reminder opens straight to the buyer.
    prisma.client.findMany({
      where: { profileId, OR: [{ phone: { not: null } }, { email: { not: null } }] },
      select: { name: true, pib: true, phone: true, email: true },
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
    overdueTotal: Number(overdueAgg._sum.totalAmount ?? 0),
    overdueLateCount: overdueAgg._count,
    overdueInvoices,
    productCount,
    invoiceCount,
    sharedCatalogCount,
    sharedInvoiceCount,
    missingPriceCount,
    lowStock,
    todayTotals,
    todayIntakes: previewTodayIntakes(todayMovements),
    todayMovementPreview: previewTodayMovements(todayMovements),
    paidThisMonthTotal: sumInvoiceBaseAmounts(paidThisMonth),
    reminderClients,
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
    overdueTotal,
    overdueLateCount,
    overdueInvoices,
    productCount,
    invoiceCount,
    sharedCatalogCount,
    sharedInvoiceCount,
    missingPriceCount,
    lowStock,
    todayTotals,
    todayIntakes,
    todayMovementPreview,
    paidThisMonthTotal,
    reminderClients,
  } = await getDashboardData(profile.id)

  const onboarding = getOnboardingProgress({
    companyName: profile.companyName,
    pib: profile.pib,
    productCount,
    invoiceCount,
  })
  const hiddenLowStock = Math.max(0, lowStock.length - DASHBOARD_LOW_STOCK_PREVIEW)
  const hiddenOpenInvoices = Math.max(0, openCount - openInvoices.length)
  const hiddenOverdue = Math.max(0, overdueLateCount - overdueInvoices.length)

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
          <p className="mt-1.5 text-xs text-muted-foreground">{sr.scan.missingCostNote}</p>
          {/* ROADMAP A9.17: the next step is one tap away. */}
          <nav aria-label="Brze akcije" className="mt-3 grid grid-cols-3 gap-2">
            <Button variant="outline" className="h-auto min-h-11 flex-col gap-1 px-2 py-2 text-xs" asChild>
              <Link href="/invoices/new">
                <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                Nova faktura
              </Link>
            </Button>
            <Button variant="outline" className="h-auto min-h-11 flex-col gap-1 px-2 py-2 text-xs" asChild>
              <Link href="/invoices/new?type=proforma">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Novi predračun
              </Link>
            </Button>
            <Button variant="outline" className="h-auto min-h-11 flex-col gap-1 px-2 py-2 text-xs" asChild>
              <Link href="/warehouse?action=ulaz">
                <PackagePlus className="h-4 w-4" aria-hidden="true" />
                Ulaz robe
              </Link>
            </Button>
          </nav>
        </div>
      </div>

      <AnalyticsMilestones
        profileCreatedAt={profile.createdAt.toISOString()}
        productCount={productCount}
        invoiceCount={invoiceCount}
        sharedCatalogCount={sharedCatalogCount}
        sharedInvoiceCount={sharedInvoiceCount}
      />

      <InstallAppCard />

      <OnboardingChecklist progress={onboarding} />

      {overdueLateCount > 0 ? (
        <Card className="min-w-0 border-destructive/40">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
              Kasni naplata
            </CardTitle>
            <CardDescription>
              {countSr(overdueLateCount, 'faktura je', 'fakture su', 'faktura je')} van roka, ukupno{' '}
              <span className="font-semibold text-foreground">{formatRsd(overdueTotal)}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
            <ul className="space-y-2">
              {overdueInvoices.map((invoice) => (
                <li key={invoice.id}>
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="break-words font-medium [overflow-wrap:anywhere]">
                        {invoice.invoiceNumber} · {invoice.clientName}
                      </span>
                      <span className="text-xs text-destructive">
                        Kasni {formatDaysOverdue(daysOverdue(invoice.dueDate))} (rok {formatDashboardDate(invoice.dueDate)})
                      </span>
                    </span>
                    <span className="min-w-0 font-medium tabular-nums [overflow-wrap:anywhere]">
                      {formatRsd(Number(invoice.totalAmount))}
                    </span>
                  </Link>
                  {/* No payment reminder for an invoice the buyer rejected (or that was cancelled) in SEF. */}
                  {canRemindPayment(invoice.sefStatus) ? (
                  <div className="mt-1.5">
                    <PaymentReminderButtons
                      invoiceId={invoice.id}
                      invoiceNumber={invoice.invoiceNumber}
                      amount={Number(invoice.totalAmount)}
                      dueDate={invoice.dueDate.toISOString()}
                      companyName={profile.companyName}
                      sharePath={
                        invoice.shareEnabled && invoice.shareToken ? invoiceSharePath(invoice.shareToken) : null
                      }
                      recipient={findSavedClientForInvoice(reminderClients, {
                        clientName: invoice.clientName,
                        clientPib: invoice.clientPib ?? '',
                      })}
                    />
                  </div>
                  ) : (
                    <p className="mt-1.5 text-xs text-destructive">Kupac je odbio fakturu u SEF-u. Ispravite je pre naplate.</p>
                  )}
                </li>
              ))}
            </ul>
            {hiddenOverdue > 0 ? (
              <p className="text-xs text-muted-foreground">Još {hiddenOverdue} van roka na listi faktura</p>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <Link href="/invoices">
                <FileText className="mr-2 h-4 w-4" />
                Otvori fakture
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
                {missingPriceCount > 0 ? (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                    Nepotpuno: {missingPriceCount} {missingPriceCount === 1 ? 'artikal nema cenu' : 'artikala nema cenu'}
                  </p>
                ) : null}
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
              <span className="mt-1 block">
                Naplaćeno ovog meseca:{' '}
                <Link href="/finance" className="font-medium text-foreground underline-offset-2 hover:underline">
                  {formatRsd(paidThisMonthTotal)}
                </Link>{' '}
                (bez PDV-a)
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
            {openCount === 0 ? (
              <p className="text-sm text-muted-foreground">Nema otvorenih faktura.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xl font-bold tabular-nums [overflow-wrap:anywhere]">{formatRsd(openReceivables)}</p>
                  <p className="text-sm text-muted-foreground">
                    {countSr(openCount, 'otvorena faktura', 'otvorene fakture', 'otvorenih faktura')}
                  </p>
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
                ? 'Isti prag kao u Magacinu: stanje šifre je na minimalnoj zalihi ili ispod nje.'
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
                      <p className="text-xs text-muted-foreground">Šifra: {product.sku}</p>
                      {product.missingPrice ? (
                        <Link href={`/inventory?edit=${product.id}`} className="text-xs font-medium text-amber-700 underline dark:text-amber-400">
                          Nedostaje cena · Dodaj cenu
                        </Link>
                      ) : null}
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
                <Badge variant="success">
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
                      <Badge variant="success" className="mt-0.5">
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
