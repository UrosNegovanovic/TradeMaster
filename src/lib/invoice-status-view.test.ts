import { describe, expect, it } from 'vitest'
import { invoiceStatusView } from './invoice-status-view'

const now = new Date('2026-10-10T10:00:00+02:00')

describe('invoiceStatusView', () => {
  it('shows paid as success even when the due date passed', () => {
    expect(invoiceStatusView('PAID', '2026-01-01', now)).toEqual({ tone: 'success', label: 'Plaćeno' })
  })

  it('shows draft as neutral, never overdue', () => {
    expect(invoiceStatusView('DRAFT', '2026-01-01', now)).toEqual({ tone: 'neutral', label: 'Nacrt' })
  })

  it('shows an issued invoice due today or later as open warning', () => {
    expect(invoiceStatusView('UNPAID', '2026-10-10T00:00:00+02:00', now).tone).toBe('warning')
    expect(invoiceStatusView('UNPAID', '2026-10-20', now)).toEqual({ tone: 'warning', label: 'Otvoreno' })
  })

  it('shows an issued invoice past the Belgrade due day as danger with Serbian plural', () => {
    expect(invoiceStatusView('UNPAID', '2026-10-09T00:00:00+02:00', now)).toEqual({
      tone: 'danger',
      label: 'Kasni 1 dan',
    })
    expect(invoiceStatusView('UNPAID', '2026-10-05T00:00:00+02:00', now).label).toBe('Kasni 5 dana')
  })

  it('treats a missing due date as open', () => {
    expect(invoiceStatusView('UNPAID', null, now).tone).toBe('warning')
  })
})
