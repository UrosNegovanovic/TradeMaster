'use client'

import { useEffect, useState } from 'react'
import { BellRing, Loader2, MessageCircle, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSafeInvoiceSharePath } from '@/lib/public-invoice'
import { paymentReminderMessage, paymentReminderSubject } from '@/lib/payment-reminder'
import { buildMessageTargets } from '@/lib/share-links'
import { readApiErrorMessage } from '@/lib/api-error'
import { notify } from '@/lib/notify'
import { useAuthorizedFetch } from '@/lib/use-authorized-fetch'

type PaymentReminderButtonsProps = {
  invoiceId: string
  invoiceNumber: string
  amount: number
  dueDate: string
  companyName?: string | null
  /** Active share path (`/shared/invoice/<token>`), or null when the invoice has no link yet. */
  sharePath: string | null
}

/**
 * ROADMAP A7: WhatsApp / Viber reminder for an overdue invoice. Without an active share link the
 * first tap creates one (the buyer needs it for the PDF with the IPS QR code); an existing link is reused.
 */
export function PaymentReminderButtons({
  invoiceId,
  invoiceNumber,
  amount,
  dueDate,
  companyName,
  sharePath,
}: PaymentReminderButtonsProps) {
  const request = useAuthorizedFetch()
  const [path, setPath] = useState(() => getSafeInvoiceSharePath(sharePath))
  const [busy, setBusy] = useState(false)
  // The dashboard renders on the server first; the absolute link needs the browser's origin.
  const [origin, setOrigin] = useState<string | null>(null)
  useEffect(() => setOrigin(window.location.origin), [])

  async function createLink() {
    setBusy(true)
    try {
      const response = await request(`/api/invoices/${invoiceId}/share`, { method: 'POST' })
      if (!response.ok) throw new Error(await readApiErrorMessage(response, 'Link za kupca nije napravljen.'))
      const body = (await response.json()) as { url?: unknown }
      const created = getSafeInvoiceSharePath(body.url)
      if (!created) throw new Error('Link za kupca nije napravljen.')
      setPath(created)
    } catch (error) {
      notify.error('Podsetnik nije spreman', {
        description: error instanceof Error ? error.message : 'Pokušajte ponovo.',
      })
    } finally {
      setBusy(false)
    }
  }

  if (!path) {
    return (
      <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={createLink} disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
        Podsetnik za naplatu
      </Button>
    )
  }

  if (!origin) return null

  const url = new URL(path, origin).href
  const targets = buildMessageTargets(
    paymentReminderMessage({ invoiceNumber, amount, dueDate, companyName, url }),
    paymentReminderSubject(invoiceNumber)
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Podseti kupca:</span>
      <Button asChild variant="outline" size="sm" className="min-h-11">
        <a href={targets.whatsapp} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="mr-2 h-4 w-4" />
          WhatsApp
        </a>
      </Button>
      <Button asChild variant="outline" size="sm" className="min-h-11">
        <a href={targets.viber}>
          <Phone className="mr-2 h-4 w-4" />
          Viber
        </a>
      </Button>
    </div>
  )
}
