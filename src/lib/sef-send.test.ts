import { describe, expect, it } from 'vitest'
import { RETRY_AFTER_MS, sendInvoiceToSef, type SefSendState, type SefSendStore } from './sef-send'
import type { SefCallResult } from './sef-client'

/** In-memory store with the same conditional-update semantics as the Prisma one. */
function memoryStore(initial: Partial<SefSendState> = {}) {
  const state: SefSendState & { lastError: string | null } = {
    sefStatus: null,
    sefRequestId: null,
    sefSentAt: null,
    sefInvoiceId: null,
    lastError: null,
    ...initial,
  }
  const store: SefSendStore = {
    async claim(requestId, now) {
      if (state.sefStatus !== null) return false
      Object.assign(state, { sefStatus: 'SENDING', sefRequestId: requestId, sefSentAt: now, lastError: null })
      return true
    },
    async reclaimStale(requestId, staleBefore, now) {
      if (state.sefStatus !== 'SENDING' || state.sefRequestId !== requestId) return false
      if (!state.sefSentAt || state.sefSentAt >= staleBefore) return false
      state.sefSentAt = now
      return true
    },
    async read() {
      return { ...state }
    },
    async markSent(requestId, sefInvoiceId) {
      if (state.sefRequestId !== requestId) return
      Object.assign(state, { sefStatus: 'SENT', sefInvoiceId, lastError: null })
    },
    async markUncertain(requestId, message) {
      if (state.sefRequestId === requestId) state.lastError = message
    },
    async release(requestId, message) {
      if (state.sefRequestId !== requestId) return
      Object.assign(state, { sefStatus: null, sefRequestId: null, sefSentAt: null, lastError: message })
    },
  }
  return { store, state }
}

/** Fake SEF: remembers requestIds like the real one and counts stored invoices. */
function fakeSef(script: Array<'ok' | 'network' | 'http500' | 'refuse' | 'auto'> = []) {
  const stored = new Map<string, string>()
  const seen: string[] = []
  let next = 1000
  const send = async (requestId: string): Promise<SefCallResult> => {
    seen.push(requestId)
    const step = script.shift() ?? 'auto'
    if (step === 'refuse') return { ok: false, kind: 'http', status: 400, body: '{"code":"ReceiverCompanyNotFound"}' }
    if (stored.has(requestId)) return { ok: false, kind: 'http', status: 400, body: '{"code":"UBLUploadRequestIdDuplicate"}' }
    stored.set(requestId, String(next++))
    if (step === 'network') return { ok: false, kind: 'network' } // SEF stored it, the answer was lost
    if (step === 'http500') return { ok: false, kind: 'http', status: 500, body: '' }
    return { ok: true, status: 200, body: `{"invoiceId":${next - 1},"purchaseInvoiceId":1,"salesInvoiceId":${next - 1}}` }
  }
  return { send, stored, seen }
}

const ctx = { invoiceId: 'inv-1', supportEmail: 'podrska@example.com' }
let ids = 0
const newRequestId = () => `req-${++ids}`

describe('sendInvoiceToSef', () => {
  it('sends once and stores the SEF id', async () => {
    const { store, state } = memoryStore()
    const sef = fakeSef(['ok'])
    const outcome = await sendInvoiceToSef({ store, send: sef.send, errorContext: ctx, newRequestId })
    expect(outcome).toEqual({ kind: 'sent', sefInvoiceId: '1000', status: 'SENT' })
    expect(state.sefStatus).toBe('SENT')
    expect(sef.stored.size).toBe(1)
  })

  it('a double click while sending does not call SEF twice', async () => {
    const { store } = memoryStore()
    const sef = fakeSef(['ok'])
    const [first, second] = await Promise.all([
      sendInvoiceToSef({ store, send: sef.send, errorContext: ctx, newRequestId }),
      sendInvoiceToSef({ store, send: sef.send, errorContext: ctx, newRequestId }),
    ])
    expect([first.kind, second.kind].sort()).toEqual(['in-progress', 'sent'])
    expect(sef.seen).toHaveLength(1)
    expect(sef.stored.size).toBe(1)
  })

  it('a send after success never reaches SEF again', async () => {
    const { store } = memoryStore()
    const sef = fakeSef(['ok'])
    await sendInvoiceToSef({ store, send: sef.send, errorContext: ctx, newRequestId })
    const again = await sendInvoiceToSef({ store, send: sef.send, errorContext: ctx, newRequestId })
    expect(again.kind).toBe('already-sent')
    expect(sef.seen).toHaveLength(1)
  })

  it('after a lost answer the retry reuses the requestId and SEF still holds one invoice', async () => {
    const { store, state } = memoryStore()
    const sef = fakeSef(['network'])
    let clock = new Date('2026-10-20T10:00:00Z')
    const now = () => clock

    const first = await sendInvoiceToSef({ store, send: sef.send, errorContext: ctx, newRequestId, now })
    expect(first.kind).toBe('uncertain')
    expect(state.sefStatus).toBe('SENDING')

    // Too soon: no second call.
    const early = await sendInvoiceToSef({ store, send: sef.send, errorContext: ctx, newRequestId, now })
    expect(early.kind).toBe('in-progress')
    expect(sef.seen).toHaveLength(1)

    clock = new Date(clock.getTime() + RETRY_AFTER_MS + 1)
    const retry = await sendInvoiceToSef({ store, send: sef.send, errorContext: ctx, newRequestId, now })
    expect(retry).toEqual({ kind: 'sent', sefInvoiceId: null, status: 'SENT' })
    expect(sef.seen).toEqual([sef.seen[0], sef.seen[0]])
    expect(sef.stored.size).toBe(1)
    expect(state.sefStatus).toBe('SENT')
  })

  it('a SEF server error keeps the requestId for the retry', async () => {
    const { store, state } = memoryStore()
    const sef = fakeSef(['http500'])
    const outcome = await sendInvoiceToSef({ store, send: sef.send, errorContext: ctx, newRequestId })
    expect(outcome.kind).toBe('uncertain')
    expect(state.sefRequestId).toBe(sef.seen[0])
  })

  it('a definite refusal releases the invoice with a Serbian reason; the next send uses a new requestId', async () => {
    const { store, state } = memoryStore()
    const sef = fakeSef(['refuse', 'ok'])
    const refused = await sendInvoiceToSef({ store, send: sef.send, errorContext: ctx, newRequestId })
    expect(refused.kind).toBe('refused')
    expect(state.sefStatus).toBeNull()
    expect(state.lastError).toMatch(/Kupac nije registrovan u SEF-u/)

    const fixed = await sendInvoiceToSef({ store, send: sef.send, errorContext: ctx, newRequestId })
    expect(fixed.kind).toBe('sent')
    expect(sef.seen[0]).not.toBe(sef.seen[1])
    expect(sef.stored.size).toBe(1)
  })
})
