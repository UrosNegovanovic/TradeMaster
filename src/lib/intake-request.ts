type Journal = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type IntakeBody = { sku: string; [key: string]: unknown }
type Operation = { key: string; body: IntakeBody }

/** Same-key resend delays after a lost response or transient server error. */
export const INTAKE_RETRY_DELAYS_MS = [400, 1200]

class RejectedIntakeError extends Error {}

const journalKey = (userId: string, sku: string) => `trademaster:intake:${userId}:${sku}`

function readPending(journal: Journal, userId: string, sku: string): Operation[] {
  const saved = journal.getItem(journalKey(userId, sku))
  if (!saved) return []
  const parsed = JSON.parse(saved)
  const operations: Operation[] = Array.isArray(parsed) ? parsed : [parsed]
  if (operations.some((op) => !op?.key || op.body?.sku !== sku)) throw new Error('Invalid pending intake')
  return operations
}

function writePending(journal: Journal, userId: string, sku: string, operations: Operation[]) {
  if (operations.length) journal.setItem(journalKey(userId, sku), JSON.stringify(operations))
  else journal.removeItem(journalKey(userId, sku))
}

const retryable = (status: number) => status >= 500 || status === 401 || status === 403 || status === 408 || status === 429

type QueueOptions = {
  send?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  retryDelaysMs?: number[]
}

/**
 * Every scan is its own journaled operation with its own Idempotency-Key, persisted before
 * sending, so resends of a lost response are counted once by the server while repeated
 * scans of one barcode each count. Deliveries are serialized per tab.
 *
 * A scan of a barcode whose earlier operations failed and are no longer being worked on
 * replays those operations instead of adding one: rescanning after the error toast
 * confirms the unconfirmed intake rather than adding another unit.
 */
export function createIntakeQueue(userId: string, journal: Journal, options: QueueOptions = {}) {
  const send = options.send ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const retryDelaysMs = options.retryDelaysMs ?? INTAKE_RETRY_DELAYS_MS
  const queued = new Map<string, number>()
  let tail: Promise<unknown> = Promise.resolve()

  async function deliver(operation: Operation) {
    for (let attempt = 0; ; attempt++) {
      let status = 0
      try {
        const response = await send('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': operation.key },
          body: JSON.stringify(operation.body),
        })
        if (response.ok) return response.json()
        status = response.status
      } catch {
        // Network failure: the server may or may not have committed; resend the same key.
      }
      if (status && !retryable(status)) throw new RejectedIntakeError(`Intake rejected (${status})`)
      if (attempt >= retryDelaysMs.length) throw new Error(`Intake failed (${status || 'network'})`)
      await sleep(retryDelaysMs[attempt])
    }
  }

  /** Deliver pending operations in order, up to and including `ownKey`. */
  async function flush(sku: string, ownKey: string) {
    let result: any
    for (;;) {
      const [operation] = readPending(journal, userId, sku)
      if (!operation) return result
      try {
        result = await deliver(operation)
      } catch (error) {
        // A definitive 4xx means nothing was committed and resending cannot succeed.
        if (!(error instanceof RejectedIntakeError)) throw error
        writePending(journal, userId, sku, readPending(journal, userId, sku).filter((op) => op.key !== operation.key))
        throw error
      }
      // If removal fails, the next attempt safely replays the same server receipt.
      writePending(journal, userId, sku, readPending(journal, userId, sku).filter((op) => op.key !== operation.key))
      if (operation.key === ownKey) return result
    }
  }

  return {
    async submit(body: IntakeBody): Promise<{ result: any; replayed: boolean }> {
      const pending = readPending(journal, userId, body.sku)
      const replayed = !queued.get(body.sku) && pending.length > 0
      const ownKey = replayed ? pending[pending.length - 1].key : crypto.randomUUID()
      if (!replayed) writePending(journal, userId, body.sku, [...pending, { key: ownKey, body }])
      queued.set(body.sku, (queued.get(body.sku) ?? 0) + 1)
      const run = tail.then(() => flush(body.sku, ownKey))
      tail = run.catch(() => {})
      try {
        return { result: await run, replayed }
      } finally {
        const left = (queued.get(body.sku) ?? 1) - 1
        if (left) queued.set(body.sku, left)
        else queued.delete(body.sku)
      }
    },
  }
}
