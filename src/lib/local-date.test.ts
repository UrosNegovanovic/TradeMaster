import { describe, expect, it } from 'vitest'
import {
  addLocalMonths,
  formatLocalYm,
  formatLocalYmd,
  isSameLocalDay,
  parseLocalYmd,
  startOfLocalDay,
  startOfLocalMonth,
  startOfLocalTomorrow,
  startOfLocalYear,
} from './local-date'

describe('local-date (Europe/Belgrade)', () => {
  it('parses a calendar day as Belgrade midnight, not UTC midnight', () => {
    const parsed = parseLocalYmd('2026-09-21')
    expect(parsed).not.toBeNull()
    expect(formatLocalYmd(parsed!)).toBe('2026-09-21')
    // September is CEST (UTC+2)
    expect(parsed!.toISOString()).toBe('2026-09-20T22:00:00.000Z')
  })

  it('rejects invalid dates and falls back to all dates', () => {
    expect(parseLocalYmd('2026-13-40')).toBeNull()
    expect(parseLocalYmd('today')).toBeNull()
    expect(parseLocalYmd(null)).toBeNull()
  })

  it('keeps a UTC evening after midnight as the next Serbian calendar day', () => {
    const utcLate = new Date('2026-09-21T22:30:00.000Z')
    expect(formatLocalYmd(utcLate)).toBe('2026-09-22')
    expect(startOfLocalDay(utcLate).toISOString()).toBe('2026-09-21T22:00:00.000Z')
    expect(startOfLocalTomorrow(utcLate).toISOString()).toBe('2026-09-22T22:00:00.000Z')
  })

  it('keeps a UTC evening before Belgrade midnight on the same Serbian day', () => {
    const utcEvening = new Date('2026-09-21T21:30:00.000Z')
    expect(formatLocalYmd(utcEvening)).toBe('2026-09-21')
    expect(isSameLocalDay(utcEvening, new Date('2026-09-21T10:00:00.000Z'))).toBe(true)
    expect(isSameLocalDay(utcEvening, new Date('2026-09-21T22:30:00.000Z'))).toBe(false)
  })

  it('uses CET offset in winter', () => {
    const winter = parseLocalYmd('2026-12-21')
    expect(winter?.toISOString()).toBe('2026-12-20T23:00:00.000Z')
    expect(formatLocalYmd(new Date('2026-12-21T22:30:00.000Z'))).toBe('2026-12-21')
  })

  it('opens a Belgrade calendar month on the first day', () => {
    const start = startOfLocalMonth(new Date('2026-09-21T18:30:00.000Z'))
    expect(formatLocalYm(start)).toBe('2026-09')
    expect(start.toISOString()).toBe('2026-08-31T22:00:00.000Z')
    expect(formatLocalYm(addLocalMonths(start, 1))).toBe('2026-10')
    expect(formatLocalYm(startOfLocalYear(start))).toBe('2026-01')
  })
})
