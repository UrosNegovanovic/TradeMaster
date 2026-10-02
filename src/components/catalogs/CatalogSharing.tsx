'use client'

import { ShareLinkPanel } from '@/components/shared/ShareLinkPanel'
import { getSafeCatalogSharePath } from '@/lib/public-catalog'

export function CatalogSharing({ catalogId, catalogName, companyName }: { catalogId: string; catalogName?: string; companyName?: string | null }) {
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
    />
  )
}
