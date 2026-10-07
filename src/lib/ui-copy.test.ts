import { describe, expect, it } from 'vitest'
import { sr } from './ui-copy'

describe('finance profit copy', () => {
  it('explains profit as osnovica minus cost of goods sold, without other company costs', () => {
    expect(sr.finance.profitNote).toMatch(/bez PDV-a/)
    expect(sr.finance.profitNote).toMatch(/nabavna vrednost prodate robe/)
    expect(sr.finance.profitNote).toMatch(/Ne uključuje ostale troškove firme/)
    for (const text of [sr.finance.profitMonth, sr.finance.profitYear]) {
      expect(text).toMatch(/bez PDV-a/)
      expect(text).toMatch(/nabavna vrednost prodate robe/)
    }
  })
})

describe('page intro copy', () => {
  it('tells Asortiman (what you sell, at what price) apart from Magacin (how much you have)', () => {
    expect(sr.pages.inventory).toMatch(/^Šta prodajete i po kojoj ceni\./)
    expect(sr.pages.warehouse).toMatch(/^Koliko robe imate/)
    expect(sr.pages.warehouse).toMatch(/ulaz, izlaz/)
  })
})
