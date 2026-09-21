import { describe, expect, it } from 'vitest'
import {
  formatLocalYmd,
  isSameLocalDay,
  parseLocalYmd,
  startOfLocalDay,
  startOfLocalTomorrow,
  startOfLocalMonth,
  startOfLocalYear,
  addLocalMonths,
  formatLocalYm,
} from './local-date'

describe('local-date', () => {
  it('parses and formats a calendar day without UTC shift', () => {
    const parsed = parseLocalYmd('2026-09-21')
    expect(parsed).not.toBeNull()
    expect(parsed?.getFullYear()).toBe(2026)
    expect(parsed?.getMonth()).toBe(8)
    expect(parsed?.getDate()).toBe(21)
    expect(formatLocalYmd(parsed!)).toBe('2026-09-21')
  })

  it('rejects invalid dates and falls back to all dates', () => {
    expect(parseLocalYmd('2026-13-40')).toBeNull()
    expect(parseLocalYmd('today')).toBeNull()
    expect(parseLocalYmd(null)).toBeNull()
  })

  it('uses an inclusive local start of today and exclusive tomorrow', () => {
    const today = startOfLocalDay(new Date(2026, 8, 21, 18, 30))
    const tomorrow = startOfLocalTomorrow(new Date(2026, 8, 21, 18, 30))
    expect(today.getHours()).toBe(0)
    expect(tomorrow.getDate()).toBe(22)
    expect(isSameLocalDay(today, new Date(2026, 8, 21, 23, 59))).toBe(true)
    expect(isSameLocalDay(today, tomorrow)).toBe(false)
  })

  it('opens a local calendar month on the first day', () => {
    const start = startOfLocalMonth(new Date(2026, 8, 21, 18, 30))
    expect(formatLocalYm(start)).toBe('2026-09')
    expect(start.getDate()).toBe(1)
    expect(addLocalMonths(start, 1).getMonth()).toBe(9)
    expect(startOfLocalYear(start).getMonth()).toBe(0)
  })
})
