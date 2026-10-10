import { describe, expect, it } from 'vitest'
import {
  ACCESS_WARNING_DAYS,
  INITIAL_ACCESS_DAYS,
  accessStatus,
  extendAccessAfterPayment,
  formatAccessDate,
  formatDaysLeft,
  initialAccessExpiry,
  isTrialPeriod,
} from './access-period'

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

  it('starts warning inside the last 14 days, including the expiry day itself', () => {
    expect(ACCESS_WARNING_DAYS).toBe(14)
    expect(accessStatus('2026-10-23T22:00:00.000Z', now)).toMatchObject({ state: 'expiring', daysLeft: 14 })
    expect(accessStatus('2026-10-24T22:00:00.000Z', now)).toMatchObject({ state: 'active', daysLeft: 15 })
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
    expect(isTrialPeriod(created, extendAccessAfterPayment(initialAccessExpiry(created), created))).toBe(false)
    expect(isTrialPeriod(created, null)).toBe(false)
  })
})

describe('extendAccessAfterPayment', () => {
  const expiry = new Date('2026-10-09T22:00:00.000Z') // expiry day 10.10.2026

  it('continues from the old expiry day when paid before or during grace (no lost or free days)', () => {
    expect(extendAccessAfterPayment(expiry, new Date('2026-10-05T10:00:00.000Z')).toISOString()).toBe('2026-11-08T23:00:00.000Z')
    expect(extendAccessAfterPayment(expiry, new Date('2026-10-12T10:00:00.000Z')).toISOString()).toBe('2026-11-08T23:00:00.000Z')
  })

  it('starts from today when paid after the account became read-only', () => {
    expect(extendAccessAfterPayment(expiry, new Date('2026-10-20T10:00:00.000Z')).toISOString()).toBe('2026-11-18T23:00:00.000Z')
  })
})
