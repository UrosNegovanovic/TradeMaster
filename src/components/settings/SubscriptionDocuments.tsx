'use client'

import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { formatAccessDate } from '@/lib/access-period'
import { formatRsd } from '@/lib/invoice-finance'
import type { SubscriptionDocument } from '@/lib/subscription-documents'

async function fetchDocuments(): Promise<SubscriptionDocument[]> {
  const response = await fetch('/api/billing/documents')
  if (!response.ok) throw new Error('Failed to fetch subscription documents')
  return response.json()
}

/**
 * Predračuni for using TradeMaster that T&G Nest sent this company (platform billing). Shown only here, never
 * in the company's own Fakture, Finansije or export. Each opens the public page with the IPS QR code and PDF.
 */
export function SubscriptionDocuments() {
  const { data: documents } = useQuery({ queryKey: ['subscription-documents'], queryFn: fetchDocuments })
  if (!documents || documents.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="font-medium">Predračuni za TradeMaster</p>
      <p className="text-muted-foreground">
        Izdaje ih T&amp;G Nest za korišćenje aplikacije. Nisu deo vaših faktura i ne ulaze u vaše Finansije.
      </p>
      <ul className="divide-y rounded-md border">
        {documents.map((document) => (
          <li key={document.invoiceNumber} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">
                {document.invoiceNumber} · {formatRsd(Number(document.totalAmount))}
              </p>
              <p className="text-muted-foreground">
                Period {formatAccessDate(document.periodFrom)} - {formatAccessDate(document.periodUntil)}
                {document.status === 'PAID' ? ' · plaćeno' : ` · rok ${formatAccessDate(document.dueDate)}`}
              </p>
            </div>
            {document.url ? (
              <a
                href={document.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1 text-primary underline-offset-4 hover:underline"
              >
                Otvori (IPS QR, PDF) <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
