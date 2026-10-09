'use client'

import { useMemo, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { CatalogWithItems } from '@/types/catalog'
import { Profile } from '@/types/profile'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Edit, ArrowLeft, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { catalogProformaHref } from '@/lib/catalog-proforma'
import { CatalogItemsView } from '@/components/catalogs/CatalogItemsView'
import {
  arrangeCatalogItems,
  CATALOG_LAYOUT_LABELS,
  CATALOG_SORT_LABELS,
  countSectionItems,
  paginateSections,
  readCatalogDisplay,
} from '@/lib/catalog-layout'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CatalogSharing } from '@/components/catalogs/CatalogSharing'
import { formatPercent } from '@/lib/sr-format'

const CatalogPdfDownload = dynamic(() => import('@/components/catalogs/CatalogPdfDownload'), {
  ssr: false,
  loading: () => (
    <Button disabled>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      PDF…
    </Button>
  ),
})

async function fetchCatalog(id: string): Promise<CatalogWithItems & { profile: Profile }> {
  const response = await fetch(`/api/catalogs/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch catalog')
  }
  return response.json()
}

export default function CatalogDetailsPage() {
  const params = useParams()
  const catalogId = params.id as string
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(12)
  const [currentPage, setCurrentPage] = useState(1)

  const { data: catalog, isLoading, error } = useQuery({
    queryKey: ['catalog', catalogId],
    queryFn: () => fetchCatalog(catalogId),
  })

  const formatDiscount = (discount: number | string | { toString(): string }) => {
    const numDiscount = typeof discount === 'string' 
      ? parseFloat(discount) 
      : typeof discount === 'number'
      ? discount
      : Number(discount.toString())
    return formatPercent(numDiscount)
  }

  // Preview uses the same layout, order and grouping as the PDF and the public link
  const display = readCatalogDisplay(catalog)
  const sections = useMemo(
    () => arrangeCatalogItems(catalog?.items ?? [], display, (item) => item.product?.category?.name),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog, display.sortMode, display.groupByCategory]
  )
  const totalItems = countSectionItems(sections)
  const itemsPerPageNum = itemsPerPage === 'all' ? totalItems : itemsPerPage
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / itemsPerPageNum)
  
  // Reset to page 1 when catalog changes
  useEffect(() => {
    setCurrentPage(1)
  }, [catalogId])

  // Reset to page 1 when itemsPerPage changes
  const handleItemsPerPageChange = (value: string) => {
    const newValue = value === 'all' ? 'all' : parseInt(value, 10)
    setItemsPerPage(newValue)
    setCurrentPage(1)
  }

  // Get current page items for web view
  const currentSections = useMemo(
    () => paginateSections(sections, currentPage, itemsPerPage),
    [sections, currentPage, itemsPerPage]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !catalog) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-bold mb-2">Katalog nije pronađen</h2>
            <p className="text-muted-foreground mb-4">Katalog ne postoji ili je obrisan.</p>
            <Link href="/catalogs">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Nazad na kataloge
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 min-h-11" asChild>
            <Link href="/catalogs">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Nazad na kataloge
            </Link>
          </Button>
          <h1 className="text-2xl font-bold lg:text-3xl">{catalog.name}</h1>
          {catalog.clientName && (
            <p className="mt-1 text-muted-foreground">
              Klijent: {catalog.clientName}
            </p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {CATALOG_LAYOUT_LABELS[display.layout]} · {CATALOG_SORT_LABELS[display.sortMode]}
            {display.groupByCategory ? ' · po kategorijama' : ''}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button variant="outline" className="min-h-11 w-full sm:w-auto" asChild>
            <Link href={`/catalogs/${catalog.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Izmeni
            </Link>
          </Button>
          <CatalogPdfDownload catalog={catalog} />
          {catalog.items && catalog.items.length > 0 ? (
            <Button className="min-h-11 w-full sm:w-auto" asChild>
              <Link href={catalogProformaHref(catalog.id)}>
                <FileText className="mr-2 h-4 w-4" />
                Napravi predračun
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <CatalogSharing
        catalogId={catalog.id}
        catalogName={catalog.name}
        companyName={catalog.profile?.companyName}
        viewCount={catalog.shareViewCount}
        lastViewedAt={catalog.shareLastViewedAt}
      />

      {/* Catalog Info */}
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Popust</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {formatDiscount(catalog.discount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Proizvodi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {catalog.items?.length || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Napravljen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {new Date(catalog.createdAt).toLocaleDateString('sr-RS')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {catalog.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Napomena</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {catalog.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Products List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Proizvodi</CardTitle>
              <CardDescription>U katalogu: {catalog.items?.length || 0}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Po strani:</span>
              <Select
                value={itemsPerPage === 'all' ? 'all' : itemsPerPage.toString()}
                onValueChange={handleItemsPerPageChange}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 po strani</SelectItem>
                  <SelectItem value="24">24 po strani</SelectItem>
                  <SelectItem value="48">48 po strani</SelectItem>
                  <SelectItem value="all">Svi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {catalog.items && catalog.items.length > 0 ? (
            <>
              <CatalogItemsView sections={currentSections} display={display} />

              {/* Pagination Controls */}
              {itemsPerPage !== 'all' && totalPages > 1 && (
                <nav
                  className="mt-6 min-w-0 border-t pt-4"
                  aria-label="Paginacija"
                >
                  <div className="flex min-w-0 flex-col items-center gap-3 sm:flex-row sm:justify-between">
                    <p className="text-center text-sm text-muted-foreground sm:text-left">
                      Prikaz {((currentPage - 1) * itemsPerPageNum) + 1}–{' '}
                      {Math.min(currentPage * itemsPerPageNum, totalItems)} od{' '}
                      {totalItems} proizvoda
                    </p>
                    <div className="flex w-full min-w-0 items-center justify-center gap-2 sm:w-auto sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-11 min-w-11 shrink-0 px-3"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        aria-label="Prethodna"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="ml-1 hidden sm:inline">Prethodna</span>
                      </Button>
                      <p className="shrink-0 whitespace-nowrap px-1 text-sm tabular-nums text-muted-foreground">
                        Strana {currentPage} / {totalPages}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-11 min-w-11 shrink-0 px-3"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        aria-label="Sledeća"
                      >
                        <span className="mr-1 hidden sm:inline">Sledeća</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </nav>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No products in this catalog.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
