import { describe, expect, it } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { calculateVatBreakdown, isVatRate } from './invoice-totals'
import { summarizeVat } from './invoice-vat'

const d = (value: string) => new Decimal(value)

describe('calculateVatBreakdown', () => {
  it('groups by rate, highest first, and adds PDV to the base', () => {
    const result = calculateVatBreakdown([
      { total: d('100.00'), vatRate: 20 },
      { total: d('50.00'), vatRate: 10 },
      { total: d('25.00'), vatRate: 20 },
      { total: d('30.00'), vatRate: 0 },
    ])

    expect(result.groups.map((group) => [group.rate, group.base.toString(), group.vat.toString()])).toEqual([
      [20, '125', '25'],
      [10, '50', '5'],
      [0, '30', '0'],
    ])
    expect(result.base.toString()).toBe('205')
    expect(result.vat.toString()).toBe('30')
    expect(result.total.toString()).toBe('235')
  })

  it('rounds PDV half-up to 2 decimals per rate group, not per line', () => {
    // 3 x 0.05 at 10% = 0.015 total (rounds to 0.02), per line it would be 3 x 0.005 -> 3 x 0.01 = 0.03
    const grouped = calculateVatBreakdown([
      { total: d('0.05'), vatRate: 10 },
      { total: d('0.05'), vatRate: 10 },
      { total: d('0.05'), vatRate: 10 },
    ])
    expect(grouped.vat.toString()).toBe('0.02')
    expect(grouped.total.toString()).toBe('0.17')

    expect(calculateVatBreakdown([{ total: d('99.99'), vatRate: 20 }]).vat.toString()).toBe('20')
    expect(calculateVatBreakdown([{ total: d('0.25'), vatRate: 10 }]).vat.toString()).toBe('0.03')
  })

  it('treats a missing or unknown rate as no PDV', () => {
    const result = calculateVatBreakdown([{ total: d('10.00'), vatRate: 18 }])
    expect(result.vat.toString()).toBe('0')
    expect(result.total.toString()).toBe('10')
  })

  it('accepts only 0, 10 and 20', () => {
    expect([0, 10, 20].every(isVatRate)).toBe(true)
    expect([5, 18, '20', null, undefined].some(isVatRate)).toBe(false)
  })
})

describe('summarizeVat (display)', () => {
  it('matches the server breakdown, including stored decimal strings from the API', () => {
    const lines = [
      { total: '99.99', vatRate: '20.00' },
      { total: '10.00', vatRate: '10.00' },
      { total: '0.05', vatRate: '10.00' },
    ]
    const display = summarizeVat(lines)
    const server = calculateVatBreakdown(lines.map((line) => ({ total: d(line.total), vatRate: Number(line.vatRate) })))

    expect(display.base).toBe(Number(server.base))
    expect(display.vat).toBe(Number(server.vat))
    expect(display.total).toBe(Number(server.total))
    expect(display.groups.map((group) => group.rate)).toEqual([20, 10])
  })

  it('leaves old invoices (no rate) without PDV', () => {
    const result = summarizeVat([{ total: '100.00' }, { total: '50.00', vatRate: null }])
    expect(result).toEqual({ base: 150, groups: [{ rate: 0, base: 150, vat: 0 }], vat: 0, total: 150 })
  })
})
