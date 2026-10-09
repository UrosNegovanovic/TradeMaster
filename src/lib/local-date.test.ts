import { describe, expect, it } from 'vitest'
import {
  addLocalDays,
  addLocalMonths,
  defaultDueDateYmd,
  localDaysBetween,
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

describe('addLocalDays', () => {
  it('lands on Belgrade midnight N calendar days later, across DST', () => {
    // 20 Oct 2026 (CEST, UTC+2) + 30 days = 19 Nov 2026 (CET, UTC+1) at 00:00 Belgrade
    expect(addLocalDays(new Date('2026-10-20T10:00:00.000Z'), 30).toISOString()).toBe('2026-11-18T23:00:00.000Z')
  })

  it('rolls over month and year ends', () => {
    expect(addLocalDays(new Date('2026-12-31T10:00:00.000Z'), 1).toISOString()).toBe('2026-12-31T23:00:00.000Z')
  })
})

describe('defaultDueDateYmd (ROADMAP A9.3)', () => {
  it('counts from the Belgrade day, also just after midnight', () => {
    // 00:30 on 10 Oct in Belgrade is still 9 Oct in UTC.
    expect(defaultDueDateYmd(30, new Date('2026-10-09T22:30:00.000Z'))).toBe('2026-11-09')
    expect(defaultDueDateYmd(30, new Date('2026-10-09T10:00:00.000Z'))).toBe('2026-11-08')
  })
})

describe('localDaysBetween', () => {
  it('gives 30 for an invoice made just after midnight with a 30-day term', () => {
    // created 00:30 Belgrade on 10 Oct, due date stored as UTC midnight of 9 Nov
    expect(localDaysBetween('2026-10-09T22:30:00.000Z', '2026-11-09T00:00:00.000Z')).toBe(30)
    expect(localDaysBetween('2026-10-09T10:00:00.000Z', '2026-11-08T00:00:00.000Z')).toBe(30)
  })

  it('counts calendar days across the DST change and never goes below zero', () => {
    expect(localDaysBetween('2026-10-20T10:00:00.000Z', '2026-11-19T00:00:00.000Z')).toBe(30)
    expect(localDaysBetween('2026-10-20T10:00:00.000Z', '2026-10-01T00:00:00.000Z')).toBe(0)
  })
})
