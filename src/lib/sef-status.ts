/**
 * Our SEF state on an invoice (invoices.sefStatus) and its badge (ROADMAP A3).
 * SEF's SalesInvoiceStatus enum (official Swagger, public_v1): New, Draft, Sent, Paid, Mistake,
 * OverDue, Archived, Sending, Deleted, Approved, Rejected, Cancelled, Storno, Unknown.
 */
export const SEF_STATUSES = ['SENDING', 'SENT', 'APPROVED', 'REJECTED', 'CANCELLED', 'STORNO', 'MISTAKE', 'UNKNOWN'] as const
export type SefStatus = (typeof SEF_STATUSES)[number]

export function isSefStatus(value: unknown): value is SefStatus {
  return typeof value === 'string' && (SEF_STATUSES as readonly string[]).includes(value)
}

/** SEF's status word → ours. Anything SEF adds later lands on UNKNOWN instead of breaking. */
export function fromSefSalesStatus(status: string | null | undefined): SefStatus {
  switch (status) {
    case 'New':
    case 'Draft':
    case 'Sending':
      return 'SENDING'
    case 'Sent':
    case 'Paid':
    case 'OverDue':
    case 'Archived':
      return 'SENT'
    case 'Approved':
      return 'APPROVED'
    case 'Rejected':
      return 'REJECTED'
    case 'Cancelled':
    case 'Deleted':
      return 'CANCELLED'
    case 'Storno':
      return 'STORNO'
    case 'Mistake':
      return 'MISTAKE'
    default:
      return 'UNKNOWN'
  }
}

export type SefBadgeTone = 'neutral' | 'info' | 'success' | 'danger' | 'muted'

export const SEF_STATUS_VIEW: Record<SefStatus, { label: string; tone: SefBadgeTone }> = {
  SENDING: { label: 'Šalje se u SEF', tone: 'neutral' },
  SENT: { label: 'SEF: Poslato', tone: 'info' },
  APPROVED: { label: 'SEF: Prihvaćeno', tone: 'success' },
  REJECTED: { label: 'SEF: Odbijeno', tone: 'danger' },
  CANCELLED: { label: 'SEF: Otkazano', tone: 'muted' },
  STORNO: { label: 'SEF: Stornirano', tone: 'muted' },
  MISTAKE: { label: 'SEF: Greška', tone: 'danger' },
  UNKNOWN: { label: 'SEF: Nepoznat status', tone: 'neutral' },
}

/** Badge variant per tone (components/ui/badge). */
export const SEF_TONE_BADGE_VARIANT: Record<SefBadgeTone, 'secondary' | 'default' | 'success' | 'destructive' | 'outline'> = {
  neutral: 'secondary',
  info: 'default',
  success: 'success',
  danger: 'destructive',
  muted: 'outline',
}

/** A status SEF can still change (worth refreshing when the invoice is opened). */
export function isSefStatusOpen(status: SefStatus | null): boolean {
  return status === 'SENDING' || status === 'SENT' || status === 'UNKNOWN'
}

/** Once claimed for SEF, the invoice is never edited or deleted here; storno goes through SEF. */
export function isLockedBySef(sefStatus: string | null | undefined): boolean {
  return Boolean(sefStatus)
}

export const SEF_LOCKED_MESSAGE =
  'Faktura je poslata u SEF i više se ne menja ni ne briše ovde. Ispravka ide stornom na SEF portalu.'

/** The A7 payment reminder makes no sense for an invoice the buyer rejected in SEF. */
export function canRemindPayment(sefStatus: string | null | undefined): boolean {
  return sefStatus !== 'REJECTED' && sefStatus !== 'CANCELLED' && sefStatus !== 'STORNO'
}
