import { describe, expect, it } from 'vitest'
import {
  ACCESS_WARNING_DAYS,
  INITIAL_ACCESS_DAYS,
  accessStatus,
  formatAccessDate,
  formatDaysLeft,
  initialAccessExpiry,
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
    expect(accessStatus(null, now)).toEqual({ state: 'unlimited', daysLeft: null, untilYmd: null })
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

  it('is expired only after the expiry day has passed', () => {
    expect(accessStatus('2026-10-09T22:00:00.000Z', new Date('2026-10-10T21:00:00.000Z')).state).toBe('expiring')
    expect(accessStatus('2026-10-09T22:00:00.000Z', new Date('2026-10-10T22:30:00.000Z'))).toMatchObject({
      state: 'expired',
      daysLeft: -1,
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
