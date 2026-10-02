import * as XLSX from 'xlsx'
import { formatLocalYmd, parseLocalYmd, startOfLocalTomorrow } from '@/lib/local-date'
import { invoiceStatusLabel } from '@/lib/invoice-status'

/** One export covers at most a year of calendar days; keeps the response small on serverless. */
export const MAX_EXPORT_DAYS = 366
export const MAX_EXPORT_ROWS = 5000

export const INVOICE_EXPORT_HEADERS = [
  'Broj fakture',
  'Datum izdavanja',
  'Rok plaćanja',
  'Kupac',
  'PIB',
  'Status',
  'Osnovica',
  'PDV',
  'Ukupno',
  'Datum plaćanja',
] as const

type MoneyLike = number | string | { toString(): string } | null | undefined

export type ExportInvoiceInput = {
  invoiceNumber: string
  createdAt: Date | string
  dueDate: Date | string
  clientName: string
  clientPib?: string | null
  status: string
  totalAmount: MoneyLike
  vatAmount?: MoneyLike
  paidAt?: Date | string | null
}

export type InvoiceExportCell = string | number
export type InvoiceExportRow = InvoiceExportCell[]

export type ExportRange = { from: Date; toExclusive: Date; fromYmd: string; toYmd: string }

export type ExportRangeResult = { ok: true; range: ExportRange } | { ok: false; error: string }

/** Inclusive Belgrade calendar days `from`..`to` (YYYY-MM-DD) as a half-open UTC interval. */
export function parseExportRange(
  fromValue: string | null | undefined,
  toValue: string | null | undefined
): ExportRangeResult {
  const from = parseLocalYmd(fromValue)
  const toStart = parseLocalYmd(toValue)
  if (!from || !toStart) {
    return { ok: false, error: 'Unesite period u formatu GGGG-MM-DD.' }
  }
  if (toStart < from) {
    return { ok: false, error: 'Početni datum ne može biti posle krajnjeg.' }
  }
  const toExclusive = startOfLocalTomorrow(toStart)
  const days = Math.round((toExclusive.getTime() - from.getTime()) / 86_400_000)
  if (days > MAX_EXPORT_DAYS) {
    return { ok: false, error: 'Period može da obuhvati najviše godinu dana.' }
  }
  return {
    ok: true,
    range: {
      from,
      toExclusive,
      fromYmd: formatLocalYmd(from),
      toYmd: formatLocalYmd(toStart),
    },
  }
}

function toNumber(value: MoneyLike): number {
  if (value === null || value === undefined) return 0
  const amount = typeof value === 'number' ? value : Number(value.toString())
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0
}

function displayDate(value: Date | string | null | undefined): string {
  if (!value) return ''
  const [year, month, day] = formatLocalYmd(new Date(value)).split('-')
  return `${day}.${month}.${year}.`
}

/** Spreadsheet apps run cells starting with = + - @ as formulas; prefix them so buyer names stay text. */
export function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}

export function buildInvoiceExportRows(invoices: ExportInvoiceInput[]): InvoiceExportRow[] {
  return invoices.map((invoice) => {
    const total = toNumber(invoice.totalAmount)
    const vat = toNumber(invoice.vatAmount)
    return [
      neutralizeFormula(invoice.invoiceNumber),
      displayDate(invoice.createdAt),
      displayDate(invoice.dueDate),
      neutralizeFormula(invoice.clientName),
      invoice.clientPib ?? '',
      invoiceStatusLabel(invoice.status),
      Math.round((total - vat) * 100) / 100,
      vat,
      total,
      displayDate(invoice.paidAt),
    ]
  })
}

function csvCell(cell: InvoiceExportCell): string {
  const text = typeof cell === 'number' ? cell.toFixed(2).replace('.', ',') : cell
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Serbian Excel: semicolon separator, decimal comma, UTF-8 BOM so č/ć/đ open correctly. */
export function invoiceRowsToCsv(rows: InvoiceExportRow[]): string {
  const lines = [INVOICE_EXPORT_HEADERS as readonly string[], ...rows].map((row) =>
    row.map(csvCell).join(';')
  )
  return `﻿${lines.join('\r\n')}\r\n`
}

export function invoiceRowsToXlsx(rows: InvoiceExportRow[]): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet([[...INVOICE_EXPORT_HEADERS], ...rows])
  sheet['!cols'] = [14, 16, 14, 32, 12, 12, 14, 12, 14, 16].map((wch) => ({ wch }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Fakture')
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export function invoiceExportFilename(range: Pick<ExportRange, 'fromYmd' | 'toYmd'>, ext: 'csv' | 'xlsx') {
  return `fakture_${range.fromYmd}_${range.toYmd}.${ext}`
}
