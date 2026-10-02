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
      <p className={cn('font-bold text-primary', large ? 'text-xl' : 'text-base')}>{formatRsd(discounted)}</p>
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
                      <p className="font-medium leading-tight">{product.name}</p>
                      {display.showSku && product.sku && (
                        <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
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
                'grid gap-4',
                compact ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'gap-6 md:grid-cols-2 lg:grid-cols-3'
              )}
            >
              {section.items.map((item) => {
                const product = item.product
                if (!product) return null
                return (
                  <Card key={item.id}>
                    <CardContent className={compact ? 'p-3' : 'p-6'}>
                      <div className={compact ? 'space-y-2' : 'space-y-4'}>
                        <ProductImage
                          src={product.imageUrl}
                          alt={product.name}
                          className={compact ? 'h-28 w-full' : 'h-48 w-full'}
                          imageClassName="object-contain"
                        />
                        <div>
                          <h4 className={cn('font-semibold', compact ? 'text-sm' : 'mb-1 text-lg')}>{product.name}</h4>
                          {display.showSku && product.sku && (
                            <p className={cn('text-muted-foreground', compact ? 'text-xs' : 'mb-2 text-sm')}>
                              SKU: <code className="rounded bg-muted px-1">{product.sku}</code>
                            </p>
                          )}
                          {display.showDescription && product.description && (
                            <p
                              className={cn(
                                'text-muted-foreground',
                                compact ? 'line-clamp-2 text-xs' : 'mb-4 line-clamp-2 text-sm'
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
