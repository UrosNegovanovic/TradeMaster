import { describe, expect, it } from 'vitest'
import {
  arrangeCatalogItems,
  chunkSectionsIntoPages,
  DEFAULT_CATALOG_DISPLAY,
  filterCatalogItems,
  hasCatalogPrice,
  listCatalogCategories,
  moveId,
  normalizeSearchText,
  orderBySelection,
  paginateSections,
  readCatalogDisplay,
  UNCATEGORIZED_LABEL,
} from './catalog-layout'

type Item = { id: string; sortOrder: number; discountedPrice: string; product: { name: string } | null; category: string | null }

const item = (id: string, sortOrder: number, name: string, price: string, category: string | null): Item => ({
  id,
  sortOrder,
  discountedPrice: price,
  product: { name },
  category,
})

const items: Item[] = [
  item('a', 0, 'Šraf', '50.00', 'Okov'),
  item('b', 1, 'Čekić', '900.00', 'Alat'),
  item('c', 2, 'Bušilica', '0.00', 'Alat'),
  item('d', 3, 'Ćebe', '1200.00', null),
  item('e', 4, 'Ancher', '300.00', 'Okov'),
]
const categoryOf = (i: Item) => i.category
const ids = (list: Item[]) => list.map((i) => i.id)

describe('readCatalogDisplay', () => {
  it('falls back to defaults for missing or invalid values', () => {
    expect(readCatalogDisplay(undefined)).toEqual(DEFAULT_CATALOG_DISPLAY)
    expect(readCatalogDisplay({ layout: 'HUGE', sortMode: 'RANDOM', showSku: 'yes' })).toEqual(DEFAULT_CATALOG_DISPLAY)
  })

  it('keeps valid stored values', () => {
    expect(readCatalogDisplay({ layout: 'LIST', sortMode: 'NAME', groupByCategory: true, showSku: false })).toMatchObject({
      layout: 'LIST',
      sortMode: 'NAME',
      groupByCategory: true,
      showSku: false,
      showDescription: true,
    })
  })
})

describe('hasCatalogPrice', () => {
  it('treats 0, empty and invalid prices as price on request', () => {
    expect(hasCatalogPrice('0.00')).toBe(false)
    expect(hasCatalogPrice(0)).toBe(false)
    expect(hasCatalogPrice(null)).toBe(false)
    expect(hasCatalogPrice('abc')).toBe(false)
    expect(hasCatalogPrice('19.99')).toBe(true)
  })
})

describe('arrangeCatalogItems', () => {
  it('keeps the manual order by default', () => {
    const [section] = arrangeCatalogItems(items, DEFAULT_CATALOG_DISPLAY, categoryOf)
    expect(section.category).toBeNull()
    expect(ids(section.items)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('sorts by name with Serbian letters in alphabet order', () => {
    const [section] = arrangeCatalogItems(items, { sortMode: 'NAME', groupByCategory: false }, categoryOf)
    expect(section.items.map((i) => i.product?.name)).toEqual(['Ancher', 'Bušilica', 'Čekić', 'Ćebe', 'Šraf'])
  })

  it('sorts by price and keeps items without a price last in both directions', () => {
    const [asc] = arrangeCatalogItems(items, { sortMode: 'PRICE_ASC', groupByCategory: false }, categoryOf)
    expect(ids(asc.items)).toEqual(['a', 'e', 'b', 'd', 'c'])
    const [desc] = arrangeCatalogItems(items, { sortMode: 'PRICE_DESC', groupByCategory: false }, categoryOf)
    expect(ids(desc.items)).toEqual(['d', 'b', 'e', 'a', 'c'])
  })

  it('groups by category name with uncategorized items last', () => {
    const sections = arrangeCatalogItems(items, { sortMode: 'MANUAL', groupByCategory: true }, categoryOf)
    expect(sections.map((s) => s.category)).toEqual(['Alat', 'Okov', UNCATEGORIZED_LABEL])
    expect(sections.map((s) => ids(s.items))).toEqual([['b', 'c'], ['a', 'e'], ['d']])
  })

  it('skips items whose product is gone and returns no sections for an empty catalog', () => {
    const withMissing = [...items, { ...item('x', 9, 'x', '1', null), product: null }]
    expect(arrangeCatalogItems(withMissing, DEFAULT_CATALOG_DISPLAY, categoryOf)[0].items).toHaveLength(5)
    expect(arrangeCatalogItems([], DEFAULT_CATALOG_DISPLAY, categoryOf)).toEqual([])
  })
})

describe('paginateSections', () => {
  const sections = arrangeCatalogItems(items, { sortMode: 'MANUAL', groupByCategory: true }, categoryOf)

  it('keeps category headers for the items on each page', () => {
    expect(paginateSections(sections, 1, 3).map((s) => [s.category, ids(s.items)])).toEqual([
      ['Alat', ['b', 'c']],
      ['Okov', ['a']],
    ])
    expect(paginateSections(sections, 2, 3).map((s) => [s.category, ids(s.items)])).toEqual([
      ['Okov', ['e']],
      [UNCATEGORIZED_LABEL, ['d']],
    ])
  })

  it('returns everything for "all"', () => {
    expect(paginateSections(sections, 4, 'all').flatMap((s) => ids(s.items))).toHaveLength(5)
  })
})

describe('chunkSectionsIntoPages', () => {
  it('starts every category on a new PDF page', () => {
    const sections = arrangeCatalogItems(items, { sortMode: 'MANUAL', groupByCategory: true }, categoryOf)
    expect(chunkSectionsIntoPages(sections, 4).map((p) => [p.category, ids(p.items)])).toEqual([
      ['Alat', ['b', 'c']],
      ['Okov', ['a', 'e']],
      [UNCATEGORIZED_LABEL, ['d']],
    ])
  })

  it('splits a long category over several pages', () => {
    const [section] = arrangeCatalogItems(items, DEFAULT_CATALOG_DISPLAY, categoryOf)
    expect(chunkSectionsIntoPages([section], 2).map((p) => ids(p.items))).toEqual([['a', 'b'], ['c', 'd'], ['e']])
  })
})

describe('filterCatalogItems', () => {
  const fields = (i: Item) => ({ text: [i.product?.name, i.id], category: i.category })

  it('matches without diacritics or case', () => {
    expect(normalizeSearchText('ĆEBE Đak')).toBe('cebe djak')
    expect(ids(filterCatalogItems(items, { query: 'cekic', category: null }, fields))).toEqual(['b'])
    expect(ids(filterCatalogItems(items, { query: 'ŠRAF', category: null }, fields))).toEqual(['a'])
  })

  it('filters by category, including the uncategorized bucket', () => {
    expect(ids(filterCatalogItems(items, { query: '', category: 'Okov' }, fields))).toEqual(['a', 'e'])
    expect(ids(filterCatalogItems(items, { query: '', category: UNCATEGORIZED_LABEL }, fields))).toEqual(['d'])
  })
})

describe('listCatalogCategories', () => {
  it('lists distinct sorted categories with "Ostalo" last', () => {
    expect(listCatalogCategories(items, categoryOf)).toEqual(['Alat', 'Okov', UNCATEGORIZED_LABEL])
  })
})

describe('orderBySelection and moveId', () => {
  it('orders records by the selected ids and skips unknown ids', () => {
    const records = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(orderBySelection(records, ['c', 'x', 'a']).map((r) => r.id)).toEqual(['c', 'a'])
  })

  it('moves an id up or down and ignores moves past the ends', () => {
    expect(moveId(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b'])
    expect(moveId(['a', 'b', 'c'], 'a', 1)).toEqual(['b', 'a', 'c'])
    expect(moveId(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c'])
    expect(moveId(['a', 'b', 'c'], 'z', 1)).toEqual(['a', 'b', 'c'])
  })
})
