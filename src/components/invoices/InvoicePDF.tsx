'use client'

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Svg,
  Path,
  StyleSheet,
} from '@react-pdf/renderer'
import type { Profile } from '@/types/profile'
import { summarizeVat } from '@/lib/invoice-vat'
import { PDF_FONT_FAMILY, registerPdfFonts } from '@/lib/pdf-fonts'
import { deliveryAddressToPrint, type DeliveryNoteDetails } from '@/lib/delivery-note'
import { buildIpsQrPayload, ipsQrMatrix } from '@/lib/ips-qr'
import { isPaidInvoiceStatus } from '@/lib/invoice-status'
import { invoicePdfFacts } from '@/lib/invoice-pdf-facts'
import { localDaysBetween } from '@/lib/local-date'
import { documentLabels } from '@/lib/document-type'
import { formatPercent } from '@/lib/sr-format'

registerPdfFonts()

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 120, // Add bottom padding for footer
    fontSize: 10,
    fontFamily: PDF_FONT_FAMILY,
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
  colVat: {
    width: '9%',
    fontSize: 10,
    color: '#111827',
    textAlign: 'right',
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
  summaryLabelGroup: {
    flexShrink: 1,
    paddingRight: 8,
  },
  summaryNote: {
    fontSize: 8,
    color: '#9ca3af',
    marginTop: 2,
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
  paymentQr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  paymentQrText: {
    maxWidth: 180,
    gap: 3,
  },
  paymentQrTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111827',
  },
  paymentQrHint: {
    fontSize: 9,
    color: '#6b7280',
  },
  paymentQrBox: {
    padding: 6,
    backgroundColor: '#ffffff',
    border: '1 solid #e5e7eb',
  },
})

type Amount = number | string | { toString(): string }

/** What the PDF prints. Both the owner's invoice and the public shared-invoice DTO fit this shape. */
export type InvoicePdfData = {
  invoiceNumber: string
  createdAt: Date | string
  dueDate: Date | string
  clientName: string
  clientAddress: string | null
  clientPib: string | null
  /** Note printed on this document (ROADMAP A9.22). */
  note?: string | null
  status: string
  totalAmount: Amount
  vatEnabled?: boolean
  /** PROFORMA prints as PREDRAČUN; missing means invoice. */
  documentType?: string | null
  items: Array<{
    id: string
    productName: string
    quantity: number
    unitPrice: Amount
    discount: Amount | null
    vatRate?: Amount | null
    total: Amount
  }>
  profile: Pick<Profile, 'companyName' | 'contactEmail' | 'contactPhone' | 'address' | 'pib' | 'giroAccount' | 'logoUrl'> &
    Partial<Pick<Profile, 'registrationNumber' | 'inVatSystem'>>
  /** Owner's PDF only: buyer's matični broj from Kupci (same lookup as the SEF XML). */
  buyerRegistrationNumber?: string | null
}

/** `delivery` prints the otpremnica of an issued invoice: same lines and quantities, no prices. */
export type InvoicePdfVariant = 'document' | 'delivery'

interface InvoicePDFProps {
  invoice: InvoicePdfData
  variant?: InvoicePdfVariant
  /** Otpremnica only: details typed in before printing (not stored). */
  delivery?: DeliveryNoteDetails
}

export function InvoicePDF({ invoice, variant = 'document', delivery }: InvoicePDFProps) {
  if (variant === 'delivery') {
    return <DeliveryNotePDF invoice={invoice} delivery={delivery} />
  }

  const profile = invoice.profile
  const labels = documentLabels(invoice.documentType)
  const isProformaDoc = invoice.documentType === 'PROFORMA'
  // vatEnabled is the snapshot taken when the invoice was issued; old invoices have it false.
  const vatEnabled = invoice.vatEnabled === true
  const vat = vatEnabled ? summarizeVat(invoice.items) : null
  const narrow = vatEnabled
    ? {
        item: { width: '24%' },
        qty: { width: '10%' },
        price: { width: '17%' },
        discount: { width: '13%' },
        total: { width: '27%' },
      }
    : { item: {}, qty: {}, price: {}, discount: {}, total: {} }

  // IPS QR only for invoices still awaiting payment, and only when the account/amount form a valid request.
  const ipsPayload = isPaidInvoiceStatus(invoice.status)
    ? null
    : buildIpsQrPayload({
        giroAccount: profile.giroAccount,
        companyName: profile.companyName,
        address: profile.address,
        amount: Number(invoice.totalAmount),
        invoiceNumber: invoice.invoiceNumber,
      })
  const ipsQr = ipsPayload ? ipsQrMatrix(ipsPayload) : null
  const facts = invoicePdfFacts({
    createdAt: invoice.createdAt,
    documentType: invoice.documentType,
    vatEnabled,
    sellerAddress: profile.address,
    sellerInVatSystem: profile.inVatSystem,
  })

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
            ) : null}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>
                {profile.companyName || 'Naziv firme'}
              </Text>
              {profile.address && (
                <Text style={styles.companyDetails}>{profile.address}</Text>
              )}
              {profile.pib && (
                <Text style={styles.companyDetails}>PIB: {profile.pib}</Text>
              )}
              {profile.registrationNumber ? (
                <Text style={styles.companyDetails}>MB: {profile.registrationNumber}</Text>
              ) : null}
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
                <Text style={styles.contactLabel}>Telefon:</Text>
                <Text style={styles.contactInfo}>{profile.contactPhone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Invoice Info */}
        <View style={styles.invoiceInfo}>
          <View style={styles.invoiceInfoLeft}>
            <Text style={styles.invoiceTitle}>{labels.pdfTitle}</Text>
            <View>
              <Text style={styles.invoiceLabel}>{labels.numberLabel}:</Text>
              <Text style={styles.invoiceValue}>{invoice.invoiceNumber}</Text>
            </View>
            <View style={{ marginTop: 15 }}>
              <Text style={styles.clientTitle}>Kupac:</Text>
              <View style={styles.clientDetails}>
                <Text>{invoice.clientName}</Text>
                {invoice.clientAddress && <Text>{invoice.clientAddress}</Text>}
                {invoice.clientPib && <Text>PIB: {invoice.clientPib}</Text>}
                {invoice.buyerRegistrationNumber ? <Text>MB: {invoice.buyerRegistrationNumber}</Text> : null}
              </View>
            </View>
          </View>
          <View style={styles.invoiceInfoRight}>
            {facts.issuePlace ? (
              <View>
                <Text style={styles.invoiceLabel}>Mesto izdavanja:</Text>
                <Text style={styles.invoiceValue}>{facts.issuePlace}</Text>
              </View>
            ) : null}
            <View>
              <Text style={styles.invoiceLabel}>Datum izdavanja:</Text>
              <Text style={styles.invoiceValue}>{formatDate(facts.issueDate)}</Text>
            </View>
            {facts.supplyDate ? (
              <View>
                <Text style={styles.invoiceLabel}>Datum prometa:</Text>
                <Text style={styles.invoiceValue}>{formatDate(facts.supplyDate)}</Text>
              </View>
            ) : null}
            <View>
              <Text style={styles.invoiceLabel}>{labels.dueLabel}:</Text>
              <Text style={styles.invoiceValue}>{formatDate(invoice.dueDate)}</Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.colItem, narrow.item, styles.tableHeaderText]}>Stavka</Text>
            <Text style={[styles.colQty, narrow.qty, styles.tableHeaderText]}>Kol.</Text>
            <Text style={[styles.colPrice, narrow.price, styles.tableHeaderText]}>
              {vatEnabled ? 'Jed. cena bez PDV' : 'Jed. cena'}
            </Text>
            <Text style={[styles.colDiscount, narrow.discount, styles.tableHeaderText]}>Popust</Text>
            {vatEnabled ? (
              <Text style={[styles.colVat, styles.tableHeaderText]}>PDV</Text>
            ) : null}
            <Text style={[styles.colTotal, narrow.total, styles.tableHeaderText]}>
              {vatEnabled ? 'Iznos bez PDV' : 'Ukupno'}
            </Text>
          </View>

          {/* Table Rows */}
          {invoice.items.map((item) => {
            const discount = Number(item.discount || 0)
            const discountText = discount > 0 ? formatPercent(discount) : '-'
            
            return (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.colItem, narrow.item]}>{item.productName}</Text>
                <Text style={[styles.colQty, narrow.qty]}>{item.quantity}</Text>
                <Text style={[styles.colPrice, narrow.price]}>{formatPrice(Number(item.unitPrice))}</Text>
                <Text style={[styles.colDiscount, narrow.discount]}>{discountText}</Text>
                {vatEnabled ? (
                  <Text style={styles.colVat}>{Number(item.vatRate ?? 0)}%</Text>
                ) : null}
                <Text style={[styles.colTotal, narrow.total]}>{formatPrice(Number(item.total))}</Text>
              </View>
            )
          })}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryBox}>
            {vat ? (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Osnovica:</Text>
                  <Text style={styles.summaryValue}>{formatPrice(vat.base)}</Text>
                </View>
                {vat.groups.map((group) => (
                  <View key={group.rate} style={styles.summaryRow}>
                    <View style={styles.summaryLabelGroup}>
                      <Text style={styles.summaryLabel}>PDV {group.rate}%:</Text>
                      <Text style={styles.summaryNote}>
                        osnovica {formatPrice(group.base)}
                      </Text>
                    </View>
                    <Text style={styles.summaryValue}>{formatPrice(group.vat)}</Text>
                  </View>
                ))}
              </>
            ) : null}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{vat ? 'Ukupno za uplatu:' : 'Ukupno:'}</Text>
              <Text style={styles.totalValue}>
                {formatPrice(Number(invoice.totalAmount))}
              </Text>
            </View>
          </View>
        </View>

        {invoice.note ? (
          <View style={{ marginTop: 16 }} wrap={false}>
            <Text style={styles.invoiceLabel}>Napomena:</Text>
            <Text style={{ fontSize: 9, color: '#374151', marginTop: 2 }}>{invoice.note}</Text>
          </View>
        ) : null}

        {ipsQr ? (
          <View style={styles.paymentQr} wrap={false}>
            <View style={styles.paymentQrText}>
              <Text style={styles.paymentQrTitle}>Plati QR kodom</Text>
              <Text style={styles.paymentQrHint}>
                Skenirajte u mobilnom bankarstvu (NBS IPS QR). Iznos i broj {isProformaDoc ? 'predračuna' : 'fakture'} su već popunjeni.
              </Text>
            </View>
            <View style={styles.paymentQrBox}>
              <Svg width={84} height={84} viewBox={`0 0 ${ipsQr.size} ${ipsQr.size}`}>
                <Path d={ipsQr.path} fill="#000000" />
              </Svg>
            </View>
          </View>
        ) : null}

        {/* Footer - Fixed position on every page */}
        <View style={styles.footer} fixed>
          <View style={styles.footerLeft}>
            <Text style={styles.footerTitle}>Žiro-račun</Text>
            {profile.giroAccount ? (
              <Text style={styles.footerText}>{profile.giroAccount}</Text>
            ) : null}
            {facts.nonVatNote ? <Text style={styles.footerText}>{facts.nonVatNote}</Text> : null}
            <Text style={styles.footerText}>
              Molimo navedite broj {isProformaDoc ? 'predračuna' : 'fakture'} pri uplati.
            </Text>
            {isProformaDoc ? (
              <Text style={styles.footerText}>
                Predračun nije faktura. Po uplati izdajemo fakturu.
              </Text>
            ) : (
              <Text style={styles.footerText}>
                Rok plaćanja: {localDaysBetween(invoice.createdAt, invoice.dueDate)} dana
              </Text>
            )}
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.signatureLabel}>
              Ovlašćeni potpis: _____________________________
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

const deliveryStyles = StyleSheet.create({
  colNo: { width: '8%', fontSize: 10, color: '#111827' },
  colName: { width: '62%', fontSize: 10, color: '#111827' },
  colUnit: { width: '12%', fontSize: 10, color: '#111827', textAlign: 'center' },
  colQty: { width: '18%', fontSize: 10, color: '#111827', textAlign: 'right', fontWeight: 'bold' },
  signatures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 50,
    gap: 40,
  },
  signatureBox: {
    flex: 1,
    gap: 14,
  },
  signatureTitle: { fontSize: 10, fontWeight: 'bold', color: '#111827' },
  signatureLine: { fontSize: 9, color: '#6b7280' },
})

/** Otpremnica: accompanies the goods of an issued invoice. Lines and quantities only, no prices. */
function DeliveryNotePDF({ invoice, delivery }: { invoice: InvoicePdfData; delivery?: DeliveryNoteDetails }) {
  const profile = invoice.profile
  const deliveryAddress = deliveryAddressToPrint(delivery, invoice.clientAddress)
  const packages = delivery?.packages ?? null
  const totalQuantity = invoice.items.reduce((sum, item) => sum + item.quantity, 0)
  const formatDate = (date: Date | string) => new Date(date).toLocaleDateString('sr-RS')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{profile.companyName || 'Naziv firme'}</Text>
              {profile.address && <Text style={styles.companyDetails}>{profile.address}</Text>}
              {profile.pib && <Text style={styles.companyDetails}>PIB: {profile.pib}</Text>}
            </View>
          </View>
          <View style={styles.headerRight}>
            {profile.contactPhone && (
              <View>
                <Text style={styles.contactLabel}>Telefon:</Text>
                <Text style={styles.contactInfo}>{profile.contactPhone}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.invoiceInfo}>
          <View style={styles.invoiceInfoLeft}>
            <Text style={styles.invoiceTitle}>OTPREMNICA</Text>
            <View>
              <Text style={styles.invoiceLabel}>Uz fakturu broj:</Text>
              <Text style={styles.invoiceValue}>{invoice.invoiceNumber}</Text>
            </View>
            <View style={{ marginTop: 15 }}>
              <Text style={styles.clientTitle}>Primalac:</Text>
              <View style={styles.clientDetails}>
                <Text>{invoice.clientName}</Text>
                {invoice.clientAddress && <Text>{invoice.clientAddress}</Text>}
                {invoice.clientPib && <Text>PIB: {invoice.clientPib}</Text>}
              </View>
            </View>
            {deliveryAddress ? (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.clientTitle}>Mesto isporuke:</Text>
                <View style={styles.clientDetails}>
                  <Text>{deliveryAddress}</Text>
                </View>
              </View>
            ) : null}
          </View>
          <View style={styles.invoiceInfoRight}>
            <View>
              <Text style={styles.invoiceLabel}>Datum:</Text>
              <Text style={styles.invoiceValue}>{formatDate(invoice.createdAt)}</Text>
            </View>
            {packages !== null ? (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.invoiceLabel}>Broj paketa:</Text>
                <Text style={styles.invoiceValue}>{packages}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[deliveryStyles.colNo, styles.tableHeaderText]}>R.br.</Text>
            <Text style={[deliveryStyles.colName, styles.tableHeaderText]}>Naziv robe</Text>
            <Text style={[deliveryStyles.colUnit, styles.tableHeaderText]}>Jed. mere</Text>
            <Text style={[deliveryStyles.colQty, styles.tableHeaderText]}>Količina</Text>
          </View>
          {invoice.items.map((item, index) => (
            <View key={item.id} style={styles.tableRow} wrap={false}>
              <Text style={deliveryStyles.colNo}>{index + 1}.</Text>
              <Text style={deliveryStyles.colName}>{item.productName}</Text>
              <Text style={deliveryStyles.colUnit}>kom</Text>
              <Text style={deliveryStyles.colQty}>{item.quantity}</Text>
            </View>
          ))}
          <View style={styles.tableRow}>
            <Text style={deliveryStyles.colNo} />
            <Text style={[deliveryStyles.colName, styles.tableHeaderText]}>Ukupno komada</Text>
            <Text style={deliveryStyles.colUnit} />
            <Text style={deliveryStyles.colQty}>{totalQuantity}</Text>
          </View>
        </View>

        <View style={deliveryStyles.signatures} wrap={false}>
          {['Robu izdao', 'Robu primio'].map((title) => (
            <View key={title} style={deliveryStyles.signatureBox}>
              <Text style={deliveryStyles.signatureTitle}>{title}</Text>
              <Text style={deliveryStyles.signatureLine}>Ime i prezime: ______________________</Text>
              <Text style={deliveryStyles.signatureLine}>Potpis: ____________________________</Text>
              <Text style={deliveryStyles.signatureLine}>Datum: ____________________________</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}
