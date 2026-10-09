import { describe, expect, it } from 'vitest'
import { invoiceEditHref } from './invoice-edit'

describe('invoiceEditHref', () => {
  it('links drafts and open invoices to the edit page', () => {
    expect(invoiceEditHref({ id: 'a', status: 'DRAFT' })).toBe('/invoices/a/edit')
    expect(invoiceEditHref({ id: 'b', status: 'UNPAID', sefStatus: null })).toBe('/invoices/b/edit')
    expect(invoiceEditHref({ id: 'c', status: 'DRAFT', documentType: 'PROFORMA' })).toBe('/invoices/c/edit')
  })

  it('is null for paid invoices', () => {
    expect(invoiceEditHref({ id: 'a', status: 'PAID' })).toBeNull()
  })

  it('is null once the invoice was sent to SEF, whatever the SEF status', () => {
    expect(invoiceEditHref({ id: 'a', status: 'UNPAID', sefStatus: 'SENDING' })).toBeNull()
    expect(invoiceEditHref({ id: 'a', status: 'UNPAID', sefStatus: 'REJECTED' })).toBeNull()
  })

  it('is null for a predračun already turned into an invoice', () => {
    expect(
      invoiceEditHref({ id: 'a', status: 'DRAFT', documentType: 'PROFORMA', convertedInvoiceId: 'inv' })
    ).toBeNull()
  })
})
