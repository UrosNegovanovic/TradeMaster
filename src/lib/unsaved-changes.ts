/** Pure helpers for the unsaved-changes guard on the catalog and invoice forms. */

export type ClickedAnchor = {
  href: string
  target?: string | null
  hasDownload?: boolean
}

/**
 * Path (+ query) of an in-app navigation caused by clicking a link, or null when the click leaves the
 * form untouched: other site, new tab, download, mailto/tel, same page or only a hash change.
 */
export function internalNavigationTarget(anchor: ClickedAnchor, currentHref: string): string | null {
  if (anchor.hasDownload) return null
  if (anchor.target && anchor.target !== '_self') return null

  let target: URL
  let current: URL
  try {
    current = new URL(currentHref)
    target = new URL(anchor.href, current)
  } catch {
    return null
  }

  if (target.origin !== current.origin) return null
  if (target.pathname === current.pathname && target.search === current.search) return null
  return `${target.pathname}${target.search}${target.hash}`
}

type InvoiceDraftItem = {
  productId?: string | null
  productName?: string | null
  quantity?: number | string | null
  unitPrice?: number | string | null
  discount?: number | string | null
  vatRate?: number | string | null
}

export type InvoiceDraftFields = {
  invoiceNumber: string
  dueDate: string
  clientName: string
  clientAddress: string
  clientPib: string
  /** Note on the document (ROADMAP A9.22). */
  note?: string
  items: readonly InvoiceDraftItem[]
}

/** Stable text of what the user can edit on an invoice; row ids and computed totals are left out. */
export function invoiceDraftSnapshot(fields: InvoiceDraftFields): string {
  return JSON.stringify({
    invoiceNumber: fields.invoiceNumber,
    dueDate: fields.dueDate,
    clientName: fields.clientName,
    clientAddress: fields.clientAddress,
    clientPib: fields.clientPib,
    note: (fields.note ?? '').trim(),
    items: fields.items.map((item) => [
      item.productId ?? null,
      item.productName ?? '',
      Number(item.quantity ?? 0),
      Number(item.unitPrice ?? 0),
      Number(item.discount ?? 0),
      Number(item.vatRate ?? 0),
    ]),
  })
}

export function sameSelection(current: readonly string[], initial: readonly string[]): boolean {
  return current.length === initial.length && current.every((id, index) => id === initial[index])
}
