import { formatDashboardDate } from '@/lib/dashboard-activity'
import { formatRsd } from '@/lib/invoice-finance'

/**
 * "Podsetnik za naplatu" (ROADMAP A7): a polite message for an overdue invoice, sent from the
 * owner's own WhatsApp/Viber. The link is the invoice's revocable share link; its PDF carries
 * the IPS QR code, so the buyer can pay by scanning it.
 */
export type PaymentReminderInput = {
  invoiceNumber: string
  amount: number | string | { toString(): string }
  dueDate: Date | string
  companyName?: string | null
  /** Absolute share URL, or null when the invoice has no active link. */
  url: string | null
}

export function paymentReminderMessage({ invoiceNumber, amount, dueDate, companyName, url }: PaymentReminderInput): string {
  const lines = [
    'Poštovani,',
    `podsećamo da je faktura ${invoiceNumber} na iznos ${formatRsd(Number(amount))} dospela ${formatDashboardDate(dueDate)}.`,
  ]
  if (url) lines.push(`Fakturu sa QR kodom za plaćanje možete otvoriti ovde: ${url}`)
  lines.push('Ako ste već platili, zanemarite ovu poruku. Hvala!')
  const sender = companyName?.trim()
  if (sender) lines.push(sender)
  return lines.join('\n')
}

export function paymentReminderSubject(invoiceNumber: string): string {
  return `Podsetnik: faktura ${invoiceNumber}`
}
