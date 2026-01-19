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
import { InvoiceWithItems } from '@/types/invoice'
import { Profile } from '@/types/profile'

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 120, // Add bottom padding for footer
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    paddingBottom: 15,
    borderBottom: '2 solid #e5e7eb',
    position: 'relative',
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
  invoiceInfo: {
    marginBottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  invoiceInfoLeft: {
    gap: 8,
  },
  invoiceInfoRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },
  invoiceLabel: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  invoiceValue: {
    fontSize: 11,
    color: '#111827',
  },
  clientInfo: {
    marginBottom: 30,
    alignItems: 'flex-end',
  },
  clientTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  clientDetails: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.5,
  },
  table: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    padding: 10,
    borderBottom: '1 solid #e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottom: '1 solid #f3f4f6',
  },
  colItem: {
    width: '30%',
    fontSize: 10,
    color: '#111827',
  },
  colQty: {
    width: '12%',
    fontSize: 10,
    color: '#111827',
    textAlign: 'right',
  },
  colPrice: {
    width: '18%',
    fontSize: 10,
    color: '#111827',
    textAlign: 'right',
  },
  colDiscount: {
    width: '15%',
    fontSize: 10,
    color: '#111827',
    textAlign: 'right',
  },
  colTotal: {
    width: '20%',
    fontSize: 10,
    color: '#111827',
    textAlign: 'right',
    fontWeight: 'bold',
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 40,
  },
  summaryBox: {
    width: 250,
    border: '1 solid #e5e7eb',
    padding: 15,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 11,
    color: '#111827',
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTop: '2 solid #111827',
    marginTop: 5,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    paddingTop: 20,
    borderTop: '1 solid #e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  footerSection: {
    gap: 5,
  },
  footerTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 3,
  },
  footerText: {
    fontSize: 9,
    color: '#6b7280',
    lineHeight: 1.4,
  },
  footerLeft: {
    flex: 1,
    marginRight: 20,
  },
  footerRight: {
    flex: 1,
    marginLeft: 20,
  },
  signatureLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
})

interface InvoicePDFProps {
  invoice: InvoiceWithItems & { profile: Profile }
}

export function InvoicePDF({ invoice }: InvoicePDFProps) {
  const profile = invoice.profile

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

  // Format currency
  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 2,
    }).format(numPrice)
  }

  // Format date
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('sr-RS')
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Logo and Company Info - Fixed on every page */}
        <View style={styles.header} fixed>
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
              {profile.address && (
                <Text style={styles.companyDetails}>{profile.address}</Text>
              )}
              {profile.pib && (
                <Text style={styles.companyDetails}>PIB: {profile.pib}</Text>
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
              <View>
                <Text style={styles.contactLabel}>Phone:</Text>
                <Text style={styles.contactInfo}>{profile.contactPhone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Invoice Info */}
        <View style={styles.invoiceInfo}>
          <View style={styles.invoiceInfoLeft}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View>
              <Text style={styles.invoiceLabel}>Invoice Number:</Text>
              <Text style={styles.invoiceValue}>{invoice.invoiceNumber}</Text>
            </View>
            {/* Bill To moved to left side */}
            <View style={{ marginTop: 15 }}>
              <Text style={styles.clientTitle}>Bill To:</Text>
              <View style={styles.clientDetails}>
                <Text>{invoice.clientName}</Text>
                {invoice.clientAddress && <Text>{invoice.clientAddress}</Text>}
              </View>
            </View>
          </View>
          <View style={styles.invoiceInfoRight}>
            <View style={{ marginBottom: 15 }}>
              <Text style={styles.invoiceLabel}>Status:</Text>
              <Text style={styles.invoiceValue}>{invoice.status}</Text>
            </View>
            {/* Date and Due Date moved to right side */}
            <View>
              <Text style={styles.invoiceLabel}>Date:</Text>
              <Text style={styles.invoiceValue}>{formatDate(invoice.createdAt)}</Text>
            </View>
            <View>
              <Text style={styles.invoiceLabel}>Due Date:</Text>
              <Text style={styles.invoiceValue}>{formatDate(invoice.dueDate)}</Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.colItem, styles.tableHeaderText]}>Item</Text>
            <Text style={[styles.colQty, styles.tableHeaderText]}>Qty</Text>
            <Text style={[styles.colPrice, styles.tableHeaderText]}>Unit Price</Text>
            <Text style={[styles.colDiscount, styles.tableHeaderText]}>Discount</Text>
            <Text style={[styles.colTotal, styles.tableHeaderText]}>Total</Text>
          </View>

          {/* Table Rows */}
          {invoice.items.map((item) => {
            const discount = Number(item.discount || 0)
            const discountText = discount > 0 ? `${discount.toFixed(2)}%` : '-'
            
            return (
              <View key={item.id} style={styles.tableRow}>
                <Text style={styles.colItem}>{item.productName}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colPrice}>{formatPrice(Number(item.unitPrice))}</Text>
                <Text style={styles.colDiscount}>{discountText}</Text>
                <Text style={styles.colTotal}>{formatPrice(Number(item.total))}</Text>
              </View>
            )
          })}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>
                {formatPrice(Number(invoice.totalAmount))}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer - Fixed position on every page */}
        <View style={styles.footer} fixed>
          <View style={styles.footerLeft}>
            <Text style={styles.footerTitle}>Banking Information</Text>
            <Text style={styles.footerText}>
              Please include invoice number when making payment.
            </Text>
            <Text style={styles.footerText}>
              Payment terms: Net {Math.ceil((new Date(invoice.dueDate).getTime() - new Date(invoice.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
            </Text>
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.signatureLabel}>
              Authorized Signature: _____________________________
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
