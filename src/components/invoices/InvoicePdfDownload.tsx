'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InvoicePDF, type InvoicePdfData, type InvoicePdfVariant } from '@/components/invoices/InvoicePDF'
import { pdfFileName } from '@/lib/document-type'
import { notify } from '@/lib/notify'
import { sr } from '@/lib/ui-copy'

type InvoicePdfDownloadProps = {
  invoice: InvoicePdfData
  variant?: InvoicePdfVariant
  /** Button text when ready; defaults to "Preuzmi PDF". */
  label?: string
  buttonVariant?: 'default' | 'outline'
}

// react-pdf's layout engine fails when two documents render at the same time
// (yoga "Expected null or instance of Config"), so renders run one after another.
let renderQueue: Promise<unknown> = Promise.resolve()

function renderPdfBlob(invoice: InvoicePdfData, variant: InvoicePdfVariant): Promise<Blob> {
  const job = renderQueue.then(() => pdf(<InvoicePDF invoice={invoice} variant={variant} />).toBlob())
  renderQueue = job.catch(() => undefined)
  return job
}

/**
 * Renders the PDF only when clicked. Two always-mounted BlobProviders (faktura + otpremnica)
 * rendered concurrently, and the failed one left its button silently doing nothing.
 */
export default function InvoicePdfDownload({
  invoice,
  variant = 'document',
  label = sr.pdf.download,
  buttonVariant = 'default',
}: InvoicePdfDownloadProps) {
  const [loading, setLoading] = useState(false)

  const download = async () => {
    setLoading(true)
    try {
      const blob = await renderPdfBlob(invoice, variant)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = pdfFileName(invoice.invoiceNumber, variant === 'delivery' ? 'delivery' : invoice.documentType)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      // Give the browser time to start the download before releasing the blob.
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch (error) {
      console.error('PDF render failed', error)
      notify.error('PDF nije napravljen', {
        description: error instanceof Error ? error.message : 'Pokušajte ponovo.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      onClick={download}
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
  )
}
