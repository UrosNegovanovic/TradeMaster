import { onlyInvoices } from '@/lib/document-type'
import { isPaidInvoiceStatus } from '@/lib/invoice-status'
import { sumInvoiceAmounts } from '@/lib/invoice-finance'
import { foldSerbian } from '@/lib/invoice-search'
import { daysOverdue } from '@/lib/overdue-invoices'

type Amount = number | string | { toString(): string }

export type ReceivableInvoice = {
  documentType?: string | null
  status: string
  clientName: string
  clientPib?: string | null
  totalAmount: Amount
  dueDate: Date | string
  createdAt: Date | string
}

export type BuyerReceivable = {
  /** Name on the buyer's newest open invoice. */
  clientName: string
  clientPib: string | null
  /** Amount payable (with PDV), like "Potraživanja". */
  openTotal: number
  overdueTotal: number
  openCount: number
  oldestDueDate: Date
  /** Days the oldest open invoice is late (Europe/Belgrade); 0 when nothing is late yet. */
  maxDaysOverdue: number
}

/**
 * "Ko mi duguje" on Finansije (ROADMAP A9.18): open invoices grouped per buyer (same PIB, or same
 * name without diacritics when there is no PIB), the most late first, then the biggest amount.
 */
export function receivablesByBuyer(documents: ReceivableInvoice[], now = new Date()): BuyerReceivable[] {
  const groups = new Map<string, { rows: ReceivableInvoice[]; newest: ReceivableInvoice }>()
  for (const invoice of onlyInvoices(documents)) {
    if (isPaidInvoiceStatus(invoice.status)) continue
    const pib = invoice.clientPib?.replace(/\D/g, '') || ''
    const key = pib ? `pib:${pib}` : `name:${foldSerbian(invoice.clientName)}`
    const group = groups.get(key)
    if (!group) {
      groups.set(key, { rows: [invoice], newest: invoice })
    } else {
      group.rows.push(invoice)
      if (new Date(invoice.createdAt) > new Date(group.newest.createdAt)) group.newest = invoice
    }
  }

  return [...groups.values()]
    .map(({ rows, newest }) => {
      const late = rows.filter((row) => daysOverdue(row.dueDate, now) > 0)
      const oldestDueDate = rows
        .map((row) => new Date(row.dueDate))
        .reduce((oldest, due) => (due < oldest ? due : oldest))
      return {
        clientName: newest.clientName,
        clientPib: newest.clientPib?.trim() || null,
        openTotal: sumInvoiceAmounts(rows),
        overdueTotal: sumInvoiceAmounts(late),
        openCount: rows.length,
        oldestDueDate,
        maxDaysOverdue: Math.max(0, ...rows.map((row) => daysOverdue(row.dueDate, now))),
      }
    })
    .sort((a, b) => b.maxDaysOverdue - a.maxDaysOverdue || b.openTotal - a.openTotal)
}

/** Fakture filtered to one buyer (the list reads ?q=). */
export function buyerInvoicesHref(buyer: Pick<BuyerReceivable, 'clientName' | 'clientPib'>): string {
  return `/invoices?${new URLSearchParams({ q: buyer.clientPib ?? buyer.clientName }).toString()}`
}
