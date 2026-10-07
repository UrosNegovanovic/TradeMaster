'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BlobProvider } from '@react-pdf/renderer'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CatalogPDF } from '@/components/catalogs/CatalogPDF'
import type { CatalogWithItems } from '@/types/catalog'
import type { Profile } from '@/types/profile'
import { sr } from '@/lib/ui-copy'
import { getSafeCatalogSharePath } from '@/lib/public-catalog'

type CatalogPdfDownloadProps = {
  catalog: CatalogWithItems & { profile: Profile }
}

export default function CatalogPdfDownload({ catalog }: CatalogPdfDownloadProps) {
  // Same query as the sharing panel, so enabling, renewing or revoking the link updates the QR code.
  const { data: share } = useQuery<{ url: string | null }>({
    queryKey: ['catalog-sharing', catalog.id],
    queryFn: async () => {
      const response = await fetch(`/api/catalogs/${catalog.id}/share`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Deljenje nije dostupno.')
      const body = (await response.json()) as { url?: unknown }
      if (body.url === null) return { url: null }
      const url = getSafeCatalogSharePath(body.url)
      if (!url) throw new Error('Odgovor za deljenje nije ispravan.')
      return { url }
    },
  })
  const sharePath = share?.url ?? null
  const shareUrl = sharePath ? new URL(sharePath, window.location.origin).href : null

  const pdfDocument = useMemo(
    () => <CatalogPDF catalog={catalog} shareUrl={shareUrl} />,
    // catalog (not catalog.id) so item and display-setting edits recreate the PDF
    [catalog, shareUrl]
  )

  const fileName = `${catalog.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_catalog.pdf`

  return (
    <BlobProvider
      document={pdfDocument}
      key={`pdf-${catalog.id}-${catalog.updatedAt}-${shareUrl ?? ''}`}
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
                {sr.pdf.generating}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {sr.pdf.download}
              </>
            )}
          </Button>
        )
      }}
    </BlobProvider>
  )
}
