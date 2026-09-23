import { describe, expect, it, vi } from 'vitest'
import { submitIntake } from './intake-request'

function storage() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
}
const body = { name: 'Coffee', sku: '0012345678905', price: 0, quantity: 1 }

describe('intake request retry', () => {
  it('retains the operation and original body after a lost response, then clears on success', async () => {
    const journal = storage()
    const send = vi.fn().mockRejectedValueOnce(new Error('connection lost')).mockImplementation(async () => new Response(JSON.stringify({ action: 'created' }), { status: 201 }))
    await expect(submitIntake('owner-a', body, journal, send)).rejects.toThrow()
    await submitIntake('owner-a', { ...body, name: 'Changed lookup' }, journal, send)
    expect(send.mock.calls[1][1].headers['Idempotency-Key']).toBe(send.mock.calls[0][1].headers['Idempotency-Key'])
    expect(send.mock.calls[1][1].body).toBe(send.mock.calls[0][1].body)
    await submitIntake('owner-a', body, journal, send)
    expect(send.mock.calls[2][1].headers['Idempotency-Key']).not.toBe(send.mock.calls[0][1].headers['Idempotency-Key'])
  })
  it('keeps ambiguous server errors retryable and separates company users', async () => {
    const journal = storage()
    const send = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 500 })).mockResolvedValue(new Response('{}', { status: 201 }))
    await expect(submitIntake('owner-a', body, journal, send)).rejects.toThrow()
    await submitIntake('owner-b', body, journal, send)
    expect(send.mock.calls[1][1].headers['Idempotency-Key']).not.toBe(send.mock.calls[0][1].headers['Idempotency-Key'])
  })
  it('does not send stock when durable retry storage is unavailable', async () => {
    const journal = storage()
    journal.setItem = () => { throw new Error('storage unavailable') }
    const send = vi.fn()
    await expect(submitIntake('owner-a', body, journal, send)).rejects.toThrow('storage unavailable')
    expect(send).not.toHaveBeenCalled()
  })
})
