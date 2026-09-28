import { describe, expect, it } from 'vitest'
import {
  parseAssortmentGrid,
  parseCsvText,
  parseStockAdjustGrid,
} from './assortment-import'

describe('parseCsvText', () => {
  it('parses quoted commas and strips a BOM', () => {
    const rows = parseCsvText('\uFEFFnaziv,sku\n"Sok, jabuka",123')
    expect(rows).toEqual([
      ['naziv', 'sku'],
      ['Sok, jabuka', '123'],
    ])
  })
})

describe('parseAssortmentGrid', () => {
  const header = ['naziv', 'sku', 'kolicina', 'cena', 'nabavna_cena', 'kategorija']

  it('rejects a smart-mapped or reordered header', () => {
    const parsed = parseAssortmentGrid([['name', 'sku', 'kolicina', 'cena', 'nabavna_cena', 'kategorija']])
    expect(parsed).toMatchObject({ error: expect.stringContaining('Zaglavlje mora tačno biti') })
  })

  it('keeps valid rows sendable and marks missing name/sku or non-numeric qty as invalid', () => {
    const parsed = parseAssortmentGrid([
      header,
      ['Sok', '86001', '4', '120', '80', 'Piće'],
      ['', '86002', '2', '10', '', ''],
      ['Kafa', '', '2', '10', '', ''],
      ['Čaj', '86003', 'nije-broj', '10', '', ''],
      ['Voda', '86004', '1', '50', '', ''],
    ])
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.rows).toHaveLength(5)
    expect(parsed.rows.filter((row) => row.valid).map((row) => row.payload?.sku)).toEqual(['86001', '86004'])
    expect(parsed.rows.find((row) => row.display.sku === '86002')?.valid).toBe(false)
    expect(parsed.rows.find((row) => row.display.naziv === 'Kafa')?.valid).toBe(false)
    expect(parsed.rows.find((row) => row.display.sku === '86003')?.valid).toBe(false)
    expect(parsed.rows[0].payload).toMatchObject({
      name: 'Sok',
      sku: '86001',
      quantity: 4,
      price: 120,
      costPrice: 80,
      categoryName: 'Piće',
    })
    expect(parsed.rows[4].payload).toEqual({
      name: 'Voda',
      sku: '86004',
      quantity: 1,
      price: 50,
    })
  })

  it('accepts comma decimals and omits empty optional cost', () => {
    const parsed = parseAssortmentGrid([
      header,
      ['Sok', '1', '2', '12,5', '', ''],
    ])
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.rows[0].valid).toBe(true)
    expect(parsed.rows[0].payload).toMatchObject({ price: 12.5 })
    expect(parsed.rows[0].payload).not.toHaveProperty('costPrice')
  })
})

describe('parseStockAdjustGrid', () => {
  it('treats kolicina as a SET value and allows zero', () => {
    const parsed = parseStockAdjustGrid([
      ['sku', 'kolicina'],
      ['86001', '12'],
      ['86002', '0'],
      ['', '3'],
      ['86003', 'x'],
    ])
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.rows.filter((row) => row.valid).map((row) => row.payload)).toEqual([
      { sku: '86001', quantity: 12 },
      { sku: '86002', quantity: 0 },
    ])
  })

  it('does not interpret extra price columns as updates', () => {
    const parsed = parseStockAdjustGrid([
      ['sku', 'kolicina', 'cena'],
      ['86001', '5', '999'],
    ])
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.rows[0].payload).toEqual({ sku: '86001', quantity: 5 })
  })
})
