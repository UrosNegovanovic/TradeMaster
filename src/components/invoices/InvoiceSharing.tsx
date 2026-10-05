'use client'

import { ShareLinkPanel } from '@/components/shared/ShareLinkPanel'
import { getSafeInvoiceSharePath, isShareableInvoiceStatus } from '@/lib/public-invoice'
import { documentLabels } from '@/lib/document-type'

type InvoiceSharingProps = {
  invoiceId: string
  invoiceNumber: string
  status: string
  companyName?: string | null
  documentType?: string | null
}

export function InvoiceSharing({ invoiceId, invoiceNumber, status, companyName, documentType }: InvoiceSharingProps) {
  const labels = documentLabels(documentType)
  const subject = `${labels.name} ${invoiceNumber}`
  return (
    <ShareLinkPanel
      endpoint={`/api/invoices/${invoiceId}/share`}
      queryKey={['invoice-sharing', invoiceId]}
      parsePath={getSafeInvoiceSharePath}
      label={documentType === 'PROFORMA' ? 'Deljenje predračuna' : 'Deljenje fakture'}
      description={`Kupac preko linka vidi ${documentType === 'PROFORMA' ? 'predračun' : 'fakturu'} i može da preuzme PDF. Nabavne cene i stanje lagera se ne prikazuju. Link možete opozvati bilo kada.`}
      shareText={companyName ? `${subject} od ${companyName}` : subject}
      shareSubject={subject}
      unavailableReason={isShareableInvoiceStatus(status) ? undefined : 'Nacrt se ne deli. Prvo ga izdajte da biste poslali link kupcu.'}
    />
  )
}
