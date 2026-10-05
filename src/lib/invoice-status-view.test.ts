import { describe, expect, it } from 'vitest'
import { documentStatusView, invoiceStatusView } from './invoice-status-view'

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

describe('documentStatusView', () => {
  it('falls back to the invoice view for invoices', () => {
    expect(documentStatusView({ documentType: 'INVOICE', status: 'PAID', dueDate: '2026-01-01' }, now)).toEqual({
      tone: 'success',
      label: 'Plaćeno',
    })
  })

  it('never shows a proforma as overdue', () => {
    expect(documentStatusView({ documentType: 'PROFORMA', status: 'UNPAID', dueDate: '2026-10-01' }, now)).toEqual({
      tone: 'neutral',
      label: 'Istekao',
    })
    expect(documentStatusView({ documentType: 'PROFORMA', status: 'UNPAID', dueDate: '2026-10-20' }, now)).toEqual({
      tone: 'warning',
      label: 'Čeka uplatu',
    })
  })

  it('shows a converted proforma as done', () => {
    expect(
      documentStatusView(
        { documentType: 'PROFORMA', status: 'UNPAID', dueDate: '2026-10-01', convertedInvoiceId: 'inv-1' },
        now
      )
    ).toEqual({ tone: 'success', label: 'Pretvoren u fakturu' })
  })
})
