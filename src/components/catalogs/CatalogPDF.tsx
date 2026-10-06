'use client'

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  // Aliased: react-pdf Image has no alt attribute, unlike next/image
  Image as PdfImage,
  StyleSheet,
} from '@react-pdf/renderer'
import { CatalogWithItems } from '@/types/catalog'
import { Profile } from '@/types/profile'
import { PDF_FONT_FAMILY, registerPdfFonts } from '@/lib/pdf-fonts'
import {
  arrangeCatalogItems,
  chunkSectionsIntoPages,
  hasCatalogPrice,
  readCatalogDisplay,
  type CatalogSection,
} from '@/lib/catalog-layout'
import { sr } from '@/lib/ui-copy'

registerPdfFonts()

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 70, // Add bottom padding to prevent content overlap with footer
    fontSize: 10,
    fontFamily: PDF_FONT_FAMILY,
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  // Same header as the invoice PDF: white, bottom rule, logo + company on the left,
  // contacts on the right; all three blocks centered vertically, contacts flush right.
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottom: '2 solid #e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    flex: 1,
  },
  logoContainer: {
    width: 70,
    height: 70,
    padding: 4,
    border: '1 solid #e5e7eb',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: 'contain',
  },
  companyInfo: {
    gap: 3,
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  companyDetails: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 6,
    minWidth: 180,
    maxWidth: 220,
  },
  contactBlock: {
    alignItems: 'flex-end',
  },
  contactInfo: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.4,
    textAlign: 'right',
  },
  contactLabel: {
    fontSize: 8,
    color: '#6b7280',
    fontWeight: 'bold',
    marginBottom: 1,
    textAlign: 'right',
  },
  titleSection: {
    marginBottom: 25,
  },
  catalogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  catalogSubtitle: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  discountBadge: {
    backgroundColor: '#dbeafe',
    padding: 6,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  discountBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  notes: {
    fontSize: 10,
    color: '#4b5563',
    marginTop: 10,
    fontStyle: 'italic',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 60, // Add margin to prevent footer overlap
    paddingBottom: 10,
    flex: 1,
    minHeight: 0, // Allow flex to shrink if needed
  },
  // White card without an inner frame: a photo's own white background blends into the card,
  // so a portrait or landscape photo in a square box does not show empty bands.
  productCard: {
    width: '48%',
    marginBottom: 20,
    border: '1 solid #e5e7eb',
    borderRadius: 4,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  productImageContainer: {
    width: '100%',
    height: 120,
    marginBottom: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '100%',
    height: 120,
    objectFit: 'contain',
  },
  noImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  productInfo: {
    gap: 4,
  },
  productName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 6,
  },
  productDescription: {
    fontSize: 9,
    color: '#4b5563',
    marginBottom: 8,
    lineHeight: 1.4,
  },
  priceContainer: {
    marginTop: 8,
    gap: 2,
  },
  originalPrice: {
    fontSize: 10,
    color: '#9ca3af',
    textDecoration: 'line-through',
  },
  discountedPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    borderTop: '1 solid #e5e7eb',
    fontSize: 8,
    color: '#6b7280',
    backgroundColor: '#ffffff',
    height: 40,
  },
  footerLeft: {
    flexDirection: 'row',
    gap: 4,
  },
  footerRight: {
    fontStyle: 'italic',
  },
  emptyState: {
    padding: 40,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  priceOnRequest: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  // List layout (price list)
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: '#f3f4f6',
    borderBottom: '1 solid #d1d5db',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#374151',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottom: '1 solid #e5e7eb',
  },
  listImageCell: {
    width: 44,
    height: 36,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listImage: {
    width: 40,
    height: 36,
    objectFit: 'contain',
  },
  listNameCell: {
    flex: 1,
    paddingRight: 8,
  },
  listName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
  },
  listSku: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 1,
  },
  listDescription: {
    fontSize: 8,
    color: '#4b5563',
    marginTop: 2,
    lineHeight: 1.3,
  },
  listPriceCell: {
    width: 110,
    alignItems: 'flex-end',
  },
  listOriginalPrice: {
    fontSize: 8,
    color: '#9ca3af',
    textDecoration: 'line-through',
  },
  listPrice: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#059669',
  },
  listSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 14,
    marginBottom: 4,
    paddingBottom: 3,
    borderBottom: '1.5 solid #111827',
  },
})

type CatalogPdfItem = CatalogWithItems['items'][number]
type PdfTextStyle = (typeof styles)[keyof typeof styles]

interface CatalogPDFProps {
  catalog: CatalogWithItems & { profile: Profile }
}

const formatPrice = (price: unknown) =>
  new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'RSD',
    minimumFractionDigits: 2,
  }).format(Number(price))

const isValidImageUrl = (url: string | null | undefined): boolean => {
  if (!url || url.trim() === '') return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/** Layout, grouping, order and visible fields come from the catalog's saved display settings. */
export function CatalogPDF({ catalog }: CatalogPDFProps) {
  const profile = catalog.profile
  const display = readCatalogDisplay(catalog)
  const discount = Number(catalog.discount)
  const sections = arrangeCatalogItems(catalog.items || [], display, (item) => item.product?.category?.name)

  // Compact (12) or large (4) cards; the list layout flows rows across as many pages as needed.
  const isCompact = display.layout === 'GRID_12'
  const perPage = isCompact ? 12 : 4

  const renderPrices = (
    item: CatalogPdfItem,
    priceStyles: { original: PdfTextStyle; discounted: PdfTextStyle; onRequest: PdfTextStyle }
  ) => {
    if (!hasCatalogPrice(item.originalPrice)) {
      return <Text style={priceStyles.onRequest}>{sr.catalog.priceOnRequest}</Text>
    }
    const showOriginal =
      display.showOriginalPrice && Number(item.discountedPrice) < Number(item.originalPrice)
    return (
      <>
        {showOriginal && <Text style={priceStyles.original}>{formatPrice(item.originalPrice)}</Text>}
        <Text style={priceStyles.discounted}>{formatPrice(item.discountedPrice)}</Text>
      </>
    )
  }

  // Dynamic styles based on layout (4 or 12 items per page)
  const getDynamicStyles = () => {
    if (isCompact) {
      // Compact layout: 12 items per page as 4 columns x 3 rows; 122pt cards with a 110pt square photo.
      return {
        productCard: {
          ...styles.productCard,
          width: 122,
          padding: 6,
          marginBottom: 0,
        },
        productImageContainer: {
          ...styles.productImageContainer,
          height: 110,
          marginBottom: 5,
        },
        productImage: {
          ...styles.productImage,
          height: 110,
        },
        productName: {
          ...styles.productName,
          fontSize: 9,
          marginBottom: 1,
        },
        productSku: {
          ...styles.productSku,
          fontSize: 6,
          marginBottom: 2,
        },
        productDescription: {
          ...styles.productDescription,
          fontSize: 6,
          marginBottom: 3,
          lineHeight: 1.1,
        },
        discountedPrice: {
          ...styles.discountedPrice,
          fontSize: 10,
        },
        originalPrice: {
          ...styles.originalPrice,
          fontSize: 7,
        },
        priceOnRequest: {
          ...styles.priceOnRequest,
          fontSize: 8,
        },
        productGrid: {
          ...styles.productGrid,
          gap: 9,
        },
      }
    } else {
      // Large layout: 4 items per page as 2 x 2; the photo box is close to square (218 x 200pt).
      return {
        productCard: {
          ...styles.productCard,
          width: 248,
          padding: 15,
          marginBottom: 0,
        },
        productImageContainer: {
          ...styles.productImageContainer,
          height: 200,
          marginBottom: 12,
        },
        productImage: {
          ...styles.productImage,
          height: 200,
        },
        productName: {
          ...styles.productName,
          fontSize: 13,
          marginBottom: 5,
        },
        productSku: {
          ...styles.productSku,
          fontSize: 10,
          marginBottom: 7,
        },
        productDescription: {
          ...styles.productDescription,
          fontSize: 10,
          marginBottom: 10,
          lineHeight: 1.5,
        },
        discountedPrice: {
          ...styles.discountedPrice,
          fontSize: 16,
        },
        originalPrice: {
          ...styles.originalPrice,
          fontSize: 11,
        },
        priceOnRequest: {
          ...styles.priceOnRequest,
          fontSize: 12,
        },
        productGrid: {
          ...styles.productGrid,
          gap: 18,
        },
      }
    }
  }

  const dynamicStyles = getDynamicStyles()

  const header = (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.logoContainer}>
          {isValidImageUrl(profile.logoUrl) ? (
            <PdfImage src={profile.logoUrl!} style={styles.logo} />
          ) : (
            <Text style={{ fontSize: 8, color: '#9ca3af' }}>LOGO</Text>
          )}
        </View>
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>
            {profile.companyName || 'Naziv firme'}
          </Text>
          {profile.address && <Text style={styles.companyDetails}>{profile.address}</Text>}
          {profile.pib && (
            <Text style={styles.companyDetails}>
              PIB: {profile.pib}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.headerRight}>
        {profile.contactEmail && (
          <View style={styles.contactBlock}>
            <Text style={styles.contactLabel}>Email:</Text>
            <Text style={styles.contactInfo}>{profile.contactEmail}</Text>
          </View>
        )}
        {profile.contactPhone && (
          <View style={styles.contactBlock}>
            <Text style={styles.contactLabel}>Telefon:</Text>
            <Text style={styles.contactInfo}>{profile.contactPhone}</Text>
          </View>
        )}
      </View>
    </View>
  )

  const discountBadge = discount > 0 && (
    <View style={styles.discountBadge}>
      <Text style={styles.discountBadgeText}>
        {discount.toFixed(2)}% popust
      </Text>
    </View>
  )

  // Category title sits on the same row as the discount badge so grouped pages keep the same height.
  const titleSection = (category: string | null) => (
    <View style={styles.titleSection}>
      {catalog.name && <Text style={styles.catalogTitle}>{catalog.name}</Text>}
      {catalog.clientName && (
        <Text style={styles.catalogSubtitle}>Katalog za: {catalog.clientName}</Text>
      )}
      {catalog.notes && <Text style={styles.notes}>{catalog.notes}</Text>}
      {(category || discountBadge) && (
        <View style={styles.titleRow}>
          {category && <Text style={styles.categoryTitle}>{category}</Text>}
          {discountBadge}
        </View>
      )}
    </View>
  )

  const footer = (
    <View style={styles.footer} fixed>
      <Text
        style={styles.footerLeft}
        render={({ pageNumber, totalPages }) => `Strana ${pageNumber} / ${totalPages}`}
      />
      <Text style={styles.footerRight}>Generisao TradeMaster</Text>
    </View>
  )

  const emptyState = (
    <View style={styles.emptyState}>
      <Text>Nema proizvoda u ovom katalogu.</Text>
    </View>
  )

  const renderCard = (item: CatalogPdfItem) => {
    const product = item.product
    if (!product) return null
    return (
      <View key={item.id} style={dynamicStyles.productCard}>
        <View style={dynamicStyles.productImageContainer}>
          {isValidImageUrl(product.imageUrl) ? (
            <PdfImage src={product.imageUrl!} style={dynamicStyles.productImage} />
          ) : (
            <View style={styles.noImage}>
              <Text style={{ fontSize: isCompact ? 7 : 8, color: '#9ca3af' }}>Nema slike</Text>
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={dynamicStyles.productName}>{product.name}</Text>
          {display.showSku && (
            <Text style={dynamicStyles.productSku}>
              {sr.catalog.skuLabel}: {product.sku}
            </Text>
          )}
          {display.showDescription && product.description && (
            <Text style={dynamicStyles.productDescription}>{product.description}</Text>
          )}
          <View style={styles.priceContainer}>
            {renderPrices(item, {
              original: dynamicStyles.originalPrice,
              discounted: dynamicStyles.discountedPrice,
              onRequest: dynamicStyles.priceOnRequest,
            })}
          </View>
        </View>
      </View>
    )
  }

  const renderGridPage = (page: CatalogSection<CatalogPdfItem> | null, index: number) => (
    <Page key={index} size="A4" style={styles.page} wrap={false}>
      {header}
      {titleSection(page?.category ?? null)}
      {page && page.items.length > 0 ? (
        <View style={dynamicStyles.productGrid}>{page.items.map(renderCard)}</View>
      ) : (
        emptyState
      )}
      {footer}
    </Page>
  )

  // Without any product photo the list becomes a compact text price list.
  const listHasImages = sections.some((section) =>
    section.items.some((item) => isValidImageUrl(item.product?.imageUrl))
  )

  const renderListRow = (item: CatalogPdfItem) => {
    const product = item.product
    if (!product) return null
    return (
      <View key={item.id} style={styles.listRow} wrap={false}>
        {listHasImages && (
          <View style={styles.listImageCell}>
            {isValidImageUrl(product.imageUrl) && <PdfImage src={product.imageUrl!} style={styles.listImage} />}
          </View>
        )}
        <View style={styles.listNameCell}>
          <Text style={styles.listName}>{product.name}</Text>
          {display.showSku && (
            <Text style={styles.listSku}>
              {sr.catalog.skuLabel}: {product.sku}
            </Text>
          )}
          {display.showDescription && product.description && (
            <Text style={styles.listDescription}>{product.description}</Text>
          )}
        </View>
        <View style={styles.listPriceCell}>
          {renderPrices(item, {
            original: styles.listOriginalPrice,
            discounted: styles.listPrice,
            onRequest: styles.priceOnRequest,
          })}
        </View>
      </View>
    )
  }

  if (display.layout === 'LIST') {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          {header}
          {titleSection(null)}
          <View style={styles.listHeaderRow} fixed>
            {listHasImages && <Text style={{ width: 52 }} />}
            <Text style={{ flex: 1 }}>Proizvod</Text>
            <Text style={{ width: 110, textAlign: 'right' }}>Cena</Text>
          </View>
          {sections.length === 0 && emptyState}
          {sections.map((section, index) => (
            // Every category after the first starts on a new page; a long category continues over its own pages.
            <View key={section.category ?? index} break={Boolean(section.category) && index > 0}>
              {section.category && (
                <Text style={styles.listSectionTitle} minPresenceAhead={40}>
                  {section.category}
                </Text>
              )}
              {section.items.map(renderListRow)}
            </View>
          ))}
          {footer}
        </Page>
      </Document>
    )
  }

  // Grid layouts: fixed number of cards per A4 page, every category starts on a new page.
  const pages = chunkSectionsIntoPages(sections, perPage)

  return (
    <Document>
      {pages.length > 0 ? pages.map(renderGridPage) : renderGridPage(null, 0)}
    </Document>
  )
}
