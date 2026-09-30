'use client'

import { useMemo } from 'react'
import { BlobProvider } from '@react-pdf/renderer'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CatalogPDF } from '@/components/catalogs/CatalogPDF'
import type { CatalogWithItems } from '@/types/catalog'
import type { Profile } from '@/types/profile'

type CatalogPdfDownloadProps = {
  catalog: CatalogWithItems & { profile: Profile }
  itemsPerPage: number | 'all'
  pdfItemsPerPage: 4 | 12
}

export default function CatalogPdfDownload({
  catalog,
  itemsPerPage,
  pdfItemsPerPage,
}: CatalogPdfDownloadProps) {
  const pdfDocument = useMemo(
    () => (
      <CatalogPDF
        catalog={catalog}
        itemsPerPage={itemsPerPage}
        pdfItemsPerPage={pdfItemsPerPage}
      />
    ),
    // catalog (not catalog.id) so item edits recreate the PDF
    [catalog, itemsPerPage, pdfItemsPerPage]
  )

  const fileName = `${catalog.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_catalog.pdf`

  return (
    <BlobProvider
      document={pdfDocument}
      key={`pdf-${catalog.id}-${pdfItemsPerPage}-${catalog.items?.length ?? 0}`}
    >
      {({ blob, url, loading }) => {
        const handleDownload = () => {
          if (blob && url) {
            const link = document.createElement('a')
            link.href = url
            link.download = fileName
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          }
        }

        return (
          <Button onClick={handleDownload} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        )
      }}
    </BlobProvider>
  )
}
