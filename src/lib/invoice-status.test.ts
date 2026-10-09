import { describe, expect, it } from 'vitest'
import {
  invoiceStatusAction,
  invoiceStatusLabel,
  invoicesListHref,
  isPaidInvoiceStatus,
  OPEN_INVOICE_STATUS,
} from './invoice-status'

describe('invoice-status', () => {
  it('treats only PAID as paid and routes archive correctly', () => {
    expect(isPaidInvoiceStatus('PAID')).toBe(true)
    expect(isPaidInvoiceStatus('UNPAID')).toBe(false)
    expect(isPaidInvoiceStatus('DRAFT')).toBe(false)
    expect(invoicesListHref('PAID')).toBe('/invoices?status=paid')
    expect(invoicesListHref('UNPAID')).toBe('/invoices')
  })

  it('labels issued and draft invoices as open until paid', () => {
    expect(invoiceStatusLabel('DRAFT')).toBe('Otvoreno')
    expect(invoiceStatusLabel('UNPAID')).toBe('Otvoreno')
    expect(invoiceStatusLabel('PAID')).toBe('Plaćeno')
    expect(OPEN_INVOICE_STATUS).toBe('UNPAID')
  })

  it('offers issuing for a draft, never paying it directly', () => {
    expect(invoiceStatusAction('DRAFT')).toBe('issue')
    expect(invoiceStatusAction('UNPAID')).toBe('pay')
    expect(invoiceStatusAction('PAID')).toBe('reopen')
  })
})
