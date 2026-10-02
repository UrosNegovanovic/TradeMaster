import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import {
  INVOICE_EXPORT_HEADERS,
  MAX_EXPORT_DAYS,
  buildInvoiceExportRows,
  invoiceExportFilename,
  invoiceRowsToCsv,
  invoiceRowsToXlsx,
  neutralizeFormula,
  parseExportRange,
} from './invoice-export'

const invoice = {
  invoiceNumber: '2026-001',
  createdAt: '2026-09-30T22:30:00.000Z', // 1 Oct 00:30 in Belgrade
  dueDate: '2026-10-30T10:00:00.000Z',
  clientName: 'Kupac "Đorđe"; DOO',
  clientPib: '123456789',
  status: 'PAID',
  totalAmount: '1200.00',
  vatAmount: '200.00',
  paidAt: '2026-10-05T09:00:00.000Z',
}

describe('parseExportRange', () => {
  it('treats the end day as inclusive in Europe/Belgrade', () => {
    const result = parseExportRange('2026-10-01', '2026-10-31')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.range.from.toISOString()).toBe('2026-09-30T22:00:00.000Z')
    expect(result.range.toExclusive.toISOString()).toBe('2026-10-31T23:00:00.000Z')
  })

  it('rejects bad, reversed and oversized periods', () => {
    expect(parseExportRange('x', '2026-10-01').ok).toBe(false)
    expect(parseExportRange(null, null).ok).toBe(false)
    expect(parseExportRange('2026-10-02', '2026-10-01').ok).toBe(false)
    expect(parseExportRange('2025-01-01', '2026-12-31').ok).toBe(false)
    expect(MAX_EXPORT_DAYS).toBe(366)
    expect(parseExportRange('2026-01-01', '2026-12-31').ok).toBe(true)
  })
})

describe('buildInvoiceExportRows', () => {
  it('maps an invoice to Belgrade dates and base/VAT/total', () => {
    expect(buildInvoiceExportRows([invoice])).toEqual([
      ['2026-001', '01.10.2026.', '30.10.2026.', 'Kupac "Đorđe"; DOO', '123456789', 'Plaćeno', 1000, 200, 1200, '05.10.2026.'],
    ])
  })

  it('handles open invoices without VAT or payment date', () => {
    const [row] = buildInvoiceExportRows([
      { ...invoice, status: 'UNPAID', vatAmount: null, paidAt: null, clientPib: null, totalAmount: 19.99 },
    ])
    expect(row.slice(4)).toEqual(['', 'Otvoreno', 19.99, 0, 19.99, ''])
  })

  it('neutralizes spreadsheet formulas', () => {
    expect(neutralizeFormula('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(neutralizeFormula('Kupac')).toBe('Kupac')
    expect(buildInvoiceExportRows([{ ...invoice, clientName: '+381' }])[0][3]).toBe("'+381")
  })
})

describe('invoiceRowsToCsv', () => {
  it('uses BOM, semicolons, decimal commas and escapes quotes', () => {
    const csv = invoiceRowsToCsv(buildInvoiceExportRows([invoice]))
    expect(csv.startsWith('﻿' + INVOICE_EXPORT_HEADERS.join(';'))).toBe(true)
    const lines = csv.trim().split('\r\n')
    expect(lines).toHaveLength(2)
    expect(lines[1]).toBe(
      '2026-001;01.10.2026.;30.10.2026.;"Kupac ""Đorđe""; DOO";123456789;Plaćeno;1000,00;200,00;1200,00;05.10.2026.'
    )
  })
})

describe('invoiceRowsToXlsx', () => {
  it('writes numeric money cells under the Serbian headers', () => {
    const workbook = XLSX.read(invoiceRowsToXlsx(buildInvoiceExportRows([invoice])), { type: 'buffer' })
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['Fakture'])
    expect(rows).toHaveLength(1)
    expect(rows[0]['Ukupno']).toBe(1200)
    expect(rows[0]['Kupac']).toBe('Kupac "Đorđe"; DOO')
  })
})

describe('invoiceExportFilename', () => {
  it('includes the period and extension', () => {
    expect(invoiceExportFilename({ fromYmd: '2026-10-01', toYmd: '2026-10-31' }, 'xlsx')).toBe(
      'fakture_2026-10-01_2026-10-31.xlsx'
    )
  })
})
