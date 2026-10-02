/**
 * Product analytics without personal data: Vercel Analytics custom events with no properties.
 * Everything is off unless NEXT_PUBLIC_ANALYTICS=on.
 */

export const ANALYTICS_EVENTS = [
  'signup',
  'first_product',
  'first_invoice',
  'catalog_shared',
  'invoice_shared',
] as const

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number]

export function isAnalyticsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ANALYTICS === 'on'
}

/** A profile this young counts as a fresh registration (the dashboard is the first page after sign-up). */
export const NEW_PROFILE_WINDOW_MS = 30 * 60 * 1000

export type MilestoneInput = {
  profileCreatedAt: Date | string
  productCount: number
  invoiceCount: number
  sharedCatalogCount: number
  sharedInvoiceCount: number
  now?: Date
}

/** Milestones the company has reached; each is sent at most once per browser (see `trackOnce`). */
export function reachedMilestones(input: MilestoneInput): AnalyticsEvent[] {
  const now = input.now ?? new Date()
  const age = now.getTime() - new Date(input.profileCreatedAt).getTime()
  const reached: AnalyticsEvent[] = []
  if (age >= 0 && age <= NEW_PROFILE_WINDOW_MS) reached.push('signup')
  if (input.productCount > 0) reached.push('first_product')
  if (input.invoiceCount > 0) reached.push('first_invoice')
  if (input.sharedCatalogCount > 0) reached.push('catalog_shared')
  if (input.sharedInvoiceCount > 0) reached.push('invoice_shared')
  return reached
}

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>
type Send = (event: AnalyticsEvent) => void

const STORAGE_PREFIX = 'tm:analytics:'

function sendToVercel(event: AnalyticsEvent) {
  const va = (window as unknown as { va?: (type: string, payload: { name: string }) => void }).va
  va?.('event', { name: event })
}

/** Sends the event once per browser. Storage failures (private mode) skip the event rather than repeating it. */
export function trackOnce(
  event: AnalyticsEvent,
  storage?: KeyValueStorage,
  send: Send = sendToVercel
): boolean {
  if (!isAnalyticsEnabled()) return false
  try {
    const store = storage ?? window.localStorage
    const key = `${STORAGE_PREFIX}${event}`
    if (store.getItem(key)) return false
    store.setItem(key, '1')
    send(event)
    return true
  } catch {
    return false
  }
}
