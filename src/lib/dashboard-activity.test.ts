import { describe, expect, it } from 'vitest'
import {
  countOverdueInvoices,
  isInvoiceOverdue,
  movementTotalsFromGroups,
  previewTodayIntakes,
  previewTodayMovements,
} from './dashboard-activity'

const now = new Date(2026, 8, 23, 15, 0, 0)

function movement(
  partial: Partial<{
    id: string
    type: 'IN' | 'OUT'
    quantity: number
    reason: string
    name: string
  }>
) {
  return {
    id: partial.id ?? 'm1',
    type: partial.type ?? 'IN',
    quantity: partial.quantity ?? 1,
    reason: partial.reason ?? 'Ulaz robe',
    createdAt: now,
    product: {
      id: 'p1',
      name: partial.name ?? 'Xixo',
      sku: '5999885747054',
    },
  }
}

describe('dashboard activity', () => {
  it('sums today IN and OUT groups without inventing extra types', () => {
    expect(
      movementTotalsFromGroups([
        { type: 'IN', count: 7, quantity: 14 },
        { type: 'OUT', count: 2, quantity: 5 },
      ])
    ).toEqual({
      intakeCount: 7,
      intakeQuantity: 14,
      outCount: 2,
      outQuantity: 5,
    })
  })

  it('previews intakes separately from mixed movement history', () => {
    const rows = [
      movement({ id: 'out-1', type: 'OUT', quantity: 3, reason: 'Faktura 5/2026' }),
      movement({ id: 'in-1', type: 'IN', quantity: 2 }),
      movement({ id: 'in-2', type: 'IN', quantity: 1, name: 'Voda' }),
    ]

    expect(previewTodayIntakes(rows, 1).map((row) => row.id)).toEqual(['in-1'])
    expect(previewTodayMovements(rows, 2).map((row) => row.id)).toEqual(['out-1', 'in-1'])
  })

  it('treats due dates before today as overdue, including the due-date clock time', () => {
    expect(isInvoiceOverdue(new Date(2026, 8, 22, 23, 0, 0), now)).toBe(true)
    expect(isInvoiceOverdue(new Date(2026, 8, 23, 8, 0, 0), now)).toBe(false)
    expect(isInvoiceOverdue(new Date(2026, 8, 24), now)).toBe(false)
    expect(
      countOverdueInvoices(
        [{ dueDate: new Date(2026, 8, 20) }, { dueDate: new Date(2026, 8, 23) }],
        now
      )
    ).toBe(1)
  })
})
