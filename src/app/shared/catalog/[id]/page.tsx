'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CatalogWithItems } from '@/types/catalog'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { ProductImage } from '@/components/shared/ProductImage'

async function fetchCatalog(id: string): Promise<CatalogWithItems & { profile: any }> {
  const response = await fetch(`/api/public/catalogs/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch catalog')
  }
  return response.json()
}

export default function PublicCatalogPage({ params }: { params: { id: string } }) {
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(12)
  const [currentPage, setCurrentPage] = useState(1)

  const { data: catalog, isLoading, error } = useQuery({
    queryKey: ['public-catalog', params.id],
    queryFn: () => fetchCatalog(params.id),
  })

  // Calculate pagination for web view
  const items = catalog?.items || []
  const totalItems = items.length
  const itemsPerPageNum = itemsPerPage === 'all' ? totalItems : itemsPerPage
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / itemsPerPageNum)

  // Get current page items for web view
  const currentPageItems = useMemo(() => {
    if (itemsPerPage === 'all') {
      return items
    }
    const startIndex = (currentPage - 1) * itemsPerPageNum
    const endIndex = startIndex + itemsPerPageNum
    return items.slice(startIndex, endIndex)
  }, [items, currentPage, itemsPerPage, itemsPerPageNum])

  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url || url.trim() === '') return false
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
    }).format(numPrice)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !catalog) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Katalog nije pronađen</h1>
          <p className="text-muted-foreground">
            Link je nevažeći ili je katalog uklonjen.
          </p>
        </div>
      </div>
    )
  }

  const profile = catalog.profile

  return (
    <div className="min-h-screen bg-background">
      {/* Modern Header with Company Info */}
      <header className="border-b bg-gradient-to-r from-card to-card/95 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Left: Logo and Company Name */}
            <div className="flex items-center gap-4">
              {isValidImageUrl(profile?.logoUrl) ? (
                <div className="relative h-20 w-20 rounded-lg border-2 border-primary/20 overflow-hidden bg-white shadow-sm">
                  <Image
                    src={profile.logoUrl!}
                    alt={profile?.companyName || 'Company Logo'}
                    fill
                    className="object-contain p-2"
                  />
                </div>
              ) : (
                <div className="h-20 w-20 rounded-lg border-2 border-primary/20 flex items-center justify-center bg-muted shadow-sm">
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {profile?.companyName || 'Company Catalog'}
                </h1>
                {catalog.clientName && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Catalog for: <span className="font-semibold text-foreground">{catalog.clientName}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Right: Contact Information */}
            <div className="flex flex-col gap-2 text-sm">
              {profile?.contactEmail && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">Email:</span>
                  <a
                    href={`mailto:${profile.contactEmail}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {profile.contactEmail}
                  </a>
                </div>
              )}
              {profile?.contactPhone && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">Phone:</span>
                  <a
                    href={`tel:${profile.contactPhone}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {profile.contactPhone}
                  </a>
                </div>
              )}
              {profile?.address && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">Address:</span>
                  <span className="text-foreground">{profile.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Catalog Title and Controls */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-3xl font-bold mb-2">{catalog.name}</h2>
              {catalog.notes && (
                <p className="text-muted-foreground max-w-2xl">{catalog.notes}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Po strani:</span>
                <Select
                  value={itemsPerPage === 'all' ? 'all' : itemsPerPage.toString()}
                  onValueChange={(value) => {
                    const newValue = value === 'all' ? 'all' : parseInt(value, 10)
                    setItemsPerPage(newValue)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 po strani</SelectItem>
                    <SelectItem value="24">24 po strani</SelectItem>
                    <SelectItem value="48">48 po strani</SelectItem>
                    <SelectItem value="all">Sve</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold">
              {Number(catalog.discount).toFixed(0)}% popusta
            </span>
          </div>
        </div>

        {/* Products Grid */}
        {catalog.items && catalog.items.length > 0 ? (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {currentPageItems.map((item) => {
              const product = item.product
              if (!product) return null

              return (
                <Card key={item.id}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Product Image */}
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-48 w-full"
                        imageClassName="object-contain"
                      />

                      {/* Product Info */}
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          SKU: <code className="bg-muted px-1 rounded">{product.sku}</code>
                        </p>
                        {product.description && (
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {product.description}
                          </p>
                        )}

                        {/* Pricing */}
                        <div className="space-y-1">
                          <p className="text-sm line-through text-muted-foreground">
                            {formatPrice(Number(item.originalPrice))}
                          </p>
                          <p className="text-xl font-bold text-primary">
                            {formatPrice(Number(item.discountedPrice))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            </div>

            {/* Pagination Controls */}
            {itemsPerPage !== 'all' && totalPages > 1 && (
              <nav
                className="mt-8 min-w-0 border-t pt-6"
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
                    >
                      Prethodna
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
                    >
                      Sledeća
                    </Button>
                  </div>
                </div>
              </nav>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nema proizvoda u ovom katalogu.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
