import { describe, expect, it } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { costsOfLinesWithoutProduct, invoiceErrorResponse, lineUnitCost } from './invoice-service'

describe('invoiceErrorResponse (unit)', () => {
  it('returns a controlled 400 for a Zod-shaped error without relying only on instanceof', async () => {
    const zodShaped = {
      name: 'ZodError',
      errors: [{ path: ['dueDate'], message: 'dueDate must be a valid date' }],
    }

    const response = invoiceErrorResponse(zodShaped)
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Validation error',
      details: [{ path: 'dueDate', message: 'dueDate must be a valid date' }],
    })
  })
})

describe('lineUnitCost (ROADMAP A9.11)', () => {
  const costs = new Map<string, Decimal | null>([
    ['p1', new Decimal('80')],
    ['p2', null],
  ])

  it('takes today purchase price for a product line, null when the product has none', () => {
    expect(String(lineUnitCost({ productId: 'p1', productName: 'Kafa' }, costs))).toBe('80')
    expect(lineUnitCost({ productId: 'p2', productName: 'Čaj' }, costs)).toBeNull()
  })

  it('gives a new free line a cost of goods of 0', () => {
    expect(lineUnitCost({ productId: null, productName: 'Prevoz', free: true }, costs)).toBe(0)
  })

  it('keeps the stored cost of a line whose product was deleted, never inventing one', () => {
    const previous = costsOfLinesWithoutProduct([
      { productId: null, productName: 'Obrisan artikal', unitCost: new Decimal('55.5') },
      { productId: null, productName: 'Stari bez troška', unitCost: null },
      { productId: 'p1', productName: 'Kafa', unitCost: new Decimal('70') },
    ])
    // The form shows such a line as free and sends free: true; the stored snapshot still wins.
    expect(String(lineUnitCost({ productId: null, productName: 'Obrisan artikal', free: true }, costs, previous))).toBe('55.5')
    expect(lineUnitCost({ productId: null, productName: 'Stari bez troška', free: true }, costs, previous)).toBeNull()
    expect(previous.has('Kafa')).toBe(false)
  })

  it('leaves a line without product and without the free flag at null', () => {
    expect(lineUnitCost({ productId: null, productName: 'Nešto' }, costs)).toBeNull()
  })
})
