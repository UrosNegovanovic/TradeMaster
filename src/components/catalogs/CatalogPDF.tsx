'use client'

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import { CatalogWithItems } from '@/types/catalog'
import { Profile } from '@/types/profile'

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 70, // Add bottom padding to prevent content overlap with footer
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
    paddingBottom: 15,
    paddingTop: 10,
    borderBottom: '2 solid #e5e7eb',
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 15,
    flex: 1,
  },
  logoContainer: {
    width: 70,
    height: 70,
    border: '2 solid #e5e7eb',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  logo: {
    width: 70,
    height: 70,
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
    gap: 3,
    minWidth: 180,
  },
  contactInfo: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.4,
  },
  contactLabel: {
    fontSize: 8,
    color: '#6b7280',
    fontWeight: 'bold',
    marginBottom: 1,
  },
  titleSection: {
    marginBottom: 25,
  },
  catalogTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  catalogSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
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
  productCard: {
    width: '48%',
    marginBottom: 20,
    border: '1 solid #e5e7eb',
    borderRadius: 4,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  productImageContainer: {
    width: '100%',
    height: 120,
    marginBottom: 10,
    border: '1 solid #e5e7eb',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  productImage: {
    width: '100%',
    height: 120,
    objectFit: 'contain',
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
    fontFamily: 'Courier',
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
})

interface CatalogPDFProps {
  catalog: CatalogWithItems & { profile: Profile }
  itemsPerPage?: number | 'all' // Used for web preview only; PDF always uses A4 pagination
  pdfItemsPerPage?: 4 | 12 // PDF items per page: 4 (large) or 12 (compact)
}

export function CatalogPDF({ catalog, itemsPerPage = 'all', pdfItemsPerPage = 4 }: CatalogPDFProps) {
  const profile = catalog.profile
  const items = catalog.items || []
  
  // Determine if we're using compact (12 items) or large (4 items) layout
  const isCompact = pdfItemsPerPage === 12

  // Format currency
  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 2,
    }).format(numPrice)
  }

  // Check if URL is valid
  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url || url.trim() === '') return false
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  // Chunk items if itemsPerPage is a number
  const chunkItems = (
    itemsToChunk: typeof items,
    chunkSize: number
  ) => {
    const chunks: (typeof items)[] = []
    for (let i = 0; i < itemsToChunk.length; i += chunkSize) {
      chunks.push(itemsToChunk.slice(i, i + chunkSize) as typeof items)
    }
    return chunks
  }

  // Dynamic styles based on layout (4 or 12 items per page)
  const getDynamicStyles = () => {
    if (isCompact) {
      // Compact layout: 12 items per page (very small cards, small images to fit A4)
      return {
        productCard: {
          ...styles.productCard,
          padding: 6,
          marginBottom: 8,
        },
        productImageContainer: {
          ...styles.productImageContainer,
          height: 60,
          marginBottom: 4,
        },
        productImage: {
          ...styles.productImage,
          height: 60,
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
        productGrid: {
          ...styles.productGrid,
          gap: 8,
        },
      }
    } else {
      // Large layout: 4 items per page (larger cards, larger images)
      return {
        productCard: {
          ...styles.productCard,
          padding: 15,
          marginBottom: 25,
        },
        productImageContainer: {
          ...styles.productImageContainer,
          height: 180,
          marginBottom: 12,
        },
        productImage: {
          ...styles.productImage,
          height: 180,
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
        productGrid: {
          ...styles.productGrid,
          gap: 18,
        },
      }
    }
  }

  const dynamicStyles = getDynamicStyles()

  // Render a single page with header, products, and footer
  const renderPage = (
    pageItems: typeof items,
    pageNumber: number,
    totalPages: number
  ) => (
    <Page 
      key={pageNumber} 
      size="A4" 
      style={styles.page}
      wrap={false} // Prevent page break inside products
    >
      {/* Modern Header with All Information */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {isValidImageUrl(profile.logoUrl) ? (
            <Image src={profile.logoUrl!} style={styles.logo} />
          ) : (
            <View style={styles.logoContainer}>
              <Text style={{ fontSize: 8, color: '#9ca3af' }}>LOGO</Text>
            </View>
          )}
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>
              {profile.companyName || 'Company Name'}
            </Text>
            {catalog.clientName && (
              <Text style={styles.companyDetails}>
                Catalog for: {catalog.clientName}
              </Text>
            )}
            {catalog.name && (
              <Text style={styles.companyDetails}>
                {catalog.name}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          {profile.contactEmail && (
            <View style={{ marginBottom: 4 }}>
              <Text style={styles.contactLabel}>Email:</Text>
              <Text style={styles.contactInfo}>{profile.contactEmail}</Text>
            </View>
          )}
          {profile.contactPhone && (
            <View style={{ marginBottom: 4 }}>
              <Text style={styles.contactLabel}>Phone:</Text>
              <Text style={styles.contactInfo}>{profile.contactPhone}</Text>
            </View>
          )}
          {profile.address && (
            <View>
              <Text style={styles.contactLabel}>Address:</Text>
              <Text style={styles.contactInfo}>{profile.address}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Title Section - Simplified since name is in header */}
      <View style={styles.titleSection}>
        {catalog.notes && (
          <Text style={styles.notes}>{catalog.notes}</Text>
        )}
        <View style={styles.discountBadge}>
          <Text style={styles.discountBadgeText}>
            {Number(catalog.discount).toFixed(2)}% Discount Applied
          </Text>
        </View>
      </View>

      {/* Products Grid - with proper spacing for footer */}
      {pageItems.length > 0 ? (
        <View style={dynamicStyles.productGrid}>
          {pageItems.map((item) => {
            const product = item.product
            if (!product) return null

            return (
              <View key={item.id} style={dynamicStyles.productCard}>
                {/* Product Image */}
                {isValidImageUrl(product.imageUrl) ? (
                  <View style={dynamicStyles.productImageContainer}>
                    <Image
                      src={product.imageUrl!}
                      style={dynamicStyles.productImage}
                    />
                  </View>
                ) : (
                  <View style={dynamicStyles.productImageContainer}>
                    <Text style={{ fontSize: isCompact ? 7 : 8, color: '#9ca3af' }}>
                      No Image
                    </Text>
                  </View>
                )}

                {/* Product Info */}
                <View style={styles.productInfo}>
                  <Text style={dynamicStyles.productName}>{product.name}</Text>
                  <Text style={dynamicStyles.productSku}>SKU: {product.sku}</Text>
                  {product.description && (
                    <Text style={dynamicStyles.productDescription}>
                      {product.description}
                    </Text>
                  )}

                  {/* Pricing */}
                  <View style={styles.priceContainer}>
                    <Text style={dynamicStyles.originalPrice}>
                      {formatPrice(Number(item.originalPrice))}
                    </Text>
                    <Text style={dynamicStyles.discountedPrice}>
                      {formatPrice(Number(item.discountedPrice))}
                    </Text>
                  </View>
                </View>
              </View>
            )
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text>No products in this catalog.</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer} fixed>
        <View style={styles.footerLeft}>
          <Text>Page </Text>
          <Text>{pageNumber} / {totalPages}</Text>
        </View>
        <Text style={styles.footerRight}>Generated by TradeMaster</Text>
      </View>
    </Page>
  )

  // For PDF generation, always use pagination to ensure A4 format compatibility
  // Using pdfItemsPerPage (4 for large or 12 for compact) ensures A4 format without scaling
  // This ensures professional printing without content being cropped or scaled
  const PDF_ITEMS_PER_PAGE = pdfItemsPerPage
  
  // Always chunk items for PDF regardless of itemsPerPage parameter
  // (itemsPerPage is used for web preview only)
  const itemChunks = chunkItems(items, PDF_ITEMS_PER_PAGE)
  const totalPages = itemChunks.length

  return (
    <Document>
      {itemChunks.map((chunk, index) =>
        renderPage(chunk, index + 1, totalPages)
      )}
    </Document>
  )
}
