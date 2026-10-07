import { describe, expect, it } from 'vitest'
import { findProductByScan, scanTarget, type ScanLine } from './invoice-scan'

const product = (id: string, sku: string, createdAt: string, quantity = 1) => ({ id, sku, createdAt, quantity })

describe('findProductByScan', () => {
  const products = [
    product('old', '8600123456789', '2026-01-01', 3),
    product('new', '8600123456789', '2026-05-01', 2),
    product('manual', 'KABL-01', '2026-02-01'),
  ]

  it('finds the newest row of the scanned SKU with the summed stock', () => {
    const match = findProductByScan(products, ' 8600123456789 ')
    expect(match).toMatchObject({ kind: 'found', product: { id: 'new', quantity: 5 } })
  })

  it('matches a non-numeric SKU exactly', () => {
    expect(findProductByScan(products, 'KABL-01')).toMatchObject({ kind: 'found', product: { id: 'manual' } })
  })

  it('matches by digits when the read carries separators', () => {
    expect(findProductByScan(products, '860-0123456789')).toMatchObject({ kind: 'found', product: { id: 'new' } })
  })

  it('reports an unknown full barcode as not found', () => {
    expect(findProductByScan(products, '4006381333931')).toEqual({ kind: 'not-found', code: '4006381333931' })
  })

  it('ignores empty reads and short digit slices', () => {
    expect(findProductByScan(products, '  ')).toEqual({ kind: 'noise' })
    expect(findProductByScan(products, '12345')).toEqual({ kind: 'noise' })
  })
})

describe('scanTarget', () => {
  const skus: Record<string, string> = { a1: 'A', a0: 'A', b: 'B' }
  const skuForLine = (line: ScanLine) => (line.productId ? skus[line.productId] ?? null : null)
  const line = (id: string, productId: string | null, productName = ''): ScanLine => ({ id, productId, productName })

  it('increments the line that already has the product, even on an older batch row', () => {
    expect(scanTarget([line('1', 'b', 'B'), line('2', 'a0', 'A')], 'A', skuForLine)).toEqual({
      action: 'increment',
      lineId: '2',
    })
  })

  it('fills the blank starting line', () => {
    expect(scanTarget([line('1', null)], 'A', skuForLine)).toEqual({ action: 'fill', lineId: '1' })
  })

  it('does not overwrite a typed line without a product', () => {
    expect(scanTarget([line('1', null, 'Usluga prevoza')], 'A', skuForLine)).toEqual({ action: 'append' })
  })

  it('appends when every line is taken', () => {
    expect(scanTarget([line('1', 'b', 'B')], 'A', skuForLine)).toEqual({ action: 'append' })
  })
})
