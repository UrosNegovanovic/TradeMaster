import { describe, expect, it } from 'vitest'
import {
  canPrintDeliveryNote,
  convertedDueDate,
  documentLabels,
  isProforma,
  onlyInvoices,
  parseDocumentType,
  pdfFileName,
  sefXmlFileName,
  stockStatusFor,
} from './document-type'

describe('document type', () => {
  it('treats missing documentType as an invoice (rows before the migration)', () => {
    expect(isProforma({})).toBe(false)
    expect(isProforma({ documentType: null })).toBe(false)
    expect(isProforma({ documentType: 'PROFORMA' })).toBe(true)
    expect(parseDocumentType(undefined)).toBe('INVOICE')
    expect(parseDocumentType('PROFORMA')).toBe('PROFORMA')
    expect(parseDocumentType('proforma')).toBe('INVOICE')
  })

  it('keeps proformas out of finance lists', () => {
    const docs = [
      { id: 'a', documentType: 'INVOICE' },
      { id: 'b', documentType: 'PROFORMA' },
      { id: 'c' },
    ]
    expect(onlyInvoices(docs).map((doc) => doc.id)).toEqual(['a', 'c'])
  })

  it('never lets a proforma take stock, whatever its status', () => {
    expect(stockStatusFor('PROFORMA', 'UNPAID')).toBe('DRAFT')
    expect(stockStatusFor('PROFORMA', 'PAID')).toBe('DRAFT')
    expect(stockStatusFor('INVOICE', 'UNPAID')).toBe('UNPAID')
    expect(stockStatusFor(undefined, 'PAID')).toBe('PAID')
  })

  it('labels the documents in Serbian', () => {
    expect(documentLabels('PROFORMA').pdfTitle).toBe('PREDRAČUN')
    expect(documentLabels('PROFORMA').dueLabel).toBe('Važi do')
    expect(documentLabels('INVOICE').pdfTitle).toBe('FAKTURA')
    expect(documentLabels(null).dueLabel).toBe('Rok plaćanja')
  })

  it('prints a delivery note only for an issued invoice', () => {
    expect(canPrintDeliveryNote({ documentType: 'INVOICE', status: 'UNPAID' })).toBe(true)
    expect(canPrintDeliveryNote({ status: 'PAID' })).toBe(true)
    expect(canPrintDeliveryNote({ documentType: 'INVOICE', status: 'DRAFT' })).toBe(false)
    expect(canPrintDeliveryNote({ documentType: 'PROFORMA', status: 'UNPAID' })).toBe(false)
  })

  it('carries the proforma payment term over to the invoice', () => {
    const now = new Date('2026-10-20T10:00:00.000Z')
    const due = convertedDueDate(
      { createdAt: '2026-10-01T10:00:00.000Z', dueDate: '2026-10-16T10:00:00.000Z' },
      now
    )
    expect(due.toISOString()).toBe('2026-11-04T10:00:00.000Z')
  })

  it('uses a zero-day term when the proforma due date is before its issue date', () => {
    const now = new Date('2026-10-20T10:00:00.000Z')
    expect(convertedDueDate({ createdAt: '2026-10-10', dueDate: '2026-10-01' }, now).toISOString()).toBe(
      now.toISOString()
    )
  })

  it('names PDF files without slashes', () => {
    expect(pdfFileName('05/2026', 'INVOICE')).toBe('05_2026_faktura.pdf')
    expect(pdfFileName('PR-02/2026', 'PROFORMA')).toBe('PR-02_2026_predracun.pdf')
    expect(pdfFileName('05/2026', 'delivery')).toBe('05_2026_otpremnica.pdf')
    expect(pdfFileName('Test 2026', undefined)).toBe('Test_2026_faktura.pdf')
  })

  it('names the SEF XML file', () => {
    expect(sefXmlFileName('05/2026')).toBe('05_2026_SEF.xml')
    expect(sefXmlFileName('Đ "x"\r\n1')).toBe('x_1_SEF.xml')
  })
})
