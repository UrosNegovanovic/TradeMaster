import { describe, expect, it } from 'vitest'
import {
  NO_CATEGORY,
  countByCategory,
  deselectAll,
  filterPickerProducts,
  selectAll,
  toggleCategory,
} from './catalog-picker'

const products = [
  { id: 'p1', name: 'Marlboro', sku: '111', categoryId: 'cig', createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'p2', name: 'Kent', sku: '222', categoryId: 'cig', createdAt: '2026-10-02T10:00:00.000Z' },
  { id: 'p3', name: 'Coca Cola', sku: '333', categoryId: 'pice', createdAt: '2026-10-02T10:00:00.000Z' },
  { id: 'p4', name: 'Čokolada', sku: '444', categoryId: 'slatko', createdAt: '2026-10-02T10:00:00.000Z' },
  { id: 'p5', name: 'Kesa', sku: '555', categoryId: null, createdAt: '2026-10-02T10:00:00.000Z' },
]

const ids = (list: Array<{ id: string }>) => list.map((p) => p.id)

describe('filterPickerProducts', () => {
  it('returns everything with no filters', () => {
    expect(ids(filterPickerProducts(products, { query: '', categories: [] }))).toEqual(['p1', 'p2', 'p3', 'p4', 'p5'])
  })

  it('keeps products from ANY of several selected categories', () => {
    expect(ids(filterPickerProducts(products, { query: '', categories: ['cig', 'pice'] }))).toEqual(['p1', 'p2', 'p3'])
  })

  it('can include uncategorized products', () => {
    expect(ids(filterPickerProducts(products, { query: '', categories: ['slatko', NO_CATEGORY] }))).toEqual(['p4', 'p5'])
  })

  it('combines categories with search by name or SKU', () => {
    expect(ids(filterPickerProducts(products, { query: 'ken', categories: ['cig', 'pice'] }))).toEqual(['p2'])
    expect(ids(filterPickerProducts(products, { query: '333', categories: [] }))).toEqual(['p3'])
  })

  it('applies the date predicate', () => {
    const onlyOct1 = (createdAt: Date | string) => String(createdAt).startsWith('2026-10-01')
    expect(ids(filterPickerProducts(products, { query: '', categories: [], matchesDate: onlyOct1 }))).toEqual(['p1'])
  })
})

describe('toggleCategory', () => {
  it('adds and removes a category', () => {
    expect(toggleCategory([], 'cig')).toEqual(['cig'])
    expect(toggleCategory(['cig'], 'pice')).toEqual(['cig', 'pice'])
    expect(toggleCategory(['cig', 'pice'], 'cig')).toEqual(['pice'])
  })
})

describe('selectAll / deselectAll', () => {
  it('adds only the missing visible products and keeps earlier picks first', () => {
    expect(selectAll(['p4'], ['p1', 'p2', 'p4'])).toEqual(['p4', 'p1', 'p2'])
  })

  it('deselects only the visible products, keeping picks hidden by a filter', () => {
    expect(deselectAll(['p1', 'p2', 'p4'], ['p1', 'p2', 'p3'])).toEqual(['p4'])
  })
})

describe('countByCategory', () => {
  it('counts totals and selections per category key', () => {
    expect(countByCategory(products, ['p1', 'p3', 'p5'], ['cig', 'pice', 'slatko', NO_CATEGORY])).toEqual([
      { key: 'cig', total: 2, selected: 1 },
      { key: 'pice', total: 1, selected: 1 },
      { key: 'slatko', total: 1, selected: 0 },
      { key: NO_CATEGORY, total: 1, selected: 1 },
    ])
  })
})
