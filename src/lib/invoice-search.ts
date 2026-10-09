/** Search and order on the Fakture list (ROADMAP A9.10). Client-side: the list already holds every document. */

type SearchableInvoice = {
  invoiceNumber: string
  clientName: string
  clientPib?: string | null
}

/** Lower case without diacritics, so "djordje" finds "Đorđe" and "cacak" finds "Čačak". */
export function foldSerbian(value: string): string {
  return value
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/** Every word of the query must appear in the number, the buyer's name or the buyer's PIB. */
export function matchesInvoiceQuery(invoice: SearchableInvoice, query: string): boolean {
  const words = foldSerbian(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = foldSerbian(`${invoice.invoiceNumber} ${invoice.clientName} ${invoice.clientPib ?? ''}`)
  return words.every((word) => haystack.includes(word))
}

/** Open invoices that are due first come first; same day keeps the newest number on top. */
export function sortByDueDate<T extends { dueDate: string | Date; createdAt: string | Date }>(invoices: readonly T[]): T[] {
  return [...invoices].sort((a, b) => {
    const due = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    return due !== 0 ? due : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}
