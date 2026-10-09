import * as XLSX from 'xlsx'
import { neutralizeFormula } from '@/lib/invoice-export'
import type { StockList } from '@/lib/stock-list'

export const STOCK_LIST_HEADERS = [
  'Šifra',
  'Naziv',
  'Kategorija',
  'Stanje (kom)',
  'Nabavna cena',
  'Prodajna cena',
  'Nabavna vrednost',
  'Prodajna vrednost',
] as const

type Cell = string | number

function sheetRows(list: StockList): Cell[][] {
  const body = list.rows.map((row): Cell[] => [
    neutralizeFormula(row.sku),
    neutralizeFormula(row.name),
    neutralizeFormula(row.category),
    row.quantity,
    row.costPrice ?? '',
    row.price,
    row.costValue ?? 'nedostaje nabavna',
    row.saleValue,
  ])
  const total: Cell[] = ['', 'Ukupno', '', list.totals.quantity, '', '', list.totals.costValue, list.totals.saleValue]
  return [[...STOCK_LIST_HEADERS], ...body, total]
}

export function stockListToXlsx(list: StockList): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet(sheetRows(list))
  sheet['!cols'] = [16, 36, 18, 12, 14, 14, 18, 18].map((wch) => ({ wch }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Lager lista')
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

/** Serbian Excel CSV: semicolon, decimal comma, UTF-8 BOM. */
export function stockListToCsv(list: StockList): string {
  const cell = (value: Cell) => {
    const text =
      typeof value === 'number'
        ? Number.isInteger(value)
          ? String(value)
          : value.toFixed(2).replace('.', ',')
        : value
    return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return `﻿${sheetRows(list)
    .map((row) => row.map(cell).join(';'))
    .join('\r\n')}\r\n`
}
