import { describe, expect, it } from 'vitest'
import {
  ACCESS_WARNING_DAYS,
  INITIAL_ACCESS_DAYS,
  accessStatus,
  daysInMonth,
  normalizePaymentReference,
  planAccessExtension,
  formatAccessDate,
  formatDaysLeft,
  initialAccessExpiry,
  isTrialPeriod,
} from './access-period'
import { startOfLocalDay } from './local-date'

const now = new Date('2026-10-10T10:00:00.000Z') // 10 Oct, Belgrade

describe('initialAccessExpiry', () => {
  it('gives a new company 60 Belgrade days, ending at midnight', () => {
    expect(INITIAL_ACCESS_DAYS).toBe(60)
    expect(initialAccessExpiry(now).toISOString()).toBe('2026-12-08T23:00:00.000Z') // 9 Dec 00:00 CET
  })
})

describe('accessStatus', () => {
  it('has no limit without an expiry date', () => {
    expect(accessStatus(null, now)).toEqual({
      state: 'unlimited',
      daysLeft: null,
      untilYmd: null,
      graceUntilYmd: null,
      graceDaysLeft: null,
    })
    expect(accessStatus(undefined, now).state).toBe('unlimited')
    expect(accessStatus('garbage', now).state).toBe('unlimited')
  })

  it('is active while more than the warning window remains', () => {
    const status = accessStatus('2026-12-08T23:00:00.000Z', now)
    expect(status).toMatchObject({ state: 'active', daysLeft: 60, untilYmd: '2026-12-09' })
  })

  it('starts warning inside the last 7 days, including the expiry day itself', () => {
    expect(ACCESS_WARNING_DAYS).toBe(7)
    expect(accessStatus('2026-10-16T22:00:00.000Z', now)).toMatchObject({ state: 'expiring', daysLeft: 7 })
    expect(accessStatus('2026-10-17T22:00:00.000Z', now)).toMatchObject({ state: 'active', daysLeft: 8 })
    expect(accessStatus('2026-10-09T22:00:00.000Z', now)).toMatchObject({ state: 'expiring', daysLeft: 0 })
  })

  it('gives 2 grace days with full access after the expiry day, then read-only', () => {
    const expiry = '2026-10-09T22:00:00.000Z' // expiry day: 10.10.2026 in Belgrade
    expect(accessStatus(expiry, new Date('2026-10-10T21:00:00.000Z')).state).toBe('expiring')
    expect(accessStatus(expiry, new Date('2026-10-10T22:30:00.000Z'))).toMatchObject({
      state: 'grace',
      daysLeft: -1,
      graceUntilYmd: '2026-10-12',
      graceDaysLeft: 1,
    })
    expect(accessStatus(expiry, new Date('2026-10-12T20:00:00.000Z'))).toMatchObject({ state: 'grace', graceDaysLeft: 0 })
    expect(accessStatus(expiry, new Date('2026-10-12T22:30:00.000Z'))).toMatchObject({
      state: 'expired',
      daysLeft: -3,
      graceUntilYmd: '2026-10-12',
    })
  })
})

describe('formatting', () => {
  it('uses Serbian wording and plural rules', () => {
    expect(formatDaysLeft(0)).toBe('danas')
    expect(formatDaysLeft(1)).toBe('sutra')
    expect(formatDaysLeft(5)).toBe('za 5 dana')
    expect(formatDaysLeft(11)).toBe('za 11 dana')
    expect(formatDaysLeft(21)).toBe('za 21 dan')
  })

  it('shows dd.mm.yyyy.', () => {
    expect(formatAccessDate('2026-12-09')).toBe('09.12.2026.')
  })
})

describe('trial vs paid period', () => {
  const created = new Date('2026-10-10T08:00:00.000Z')

  it('is the trial while the expiry is the first 60 days', () => {
    expect(isTrialPeriod(created, initialAccessExpiry(created))).toBe(true)
    const paid = planAccessExtension({ expiresAt: initialAccessExpiry(created), paidOn: '2026-10-10', now: created })
    expect(isTrialPeriod(created, paid.expiresAt)).toBe(false)
    expect(isTrialPeriod(created, null)).toBe(false)
  })
})

/** Belgrade calendar day as a `now` (10:00 UTC is always the same Belgrade day). */
const day = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 10))
}
/** Expiry as stored: Belgrade midnight of the day. */
const expiryDay = (ymd: string) => startOfLocalDay(day(ymd))
const plan = (expiry: string | null, paidOn: string, confirmedOn: string, anchorDay?: number) =>
  planAccessExtension({ expiresAt: expiry ? expiryDay(expiry) : null, paidOn, now: day(confirmedOn), anchorDay })

describe('daysInMonth', () => {
  it('knows month ends and leap years', () => {
    expect(daysInMonth(2027, 1)).toBe(31)
    expect(daysInMonth(2027, 2)).toBe(28)
    expect(daysInMonth(2028, 2)).toBe(29)
    expect(daysInMonth(2100, 2)).toBe(28)
    expect(daysInMonth(2000, 2)).toBe(29)
    expect(daysInMonth(2027, 4)).toBe(30)
  })
})

describe('planAccessExtension: one payment = one calendar month', () => {
  it('moves the expiry to the same day next month, inclusive (access through the whole day)', () => {
    const result = plan('2026-11-10', '2026-11-05', '2026-11-06')
    expect(result).toMatchObject({ basis: 'continue', fromYmd: '2026-11-11', untilYmd: '2026-12-10', anchorDay: 10 })
    // Stored as Belgrade midnight of the last day, like every other accessExpiresAt.
    expect(result.expiresAt.toISOString()).toBe('2026-12-09T23:00:00.000Z')
    // Still usable late in the evening of the last day.
    expect(accessStatus(result.expiresAt, new Date('2026-12-10T22:30:00.000Z')).state).toBe('expiring')
    expect(accessStatus(result.expiresAt, new Date('2026-12-10T23:30:00.000Z')).state).toBe('grace')
  })

  it('crosses the year end', () => {
    expect(plan('2026-12-15', '2026-12-10', '2026-12-11').untilYmd).toBe('2027-01-15')
  })

  it('keeps the renewal day across short months: 31.01. → 28.02. → 31.03. → 30.04. → 31.05.', () => {
    const feb = plan('2027-01-31', '2027-01-28', '2027-01-29')
    expect(feb).toMatchObject({ untilYmd: '2027-02-28', anchorDay: 31, fromYmd: '2027-02-01' })
    const mar = plan(feb.untilYmd, '2027-02-25', '2027-02-26', feb.anchorDay)
    expect(mar).toMatchObject({ untilYmd: '2027-03-31', anchorDay: 31, fromYmd: '2027-03-01' })
    const apr = plan(mar.untilYmd, '2027-03-25', '2027-03-26', mar.anchorDay)
    expect(apr.untilYmd).toBe('2027-04-30')
    expect(plan(apr.untilYmd, '2027-04-25', '2027-04-26', apr.anchorDay).untilYmd).toBe('2027-05-31')
  })

  it('uses 29 February in a leap year and goes back to the anchor after it', () => {
    const feb = plan('2028-01-30', '2028-01-25', '2028-01-26')
    expect(feb.untilYmd).toBe('2028-02-29')
    expect(plan(feb.untilYmd, '2028-02-20', '2028-02-21', feb.anchorDay).untilYmd).toBe('2028-03-30')
    expect(plan('2027-01-29', '2027-01-25', '2027-01-26').untilYmd).toBe('2027-02-28')
  })

  it('without a stored anchor uses the day of the current expiry', () => {
    expect(plan('2027-02-28', '2027-02-25', '2027-02-26').untilYmd).toBe('2027-03-28')
  })

  it('early payment continues the current period: no day is lost', () => {
    expect(plan('2026-12-10', '2026-11-19', '2026-11-20')).toMatchObject({ basis: 'continue', untilYmd: '2027-01-10' })
  })

  it('payment in the 2 grace days continues from the old expiry (grace days are not free)', () => {
    expect(plan('2026-11-10', '2026-11-12', '2026-11-12')).toMatchObject({
      basis: 'continue',
      fromYmd: '2026-11-11',
      untilYmd: '2026-12-10',
    })
  })

  it('judges on-time by the bank payment date, not by the confirmation day', () => {
    // Paid on the last grace day, confirmed after the weekend when the account was already read-only.
    expect(plan('2026-11-10', '2026-11-12', '2026-11-16')).toMatchObject({ basis: 'continue', untilYmd: '2026-12-10' })
  })

  it('payment after read-only starts the month on the reactivation day', () => {
    expect(plan('2026-11-10', '2026-11-20', '2026-11-23')).toMatchObject({
      basis: 'reactivate',
      fromYmd: '2026-11-23',
      untilYmd: '2026-12-22',
      anchorDay: 22,
    })
    // Reactivated on the 1st: the whole month.
    expect(plan('2027-02-10', '2027-02-27', '2027-03-01')).toMatchObject({ fromYmd: '2027-03-01', untilYmd: '2027-03-31', anchorDay: 31 })
    // Reactivated on 31.01.: 28.02. (there is no 30.02.), then back to 30.03.
    const jan = plan('2027-01-10', '2027-01-28', '2027-01-31')
    expect(jan).toMatchObject({ untilYmd: '2027-02-28', anchorDay: 30 })
    expect(plan(jan.untilYmd, '2027-02-20', '2027-02-21', jan.anchorDay).untilYmd).toBe('2027-03-30')
    // Reactivated on 29.02.2028.
    expect(plan('2028-01-10', '2028-02-20', '2028-02-29')).toMatchObject({ fromYmd: '2028-02-29', untilYmd: '2028-03-28' })
  })

  it('an account without a limit starts from today', () => {
    expect(plan(null, '2026-10-10', '2026-10-10')).toMatchObject({ basis: 'reactivate', fromYmd: '2026-10-10', untilYmd: '2026-11-09' })
  })

  it('never returns a date in the past when an on-time payment is confirmed very late', () => {
    expect(plan('2026-11-10', '2026-11-09', '2026-12-20')).toMatchObject({ basis: 'reactivate', fromYmd: '2026-12-20' })
  })

  it('refuses a future or malformed payment date', () => {
    expect(() => plan('2026-11-10', '2026-11-12', '2026-11-11')).toThrow(/budućnosti/)
    expect(() => plan('2026-11-10', '12.11.2026', '2026-11-12')).toThrow(/GGGG-MM-DD/)
    expect(() => plan('2026-11-10', '2026-02-30', '2026-11-12')).toThrow(/GGGG-MM-DD/)
  })

  it('handles the DST change (old expiry in summer time, new one in winter time)', () => {
    const result = plan('2026-10-25', '2026-10-20', '2026-10-21')
    expect(result.untilYmd).toBe('2026-11-25')
    expect(result.expiresAt.toISOString()).toBe('2026-11-24T23:00:00.000Z')
  })
})

describe('normalizePaymentReference', () => {
  it('treats spacing and case variants as the same payment', () => {
    expect(normalizePaymentReference('  pr-03/2026 ')).toBe('PR-03/2026')
    expect(normalizePaymentReference('Izvod 12  stavka 4')).toBe('IZVOD 12 STAVKA 4')
  })

  it('refuses an empty reference', () => {
    expect(() => normalizePaymentReference('  ')).toThrow(/broj predračuna/)
  })
})
