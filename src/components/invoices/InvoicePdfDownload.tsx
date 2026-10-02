'use client'

import { useMemo } from 'react'
import { BlobProvider } from '@react-pdf/renderer'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InvoicePDF, type InvoicePdfData } from '@/components/invoices/InvoicePDF'
import { sr } from '@/lib/ui-copy'

type InvoicePdfDownloadProps = {
  invoice: InvoicePdfData
}

export default function InvoicePdfDownload({ invoice }: InvoicePdfDownloadProps) {
  const pdfDocument = useMemo(
    () => <InvoicePDF invoice={invoice} />,
    // invoice (not invoice.id) so line-item edits recreate the PDF
    [invoice]
  )

  return (
    <BlobProvider document={pdfDocument}>
      {({ url, loading }) => (
        <Button
          onClick={() => {
            if (url) {
              const link = document.createElement('a')
              link.href = url
              link.download = `${invoice.invoiceNumber.replace(/\s+/g, '_')}_invoice.pdf`
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
            }
          }}
          disabled={loading}
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
              {sr.pdf.download}
            </>
          )}
        </Button>
      )}
    </BlobProvider>
  )
}
