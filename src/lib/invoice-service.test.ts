import { describe, expect, it } from 'vitest'
import { invoiceErrorResponse } from './invoice-service'

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
