'use client'

import { useMemo } from 'react'
import { BlobProvider } from '@react-pdf/renderer'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InvoicePDF, type InvoicePdfData, type InvoicePdfVariant } from '@/components/invoices/InvoicePDF'
import { pdfFileName } from '@/lib/document-type'
import { sr } from '@/lib/ui-copy'

type InvoicePdfDownloadProps = {
  invoice: InvoicePdfData
  variant?: InvoicePdfVariant
  /** Button text when ready; defaults to "Preuzmi PDF". */
  label?: string
  buttonVariant?: 'default' | 'outline'
}

export default function InvoicePdfDownload({
  invoice,
  variant = 'document',
  label = sr.pdf.download,
  buttonVariant = 'default',
}: InvoicePdfDownloadProps) {
  const pdfDocument = useMemo(
    () => <InvoicePDF invoice={invoice} variant={variant} />,
    // invoice (not invoice.id) so line-item edits recreate the PDF
    [invoice, variant]
  )

  return (
    <BlobProvider document={pdfDocument}>
      {({ url, loading }) => (
        <Button
          onClick={() => {
            if (url) {
              const link = document.createElement('a')
              link.href = url
              link.download = pdfFileName(invoice.invoiceNumber, variant === 'delivery' ? 'delivery' : invoice.documentType)
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
            }
          }}
          disabled={loading}
          variant={buttonVariant}
          className="min-h-11 w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {sr.pdf.generating}
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              {label}
            </>
          )}
        </Button>
      )}
    </BlobProvider>
  )
}
