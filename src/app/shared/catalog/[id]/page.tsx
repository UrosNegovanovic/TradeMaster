'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { PublicCatalog } from '@/types/public-catalog'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2, Image as ImageIcon, Search } from 'lucide-react'
import Image from 'next/image'
import { getSafeEmailHref, getSafePhoneHref } from '@/lib/public-catalog'
import {
  arrangeCatalogItems,
  countSectionItems,
  filterCatalogItems,
  listCatalogCategories,
  paginateSections,
  readCatalogDisplay,
} from '@/lib/catalog-layout'
import { CatalogItemsView } from '@/components/catalogs/CatalogItemsView'
import { cn } from '@/lib/utils'
import { sr } from '@/lib/ui-copy'

type PublicItem = PublicCatalog['items'][number]
const categoryOf = (item: PublicItem) => item.product?.categoryName

async function fetchCatalog(id: string): Promise<PublicCatalog> {
  // Token links are the share contract. Catalog-id links only work while shareEnabled is on.
  const endpoint = /^[a-f0-9]{64}$/.test(id)
    ? `/api/shared/catalog/${id}`
    : `/api/public/catalogs/${id}`
  const response = await fetch(endpoint, { cache: 'no-store' })
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
    // Each fetch counts as an open of the link (ROADMAP A8); refocusing the tab is not a new open.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)

  const display = readCatalogDisplay(catalog?.display)
  const items = useMemo(() => catalog?.items ?? [], [catalog])
  const categories = useMemo(() => listCatalogCategories(items, categoryOf), [items])

  // Search and category chips narrow the list; layout, order and grouping come from the owner's settings.
  const sections = useMemo(() => {
    const filtered = filterCatalogItems(items, { query, category }, (item) => ({
      text: [item.product?.name, item.product?.sku, item.product?.description],
      category: categoryOf(item),
    }))
    return arrangeCatalogItems(filtered, display, categoryOf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, category, display.sortMode, display.groupByCategory])

  const totalItems = countSectionItems(sections)
  const itemsPerPageNum = itemsPerPage === 'all' ? totalItems : itemsPerPage
  const totalPages = itemsPerPage === 'all' ? 1 : Math.max(1, Math.ceil(totalItems / itemsPerPageNum))
  const currentSections = useMemo(
    () => paginateSections(sections, currentPage, itemsPerPage),
    [sections, currentPage, itemsPerPage]
  )

  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url || url.trim() === '') return false
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
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
  const emailHref = getSafeEmailHref(profile?.contactEmail)
  const phoneHref = getSafePhoneHref(profile?.contactPhone)

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
                  {profile?.companyName || 'Katalog proizvoda'}
                </h1>
                {catalog.clientName && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Katalog za: <span className="font-semibold text-foreground">{catalog.clientName}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Right: Contact Information */}
            <div className="flex flex-col gap-2 text-sm">
              {profile?.contactEmail && emailHref && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">Email:</span>
                  <a
                    href={emailHref}
                    className="text-primary hover:underline font-medium"
                  >
                    {profile.contactEmail}
                  </a>
                </div>
              )}
              {profile?.contactPhone && phoneHref && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">Telefon:</span>
                  <a
                    href={phoneHref}
                    className="text-primary hover:underline font-medium"
                  >
                    {profile.contactPhone}
                  </a>
                </div>
              )}
              {profile?.address && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">Adresa:</span>
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
          {Number(catalog.discount) > 0 && (
            <div className="mt-4">
              <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                {Number(catalog.discount).toFixed(0)}% popusta
              </span>
            </div>
          )}

          {items.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder={sr.catalog.searchPlaceholder}
                  aria-label={sr.catalog.searchPlaceholder}
                  className="h-11 pl-9"
                />
              </div>
              {categories.length > 1 && (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Kategorije">
                  {[null, ...categories].map((name) => (
                    <button
                      key={name ?? 'all'}
                      type="button"
                      aria-pressed={category === name}
                      onClick={() => {
                        setCategory(name)
                        setCurrentPage(1)
                      }}
                      className={cn(
                        'min-h-9 rounded-full border px-4 text-sm font-medium transition-colors',
                        category === name
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'bg-background hover:bg-muted'
                      )}
                    >
                      {name ?? sr.catalog.allCategories}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Products */}
        {items.length > 0 ? (
          <>
            {totalItems === 0 ? (
              <p className="py-12 text-center text-muted-foreground">{sr.catalog.noResults}</p>
            ) : (
              <CatalogItemsView sections={currentSections} display={display} />
            )}

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
