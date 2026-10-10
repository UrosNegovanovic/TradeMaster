import { describe, expect, it } from 'vitest'
import { initialAccessExpiry } from '@/lib/access-period'
import { zonedDateTimeToUtc } from '@/lib/local-date'
import { buildOwnerStats, nonCustomerProfileIds, type OwnerStatsCompany } from './owner-stats'

/** Wednesday 14 October 2026, noon in Belgrade. The week started on Monday 12 October. */
const now = zonedDateTimeToUtc(2026, 10, 14, 12, 0, 0)
const day = (year: number, month: number, date: number, hour = 10) => zonedDateTimeToUtc(year, month, date, hour, 0, 0)

function company(overrides: Partial<OwnerStatsCompany> = {}): OwnerStatsCompany {
  const createdAt = overrides.createdAt ?? day(2026, 10, 1)
  return {
    createdAt,
    accessExpiresAt: initialAccessExpiry(createdAt),
    hasCompanyDetails: false,
    productCount: 0,
    issuedDocumentCount: 0,
    sharedCatalogCount: 0,
    lastActivityAt: null,
    paymentCount: 0,
    ...overrides,
  }
}

const allAccessCells = (stats: ReturnType<typeof buildOwnerStats>) =>
  stats.access.unlimited +
  [stats.access.active, stats.access.expiring, stats.access.grace, stats.access.expired]
    .flatMap((kinds) => Object.values(kinds))
    .reduce((sum, count) => sum + count, 0)

describe('buildOwnerStats', () => {
  it('returns zeros and twelve empty weeks without companies', () => {
    const stats = buildOwnerStats([], now)
    expect(stats.totalCompanies).toBe(0)
    expect(stats.newByWeek).toHaveLength(12)
    expect(stats.newByWeek.every((week) => week.count === 0)).toBe(true)
    expect(stats.conversion).toEqual({ paid: 0, trialLapsed: 0, rate: null })
    expect(stats.revenue).toEqual({ payingCompanies: 0, monthlyPriceEur: 20, monthlyEur: 0 })
    expect(stats.churned).toBe(0)
  })

  describe('new companies per week', () => {
    it('groups by Belgrade week, Monday to Sunday, oldest first', () => {
      const stats = buildOwnerStats(
        [
          company({ createdAt: day(2026, 10, 12, 0) }), // Monday 00:00, this week
          company({ createdAt: day(2026, 10, 14) }), // today
          company({ createdAt: day(2026, 10, 11, 23) }), // Sunday 23:00, last week
          company({ createdAt: day(2026, 10, 5) }), // Monday, last week
        ],
        now
      )
      expect(stats.newByWeek.at(-1)).toEqual({ weekStartYmd: '2026-10-12', count: 2 })
      expect(stats.newByWeek.at(-2)).toEqual({ weekStartYmd: '2026-10-05', count: 2 })
      expect(stats.newByWeek[0].weekStartYmd).toBe('2026-07-27')
    })

    it('uses the Belgrade day, not the UTC day, at the week boundary', () => {
      // Sunday 11 October 23:30 UTC is already Monday 12 October 01:30 in Belgrade.
      const stats = buildOwnerStats([company({ createdAt: new Date('2026-10-11T23:30:00.000Z') })], now)
      expect(stats.newByWeek.at(-1)?.count).toBe(1)
      expect(stats.newByWeek.at(-2)?.count).toBe(0)
    })

    it('counts companies older than twelve weeks in the total only', () => {
      const stats = buildOwnerStats([company({ createdAt: day(2026, 7, 26), accessExpiresAt: null })], now)
      expect(stats.totalCompanies).toBe(1)
      expect(stats.newByWeek.reduce((sum, week) => sum + week.count, 0)).toBe(0)
    })
  })

  describe('access state', () => {
    it('puts every company in exactly one cell', () => {
      const stats = buildOwnerStats(
        [
          company({ accessExpiresAt: null }), // unlimited
          company({ createdAt: day(2026, 10, 1) }), // trial, active (ends 30 Nov)
          company({ createdAt: day(2026, 8, 20) }), // trial, ends 19 Oct: expiring
          company({ createdAt: day(2026, 8, 14) }), // trial, ended 13 Oct: grace
          company({ createdAt: day(2026, 8, 1) }), // trial, ended 30 Sep: read-only
          company({ createdAt: day(2026, 6, 1), accessExpiresAt: day(2026, 11, 10, 0), paymentCount: 2 }), // paid, active
          company({ createdAt: day(2026, 6, 1), accessExpiresAt: day(2026, 10, 18, 0), paymentCount: 1 }), // paid, expiring
          company({ createdAt: day(2026, 6, 1), accessExpiresAt: day(2026, 10, 13, 0), paymentCount: 1 }), // paid, grace
          company({ createdAt: day(2026, 6, 1), accessExpiresAt: day(2026, 9, 30, 0), paymentCount: 1 }), // paid, read-only
          company({ createdAt: day(2026, 6, 1), accessExpiresAt: day(2026, 12, 31, 0) }), // date set by hand
        ],
        now
      )
      expect(stats.access).toEqual({
        unlimited: 1,
        active: { trial: 1, paid: 1, manual: 1 },
        expiring: { trial: 1, paid: 1, manual: 0 },
        grace: { trial: 1, paid: 1, manual: 0 },
        expired: { trial: 1, paid: 1, manual: 0 },
      })
      expect(allAccessCells(stats)).toBe(stats.totalCompanies)
    })

    it('keeps the expiry day itself as full access and the third day after it as read-only', () => {
      const paid = (expiresAt: Date) => company({ createdAt: day(2026, 6, 1), accessExpiresAt: expiresAt, paymentCount: 1 })
      const stats = buildOwnerStats(
        [paid(day(2026, 10, 14, 0)), paid(day(2026, 10, 12, 0)), paid(day(2026, 10, 11, 0))],
        now
      )
      expect(stats.access.expiring.paid).toBe(1)
      expect(stats.access.grace.paid).toBe(1)
      expect(stats.access.expired.paid).toBe(1)
    })

    it('does not call a hand-set date a payment', () => {
      const stats = buildOwnerStats([company({ createdAt: day(2026, 6, 1), accessExpiresAt: day(2026, 12, 31, 0) })], now)
      expect(stats.access.active).toEqual({ trial: 0, paid: 0, manual: 1 })
      expect(stats.conversion.paid).toBe(0)
      expect(stats.revenue.payingCompanies).toBe(0)
    })
  })

  it('counts activation steps per company, not per row', () => {
    const stats = buildOwnerStats(
      [
        company({ hasCompanyDetails: true, productCount: 240, issuedDocumentCount: 12, sharedCatalogCount: 3 }),
        company({ hasCompanyDetails: true, productCount: 1 }),
        company(),
      ],
      now
    )
    expect(stats.activation).toEqual({ companyDetails: 2, product: 2, issuedDocument: 1, sharedCatalog: 1 })
  })

  it('counts companies active in the last 7 and 30 Belgrade days, today included', () => {
    const stats = buildOwnerStats(
      [
        company({ lastActivityAt: day(2026, 10, 14, 9) }), // today
        company({ lastActivityAt: day(2026, 10, 8, 0) }), // 6 days ago
        company({ lastActivityAt: day(2026, 10, 7, 23) }), // 7 days ago
        company({ lastActivityAt: day(2026, 9, 15, 0) }), // 29 days ago
        company({ lastActivityAt: day(2026, 9, 14, 23) }), // 30 days ago
        company({ lastActivityAt: null }),
      ],
      now
    )
    expect(stats.activeCompanies).toEqual({ last7Days: 2, last30Days: 4 })
  })

  describe('conversion, revenue and churn', () => {
    const companies = [
      company({ createdAt: day(2026, 6, 1), accessExpiresAt: day(2026, 11, 10, 0), paymentCount: 3 }), // paying
      company({ createdAt: day(2026, 6, 1), accessExpiresAt: day(2026, 10, 18, 0), paymentCount: 1 }), // paying, expiring
      company({ createdAt: day(2026, 6, 1), accessExpiresAt: day(2026, 10, 13, 0), paymentCount: 1 }), // grace: not paid for this period
      company({ createdAt: day(2026, 6, 1), accessExpiresAt: day(2026, 9, 30, 0), paymentCount: 1 }), // churned
      company({ createdAt: day(2026, 8, 1) }), // trial ended, never paid
      company({ createdAt: day(2026, 10, 1) }), // still on trial
    ]

    it('measures conversion only over trials that are decided', () => {
      const stats = buildOwnerStats(companies, now)
      expect(stats.conversion).toEqual({ paid: 4, trialLapsed: 1, rate: 0.8 })
    })

    it('counts monthly revenue only for companies whose paid period covers today', () => {
      const stats = buildOwnerStats(companies, now)
      expect(stats.revenue).toEqual({ payingCompanies: 2, monthlyPriceEur: 20, monthlyEur: 40 })
    })

    it('counts as churned only a company that paid before and is now read-only', () => {
      expect(buildOwnerStats(companies, now).churned).toBe(1)
    })
  })

  it('carries nothing that identifies a company', () => {
    const json = JSON.stringify(buildOwnerStats([company({ hasCompanyDetails: true, productCount: 5 })], now))
    expect(json).not.toMatch(/companyName|pib|clerkUserId|profileId|email/i)
  })
})

describe('nonCustomerProfileIds', () => {
  it('is empty without env', () => {
    expect(nonCustomerProfileIds({})).toEqual([])
  })

  it('joins the issuer, the owner’s other profiles and demo accounts, without duplicates', () => {
    expect(
      nonCustomerProfileIds({
        BILLING_ISSUER_PROFILE_ID: ' issuer ',
        BILLING_EXCLUDE_PROFILE_IDS: 'own-a, own-b,',
        PLATFORM_DEMO_PROFILE_IDS: 'demo, own-a',
      })
    ).toEqual(['issuer', 'own-a', 'own-b', 'demo'])
  })
})
