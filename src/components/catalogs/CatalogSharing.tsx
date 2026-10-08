'use client'

import { ShareLinkPanel } from '@/components/shared/ShareLinkPanel'
import { getSafeCatalogSharePath } from '@/lib/public-catalog'
import { formatCatalogViews } from '@/lib/catalog-views'

type CatalogSharingProps = {
  catalogId: string
  catalogName?: string
  companyName?: string | null
  viewCount?: number
  lastViewedAt?: Date | string | null
}

export function CatalogSharing({ catalogId, catalogName, companyName, viewCount = 0, lastViewedAt }: CatalogSharingProps) {
  const title = catalogName ? `Katalog: ${catalogName}` : 'Katalog'
  return (
    <ShareLinkPanel
      endpoint={`/api/catalogs/${catalogId}/share`}
      queryKey={['catalog-sharing', catalogId]}
      parsePath={getSafeCatalogSharePath}
      label="Deljenje kataloga"
      description="Svako ko dobije uključen link može da vidi ponudu, ime klijenta, beleške i kontakt firme. Stanje lagera se ne prikazuje."
      shareText={companyName ? `${title} (${companyName})` : title}
      shareSubject={title}
    >
      <p className="mt-2 text-sm">
        {formatCatalogViews(viewCount, lastViewedAt)}{' '}
        <span className="text-muted-foreground">Broji se svako otvaranje, i vaš „Pregled za kupca”.</span>
      </p>
    </ShareLinkPanel>
  )
}
