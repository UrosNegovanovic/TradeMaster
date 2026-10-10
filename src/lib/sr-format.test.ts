import { describe, expect, it } from 'vitest'
import { countSr, formatLongDateSr, formatPercent, pluralSr } from './sr-format'

describe('formatPercent', () => {
  it('uses a decimal comma and drops trailing zeros', () => {
    expect(formatPercent(15)).toBe('15%')
    expect(formatPercent('12.50')).toBe('12,5%')
    expect(formatPercent(33.333)).toBe('33,33%')
    expect(formatPercent(null)).toBe('0%')
    expect(formatPercent('abc')).toBe('0%')
  })
})

describe('pluralSr / countSr', () => {
  const fakture = (n: number) => countSr(n, 'otvorena faktura', 'otvorene fakture', 'otvorenih faktura')

  it('picks the Serbian form by the last digits', () => {
    expect(fakture(1)).toBe('1 otvorena faktura')
    expect(fakture(3)).toBe('3 otvorene fakture')
    expect(fakture(5)).toBe('5 otvorenih faktura')
    expect(fakture(0)).toBe('0 otvorenih faktura')
    expect(fakture(11)).toBe('11 otvorenih faktura')
    expect(fakture(12)).toBe('12 otvorenih faktura')
    expect(fakture(21)).toBe('21 otvorena faktura')
    expect(fakture(22)).toBe('22 otvorene fakture')
    expect(fakture(111)).toBe('111 otvorenih faktura')
  })

  it('works for other words', () => {
    expect(pluralSr(2, 'artikal', 'artikla', 'artikala')).toBe('artikla')
  })
})

describe('formatLongDateSr', () => {
  it('writes the month in Serbian Latin', () => {
    expect(formatLongDateSr(new Date(2026, 9, 10))).toBe('10. oktobar 2026.')
  })
})
