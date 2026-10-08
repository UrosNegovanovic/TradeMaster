import { randomUUID } from 'node:crypto'
import type { SefCallResult } from '@/lib/sef-client'
import { parseSalesInvoiceId } from '@/lib/sef-client'
import { sefErrorView, type SefErrorContext, type SefErrorView } from '@/lib/sef-errors'
import type { SefStatus } from '@/lib/sef-status'

/**
 * Sending one invoice to SEF at most once (ROADMAP A3).
 *
 * 1. Claim: an atomic conditional update sets sefStatus = SENDING and a new random requestId,
 *    only while sefStatus is still empty. A double click or a second tab loses the claim.
 * 2. Send the UBL with that requestId. SEF keys uploads by requestId (UBLUploadRequestIdDuplicate),
 *    so a retry with the same requestId cannot create a second SEF invoice.
 * 3. Outcome:
 *    - accepted → SENT with SEF's salesInvoiceId;
 *    - SEF already has the requestId → SENT (sent earlier, its answer was lost);
 *    - no answer / 5xx / 429 → stays SENDING with the same requestId; a retry after
 *      RETRY_AFTER_MS re-sends with that requestId;
 *    - a definite refusal (4xx with a reason) → released: sefStatus and requestId cleared,
 *      the reason saved, so after the fix a new send gets a new requestId. SEF stored nothing.
 */
export const RETRY_AFTER_MS = 60_000

export type SefSendState = {
  sefStatus: string | null
  sefRequestId: string | null
  sefSentAt: Date | null
  sefInvoiceId: string | null
}

export interface SefSendStore {
  /** Atomically: if sefStatus IS NULL, set SENDING + requestId + sentAt and return true. */
  claim(requestId: string, now: Date): Promise<boolean>
  /** Atomically: if still SENDING with this requestId and sentAt < staleBefore, bump sentAt and return true. */
  reclaimStale(requestId: string, staleBefore: Date, now: Date): Promise<boolean>
  read(): Promise<SefSendState>
  markSent(requestId: string, sefInvoiceId: string | null, now: Date): Promise<void>
  /** Keep SENDING and the requestId; remember the message. */
  markUncertain(requestId: string, message: string): Promise<void>
  /** Clear sefStatus and requestId (only if still this requestId); remember the message. */
  release(requestId: string, message: string): Promise<void>
}

export type SefSendOutcome =
  | { kind: 'sent'; sefInvoiceId: string | null; status: SefStatus }
  | { kind: 'already-sent'; state: SefSendState }
  | { kind: 'in-progress' }
  | { kind: 'uncertain'; error: SefErrorView }
  | { kind: 'refused'; error: SefErrorView }

export type SefSendDeps = {
  store: SefSendStore
  send: (requestId: string) => Promise<SefCallResult>
  errorContext: SefErrorContext
  now?: () => Date
  newRequestId?: () => string
}

export async function sendInvoiceToSef(deps: SefSendDeps): Promise<SefSendOutcome> {
  const now = deps.now ?? (() => new Date())
  const at = now()
  let requestId = (deps.newRequestId ?? randomUUID)()

  if (!(await deps.store.claim(requestId, at))) {
    const state = await deps.store.read()
    if (state.sefStatus !== 'SENDING' || !state.sefRequestId) return { kind: 'already-sent', state }
    const staleBefore = new Date(at.getTime() - RETRY_AFTER_MS)
    const fresh = state.sefSentAt && state.sefSentAt > staleBefore
    if (fresh || !(await deps.store.reclaimStale(state.sefRequestId, staleBefore, at))) return { kind: 'in-progress' }
    // Retry of an unconfirmed send: the SAME requestId, so SEF cannot store it twice.
    requestId = state.sefRequestId
  }

  const result = await deps.send(requestId)
  if (result.ok) {
    const sefInvoiceId = parseSalesInvoiceId(result.body)
    await deps.store.markSent(requestId, sefInvoiceId, now())
    return { kind: 'sent', sefInvoiceId, status: 'SENT' }
  }

  const error = sefErrorView(result, deps.errorContext)
  if (error.alreadySent) {
    await deps.store.markSent(requestId, null, now())
    return { kind: 'sent', sefInvoiceId: null, status: 'SENT' }
  }
  if (error.outcomeUnknown) {
    await deps.store.markUncertain(requestId, error.message)
    return { kind: 'uncertain', error }
  }
  await deps.store.release(requestId, error.message)
  return { kind: 'refused', error }
}
