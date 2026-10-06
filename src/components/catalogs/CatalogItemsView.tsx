'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ProductImage } from '@/components/shared/ProductImage'
import { hasCatalogPrice, type CatalogDisplaySettings, type CatalogSection } from '@/lib/catalog-layout'
import { formatRsd } from '@/lib/invoice-finance'
import { cn } from '@/lib/utils'
import { sr } from '@/lib/ui-copy'

export type CatalogViewItem = {
  id: string
  originalPrice: unknown
  discountedPrice: unknown
  product: {
    name: string
    sku: string | null
    description: string | null
    imageUrl: string | null
  } | null
}

type CatalogItemsViewProps<T extends CatalogViewItem> = {
  sections: CatalogSection<T>[]
  display: CatalogDisplaySettings
}

function Prices({ item, display, large }: { item: CatalogViewItem; display: CatalogDisplaySettings; large?: boolean }) {
  if (!hasCatalogPrice(item.originalPrice)) {
    return <p className="text-sm font-semibold text-muted-foreground">{sr.catalog.priceOnRequest}</p>
  }
  const original = Number(item.originalPrice)
  const discounted = Number(item.discountedPrice)
  return (
    <div className="space-y-0.5">
      {display.showOriginalPrice && discounted < original && (
        <p className="text-sm text-muted-foreground line-through">{formatRsd(original)}</p>
      )}
      <p className={cn('font-bold text-primary', large ? 'text-base sm:text-xl' : 'text-sm sm:text-base')}>{formatRsd(discounted)}</p>
    </div>
  )
}

/** Web rendering of a catalog page: grid cards or a price list, with optional category headers. */
export function CatalogItemsView<T extends CatalogViewItem>({ sections, display }: CatalogItemsViewProps<T>) {
  const compact = display.layout === 'GRID_12'

  return (
    <div className="space-y-8">
      {sections.map((section, index) => (
        <section key={`${section.category ?? 'all'}-${index}`} className="space-y-4">
          {section.category && (
            <h3 className="border-b pb-2 text-xl font-semibold">{section.category}</h3>
          )}

          {display.layout === 'LIST' ? (
            <div className="divide-y rounded-lg border">
              {section.items.map((item) => {
                const product = item.product
                if (!product) return null
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3">
                    <ProductImage src={product.imageUrl} alt={product.name} size={48} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 break-words font-medium leading-tight" title={product.name}>
                        {product.name}
                      </p>
                      {display.showSku && product.sku && (
                        <p className="text-xs text-muted-foreground">{sr.catalog.skuLabel}: {product.sku}</p>
                      )}
                      {display.showDescription && product.description && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <Prices item={item} display={display} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div
              className={cn(
                'grid',
                // Two columns on phones (three when compact) so square product photos fill the card width.
                compact ? 'grid-cols-3 gap-2 sm:gap-3 md:grid-cols-4 lg:grid-cols-6' : 'grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3'
              )}
            >
              {section.items.map((item) => {
                const product = item.product
                if (!product) return null
                return (
                  <Card key={item.id}>
                    <CardContent className={compact ? 'p-2 sm:p-3' : 'p-3 sm:p-4'}>
                      <div className={compact ? 'space-y-1.5' : 'space-y-3'}>
                        <ProductImage
                          src={product.imageUrl}
                          alt={product.name}
                          className="aspect-square h-auto w-full"
                          imageClassName="object-contain"
                        />
                        <div className="min-w-0">
                          <h4
                            className={cn(
                              'line-clamp-2 break-words font-semibold leading-snug',
                              compact ? 'text-xs sm:text-sm' : 'mb-1 text-sm sm:text-base'
                            )}
                            title={product.name}
                          >
                            {product.name}
                          </h4>
                          {display.showSku && product.sku && (
                            <p className={cn('text-muted-foreground', compact ? 'text-xs' : 'mb-2 text-sm')}>
                              {sr.catalog.skuLabel}: <code className="break-all rounded bg-muted px-1">{product.sku}</code>
                            </p>
                          )}
                          {display.showDescription && product.description && (
                            <p
                              className={cn(
                                'text-muted-foreground',
                                compact ? 'line-clamp-2 text-xs' : 'mb-2 line-clamp-2 text-sm'
                              )}
                            >
                              {product.description}
                            </p>
                          )}
                          <div className={compact ? 'mt-1' : undefined}>
                            <Prices item={item} display={display} large={!compact} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
