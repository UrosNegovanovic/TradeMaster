import { describe, expect, it } from 'vitest'
import { daysOverdue, formatDaysOverdue } from './overdue-invoices'

describe('daysOverdue', () => {
  const now = new Date('2026-10-10T08:00:00.000Z') // 10 Oct, Belgrade

  it('is 0 on the due day and before it', () => {
    expect(daysOverdue('2026-10-10T20:00:00.000Z', now)).toBe(0)
    expect(daysOverdue('2026-10-20T10:00:00.000Z', now)).toBe(0)
  })

  it('counts Belgrade calendar days, not 24h blocks', () => {
    // Due 9 Oct 23:30 UTC = 10 Oct 01:30 Belgrade -> same Belgrade day as now.
    expect(daysOverdue('2026-10-09T23:30:00.000Z', now)).toBe(0)
    expect(daysOverdue('2026-10-09T10:00:00.000Z', now)).toBe(1)
    expect(daysOverdue('2026-09-10T10:00:00.000Z', now)).toBe(30)
  })

  it('stays whole across the October DST change', () => {
    const afterDst = new Date('2026-10-28T10:00:00.000Z')
    expect(daysOverdue('2026-10-20T10:00:00.000Z', afterDst)).toBe(8)
  })

  it('treats invalid dates as not overdue', () => {
    expect(daysOverdue('nope', now)).toBe(0)
  })
})

describe('formatDaysOverdue', () => {
  it('uses the Serbian singular only for 1, 21, 31 ... (not 11)', () => {
    expect(formatDaysOverdue(1)).toBe('1 dan')
    expect(formatDaysOverdue(21)).toBe('21 dan')
    expect(formatDaysOverdue(11)).toBe('11 dana')
    expect(formatDaysOverdue(3)).toBe('3 dana')
    expect(formatDaysOverdue(30)).toBe('30 dana')
  })
})
