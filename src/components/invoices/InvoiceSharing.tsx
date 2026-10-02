'use client'

import { ShareLinkPanel } from '@/components/shared/ShareLinkPanel'
import { getSafeInvoiceSharePath, isShareableInvoiceStatus } from '@/lib/public-invoice'

type InvoiceSharingProps = {
  invoiceId: string
  invoiceNumber: string
  status: string
  companyName?: string | null
}

export function InvoiceSharing({ invoiceId, invoiceNumber, status, companyName }: InvoiceSharingProps) {
  const subject = `Faktura ${invoiceNumber}`
  return (
    <ShareLinkPanel
      endpoint={`/api/invoices/${invoiceId}/share`}
      queryKey={['invoice-sharing', invoiceId]}
      parsePath={getSafeInvoiceSharePath}
      label="Deljenje fakture"
      description="Kupac preko linka vidi fakturu i može da preuzme PDF. Nabavne cene i stanje lagera se ne prikazuju. Link možete opozvati bilo kada."
      shareText={companyName ? `${subject} od ${companyName}` : subject}
      shareSubject={subject}
      unavailableReason={isShareableInvoiceStatus(status) ? undefined : 'Nacrt se ne deli. Izdajte fakturu (Otvoreno) da biste poslali link kupcu.'}
    />
  )
}
