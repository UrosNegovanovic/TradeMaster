import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { buildStockList, stockListFilename } from './stock-list'
import { stockListToCsv, stockListToXlsx } from './stock-list-export'

const products = [
  // Old daily batch of the same SKU at older prices, plus the newest row.
  { sku: 'K1', name: 'Kafa stari', quantity: 2, price: '90', costPrice: '60', createdAt: '2026-01-01', category: null },
  { sku: 'K1', name: 'Kafa 200g', quantity: 3, price: '100', costPrice: '70', createdAt: '2026-09-01', category: { name: 'Napici' } },
  // Quick Scan product without purchase price.
  { sku: 'C1', name: 'Čaj', quantity: 4, price: '50', costPrice: null, createdAt: '2026-09-02', category: null },
  // Sold out, no cost: does not count as missing.
  { sku: 'A1', name: 'Aparat', quantity: 0, price: '0', costPrice: null, createdAt: '2026-09-03', category: null },
]

describe('buildStockList (ROADMAP A9.19)', () => {
  const list = buildStockList(products)

  it('has one row per SKU with summed stock and the newest name and prices', () => {
    expect(list.rows.map((row) => row.sku)).toEqual(['A1', 'C1', 'K1'])
    expect(list.rows[2]).toEqual({
      sku: 'K1',
      name: 'Kafa 200g',
      category: 'Napici',
      quantity: 5,
      costPrice: 70,
      price: 100,
      costValue: 2 * 60 + 3 * 70,
      saleValue: 2 * 90 + 3 * 100,
    })
  })

  it('never guesses a missing purchase value', () => {
    expect(list.rows[1]).toMatchObject({ sku: 'C1', costValue: null, saleValue: 200 })
    expect(list.rows[0]).toMatchObject({ sku: 'A1', costValue: 0 })
    expect(list.totals).toEqual({ quantity: 9, costValue: 330, saleValue: 680, missingCostCount: 1 })
  })

  it('writes an XLSX sheet with Serbian headers and a total row', () => {
    const workbook = XLSX.read(stockListToXlsx(list), { type: 'buffer' })
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets['Lager lista'], { header: 1, defval: '' })
    expect(rows[0]).toEqual([
      'Šifra',
      'Naziv',
      'Kategorija',
      'Stanje (kom)',
      'Nabavna cena',
      'Prodajna cena',
      'Nabavna vrednost',
      'Prodajna vrednost',
    ])
    expect(rows[2]).toEqual(['C1', 'Čaj', '', 4, '', 50, 'nedostaje nabavna', 200])
    expect(rows[rows.length - 1]).toEqual(['', 'Ukupno', '', 9, '', '', 330, 680])
  })

  it('writes a Serbian-Excel CSV and keeps formula-looking names as text', () => {
    const csv = stockListToCsv(buildStockList([{ ...products[2], name: '=SUM(A1)' }]))
    expect(csv.startsWith('﻿Šifra;Naziv')).toBe(true)
    expect(csv).toContain("C1;'=SUM(A1);;4;;50;nedostaje nabavna;200")
  })

  it('names the file by the Belgrade date', () => {
    expect(stockListFilename('xlsx', new Date('2026-10-09T22:30:00.000Z'))).toBe('lager-lista_2026-10-10.xlsx')
  })
})
