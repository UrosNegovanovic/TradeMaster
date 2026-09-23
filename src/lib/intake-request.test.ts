import { describe, expect, it, vi } from 'vitest'
import { createIntakeQueue } from './intake-request'

function storage() {
  const values = new Map<string, string>()
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
}
const body = { name: 'Coffee', sku: '0012345678905', price: 0, quantity: 1 }
const ok = (action = 'updated') => new Response(JSON.stringify({ action }), { status: 200 })
const noSleep = { sleep: async () => {} }
const keyOf = (send: ReturnType<typeof vi.fn>, call: number) => send.mock.calls[call][1].headers['Idempotency-Key']

describe('intake queue', () => {
  it('gives each scan of the same barcode its own idempotency key', async () => {
    const send = vi.fn().mockImplementation(async () => ok())
    const queue = createIntakeQueue('owner-a', storage(), { send, ...noSleep })
    await Promise.all([queue.submit(body), queue.submit(body), queue.submit(body)])
    expect(send).toHaveBeenCalledTimes(3)
    expect(new Set([0, 1, 2].map((i) => keyOf(send, i))).size).toBe(3)
  })

  it('does not make the next scan wait on the previous save before being queued', async () => {
    let release!: () => void
    const send = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { release = () => resolve(ok('created')) }))
      .mockImplementation(async () => ok())
    const journal = storage()
    const queue = createIntakeQueue('owner-a', journal, { send, ...noSleep })
    const first = queue.submit(body)
    const second = queue.submit(body)
    // Both scans are journaled before any response arrives.
    expect(JSON.parse(journal.values.get('trademaster:intake:owner-a:0012345678905')!)).toHaveLength(2)
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1))
    release()
    await expect(first).resolves.toMatchObject({ result: { action: 'created' }, replayed: false })
    await expect(second).resolves.toMatchObject({ result: { action: 'updated' }, replayed: false })
    expect(journal.values.size).toBe(0)
  })

  it('resends a lost response with the same key and body so the server counts it once', async () => {
    const send = vi.fn()
      .mockRejectedValueOnce(new Error('connection lost'))
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValue(ok())
    const queue = createIntakeQueue('owner-a', storage(), { send, ...noSleep })
    await queue.submit(body)
    expect(send).toHaveBeenCalledTimes(3)
    expect(keyOf(send, 1)).toBe(keyOf(send, 0))
    expect(keyOf(send, 2)).toBe(keyOf(send, 0))
    expect(send.mock.calls[2][1].body).toBe(send.mock.calls[0][1].body)
  })

  it('after retries are exhausted, a rescan replays the unconfirmed scan instead of adding one', async () => {
    const journal = storage()
    const send = vi.fn().mockRejectedValue(new Error('offline'))
    const queue = createIntakeQueue('owner-a', journal, { send, ...noSleep, retryDelaysMs: [1] })
    await expect(queue.submit(body)).rejects.toThrow()
    const failedKey = keyOf(send, 0)
    send.mockReset().mockImplementation(async () => ok())
    await expect(queue.submit({ ...body, name: 'Changed lookup' })).resolves.toMatchObject({ replayed: true })
    expect(send).toHaveBeenCalledTimes(1)
    expect(keyOf(send, 0)).toBe(failedKey)
    expect(JSON.parse(send.mock.calls[0][1].body).name).toBe('Coffee')
    await queue.submit(body)
    expect(keyOf(send, 1)).not.toBe(failedKey)
  })

  it('a pending scan left from before a reload is replayed by the next scan', async () => {
    const journal = storage()
    journal.setItem('trademaster:intake:owner-a:0012345678905', JSON.stringify({ key: 'legacy-key-0000000001', body }))
    const send = vi.fn().mockImplementation(async () => ok())
    await createIntakeQueue('owner-a', journal, { send, ...noSleep }).submit(body)
    expect(send).toHaveBeenCalledTimes(1)
    expect(keyOf(send, 0)).toBe('legacy-key-0000000001')
  })

  it('drops a definitively rejected scan so it cannot block later scans', async () => {
    const journal = storage()
    const send = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 409 })).mockImplementation(async () => ok())
    const queue = createIntakeQueue('owner-a', journal, { send, ...noSleep })
    await expect(queue.submit(body)).rejects.toThrow('409')
    expect(send).toHaveBeenCalledTimes(1)
    expect(journal.values.size).toBe(0)
    await expect(queue.submit(body)).resolves.toMatchObject({ replayed: false })
  })

  it('separates company users', async () => {
    const journal = storage()
    const send = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 500 })).mockResolvedValue(ok())
    await expect(createIntakeQueue('owner-a', journal, { send, ...noSleep, retryDelaysMs: [] }).submit(body)).rejects.toThrow()
    await createIntakeQueue('owner-b', journal, { send, ...noSleep }).submit(body)
    expect(keyOf(send, 1)).not.toBe(keyOf(send, 0))
  })

  it('does not send stock when durable retry storage is unavailable', async () => {
    const journal = storage()
    journal.setItem = () => { throw new Error('storage unavailable') }
    const send = vi.fn()
    await expect(createIntakeQueue('owner-a', journal, { send }).submit(body)).rejects.toThrow('storage unavailable')
    expect(send).not.toHaveBeenCalled()
  })
})
