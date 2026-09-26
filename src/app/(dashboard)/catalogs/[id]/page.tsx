'use client'

import { useMemo, useState, useEffect } from 'react'
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
import { Loader2, Edit, Download, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { ProductImage } from '@/components/shared/ProductImage'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { BlobProvider } from '@react-pdf/renderer'
import { CatalogPDF } from '@/components/catalogs/CatalogPDF'
import { CatalogSharing } from '@/components/catalogs/CatalogSharing'

async function fetchCatalog(id: string): Promise<CatalogWithItems & { profile: Profile }> {
  const response = await fetch(`/api/catalogs/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch catalog')
  }
  return response.json()
}

export default function CatalogDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const catalogId = params.id as string
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(12)
  const [currentPage, setCurrentPage] = useState(1)
  const [pdfItemsPerPage, setPdfItemsPerPage] = useState<4 | 12>(4)

  const { data: catalog, isLoading, error } = useQuery({
    queryKey: ['catalog', catalogId],
    queryFn: () => fetchCatalog(catalogId),
  })

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
    }).format(numPrice)
  }

  const formatDiscount = (discount: number | string | { toString(): string }) => {
    const numDiscount = typeof discount === 'string' 
      ? parseFloat(discount) 
      : typeof discount === 'number'
      ? discount
      : Number(discount.toString())
    return `${numDiscount.toFixed(2)}%`
  }

  // Calculate pagination for web view
  const items = catalog?.items || []
  const totalItems = items.length
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
  const currentPageItems = useMemo(() => {
    if (itemsPerPage === 'all') {
      return items
    }
    const startIndex = (currentPage - 1) * itemsPerPageNum
    const endIndex = startIndex + itemsPerPageNum
    return items.slice(startIndex, endIndex)
  }, [items, currentPage, itemsPerPage, itemsPerPageNum])

  // Memoize the PDF document to prevent infinite re-renders
  // Only recreate when catalog data, itemsPerPage, or pdfItemsPerPage changes
  const pdfDocument = useMemo(() => {
    if (!catalog) return null
    return <CatalogPDF 
      catalog={catalog} 
      itemsPerPage={itemsPerPage}
      pdfItemsPerPage={pdfItemsPerPage}
    />
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog?.id, itemsPerPage, pdfItemsPerPage])

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
            <h2 className="text-xl font-bold mb-2">Catalog Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The catalog you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Link href="/catalogs">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Catalogs
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const fileName = `${catalog.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_catalog.pdf`

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
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button variant="outline" className="min-h-11 w-full sm:w-auto" asChild>
            <Link href={`/catalogs/${catalog.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Izmeni
            </Link>
          </Button>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <span className="text-sm text-muted-foreground">PDF:</span>
            <Select
              value={pdfItemsPerPage.toString()}
              onValueChange={(value) => setPdfItemsPerPage(value === '4' ? 4 : 12)}
            >
              <SelectTrigger className="h-11 w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4 per page (Large)</SelectItem>
                <SelectItem value="12">12 per page (Compact)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {pdfDocument && (
            <BlobProvider 
              document={pdfDocument}
              key={`pdf-${itemsPerPage}-${pdfItemsPerPage}-${catalog?.id}`}
            >
              {({ blob, url, loading, error }) => {
                const handleDownload = () => {
                  if (blob && url) {
                    const link = document.createElement('a')
                    link.href = url
                    link.download = fileName
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  }
                }

                return (
                  <Button
                    onClick={handleDownload}
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
                )
              }}
            </BlobProvider>
          )}
        </div>
      </div>

      <CatalogSharing catalogId={catalog.id} />

      {/* Catalog Info */}
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Discount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {formatDiscount(catalog.discount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Products</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {catalog.items?.length || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {new Date(catalog.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {catalog.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
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
              <CardTitle>Products</CardTitle>
              <CardDescription>
                {catalog.items?.length || 0} product(s) in this catalog
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Items per page:</span>
              <Select
                value={itemsPerPage === 'all' ? 'all' : itemsPerPage.toString()}
                onValueChange={handleItemsPerPageChange}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 per page</SelectItem>
                  <SelectItem value="24">24 per page</SelectItem>
                  <SelectItem value="48">48 per page</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {catalog.items && catalog.items.length > 0 ? (
            <>
              <div className="space-y-4">
                {currentPageItems.map((item) => {
                const product = item.product
                if (!product) return null

                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      size={64}
                      className="shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-lg mb-1">
                        {product.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        SKU: <code className="bg-muted px-1 rounded">{product.sku}</code>
                      </p>
                      {product.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm line-through text-muted-foreground">
                            {formatPrice(Number(item.originalPrice))}
                          </p>
                          <p className="text-xl font-bold text-primary">
                            {formatPrice(Number(item.discountedPrice))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              </div>
              
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
