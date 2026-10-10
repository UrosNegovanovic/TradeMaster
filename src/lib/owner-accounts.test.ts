import { describe, expect, it } from 'vitest'
import { initialAccessExpiry } from '@/lib/access-period'
import { zonedDateTimeToUtc } from '@/lib/local-date'
import {
  countOwnerAccountFilters,
  daysLeftLabel,
  matchesOwnerAccountSearch,
  noticeStatusLabel,
  ownerAccountTags,
  parseOwnerAccountFilter,
  selectOwnerAccounts,
  shownDateOnly,
  shownDay,
  toOwnerAccount,
  type OwnerAccountSource,
} from './owner-accounts'

/** Wednesday 14 October 2026, noon in Belgrade. */
const now = zonedDateTimeToUtc(2026, 10, 14, 12, 0, 0)
const day = (year: number, month: number, date: number, hour = 10) => zonedDateTimeToUtc(year, month, date, hour, 0, 0)

function source(overrides: Partial<OwnerAccountSource> = {}): OwnerAccountSource {
  const createdAt = overrides.createdAt ?? day(2026, 10, 1)
  return {
    id: 'p1',
    companyName: 'Firma d.o.o.',
    pib: '100000009',
    signInEmail: 'vlasnik@firma.rs',
    createdAt,
    accessExpiresAt: initialAccessExpiry(createdAt),
    productCount: 0,
    invoiceCount: 0,
    lastActivityAt: null,
    paymentCount: 0,
    lastPayment: null,
    lastNotice: null,
    tag: null,
    ...overrides,
  }
}

const account = (overrides: Partial<OwnerAccountSource> = {}) => toOwnerAccount(source(overrides), now)
const paid = (id: string, expiresAt: Date | null) =>
  account({ id, createdAt: day(2026, 6, 1), accessExpiresAt: expiresAt, paymentCount: 1 })

describe('toOwnerAccount', () => {
  it('reads state, kind and urgency from the access date', () => {
    expect(account()).toMatchObject({ kind: 'trial', urgent: false, access: { state: 'active', daysLeft: 47 } })
    expect(paid('a', day(2026, 10, 20, 0))).toMatchObject({ kind: 'paid', urgent: true, access: { state: 'expiring', daysLeft: 6 } })
    expect(paid('a', day(2026, 10, 13, 0))).toMatchObject({ urgent: true, access: { state: 'grace', graceDaysLeft: 1 } })
    expect(paid('a', day(2026, 10, 1, 0))).toMatchObject({ urgent: true, access: { state: 'expired' } })
  })

  it('has no kind for an account without an access date', () => {
    expect(account({ accessExpiresAt: null })).toMatchObject({ kind: null, urgent: false, access: { state: 'unlimited' } })
  })

  it('calls a hand-set date manual, not paid', () => {
    expect(account({ createdAt: day(2026, 6, 1), accessExpiresAt: day(2026, 12, 31, 0) }).kind).toBe('manual')
  })
})

describe('filters', () => {
  const accounts = [
    account({ id: 'trial-active' }), // ends 30 Nov
    account({ id: 'trial-due', createdAt: day(2026, 8, 25) }), // ends 24 Oct: in 10 days
    account({ id: 'trial-grace', createdAt: day(2026, 8, 14) }), // ended 13 Oct
    account({ id: 'trial-expired', createdAt: day(2026, 8, 1) }), // ended 30 Sep
    paid('paid-active', day(2026, 11, 10, 0)),
    paid('paid-11-days', day(2026, 10, 25, 0)),
    paid('paid-expiring', day(2026, 10, 18, 0)),
    paid('paid-today', day(2026, 10, 14, 0)),
    paid('paid-grace', day(2026, 10, 12, 0)),
    paid('paid-expired', day(2026, 10, 11, 0)),
    paid('unlimited', null),
  ]
  const ids = (filter: Parameters<typeof selectOwnerAccounts>[1]) => selectOwnerAccounts(accounts, filter).map((item) => item.id)

  it('"due" is the billing:due window: 10 days ahead, the expiry day included, nothing past it', () => {
    expect(ids({ filter: 'due' })).toEqual(['paid-today', 'paid-expiring', 'trial-due'])
  })

  it('"grace" and "expired" follow the 2 grace days', () => {
    expect(ids({ filter: 'grace' })).toEqual(['paid-grace', 'trial-grace'])
    expect(ids({ filter: 'expired' })).toEqual(['trial-expired', 'paid-expired'])
  })

  it('"trial" is only companies still inside the free period', () => {
    expect(ids({ filter: 'trial' })).toEqual(['trial-due', 'trial-active'])
  })

  it('"all" lists everyone, soonest expiry first and accounts without a date last', () => {
    const all = ids({ filter: 'all' })
    expect(all).toHaveLength(accounts.length)
    expect(all[0]).toBe('trial-expired')
    expect(all.at(-1)).toBe('unlimited')
  })

  it('counts every filter for the buttons', () => {
    expect(countOwnerAccountFilters(accounts)).toEqual({ all: 11, due: 3, grace: 2, expired: 2, trial: 2 })
  })

  it('reads the filter from the URL and falls back to "all"', () => {
    expect(parseOwnerAccountFilter('grace')).toBe('grace')
    expect(parseOwnerAccountFilter(['expired', 'due'])).toBe('expired')
    expect(parseOwnerAccountFilter('drop table')).toBe('all')
    expect(parseOwnerAccountFilter(undefined)).toBe('all')
  })
})

describe('search', () => {
  const sunce = account({ id: 's', companyName: 'Sunčano Polje Veleprodaja d.o.o.', pib: '112233446', signInEmail: 'Marko@Sunce.rs' })

  it('finds by name without diacritics and in any case', () => {
    expect(matchesOwnerAccountSearch(sunce, 'suncano')).toBe(true)
    expect(matchesOwnerAccountSearch(sunce, '  POLJE ')).toBe(true)
    expect(matchesOwnerAccountSearch(account({ companyName: 'Suncano' }), 'sunčano')).toBe(true)
    expect(matchesOwnerAccountSearch(account({ companyName: 'Đorđević' }), 'dordevic')).toBe(true)
  })

  it('finds by part of the PIB and of the sign-in e-mail', () => {
    expect(matchesOwnerAccountSearch(sunce, '2233')).toBe(true)
    expect(matchesOwnerAccountSearch(sunce, 'marko@sunce')).toBe(true)
    expect(matchesOwnerAccountSearch(sunce, 'jovan')).toBe(false)
  })

  it('matches everything for an empty query and survives missing fields', () => {
    const bare = account({ companyName: null, pib: null, signInEmail: null })
    expect(matchesOwnerAccountSearch(bare, '')).toBe(true)
    expect(matchesOwnerAccountSearch(bare, null)).toBe(true)
    expect(matchesOwnerAccountSearch(bare, 'firma')).toBe(false)
  })

  it('combines with a filter', () => {
    const list = [sunce, account({ id: 'other' }), paid('gone', day(2026, 10, 1, 0))]
    expect(selectOwnerAccounts(list, { filter: 'trial', query: 'sun' }).map((item) => item.id)).toEqual(['s'])
    expect(selectOwnerAccounts(list, { filter: 'expired', query: 'sun' })).toEqual([])
  })
})

describe('labels', () => {
  it('describes the days left in every state', () => {
    expect(daysLeftLabel(account().access)).toBe('47 dana')
    expect(daysLeftLabel(paid('a', day(2026, 10, 15, 0)).access)).toBe('1 dan')
    expect(daysLeftLabel(paid('a', day(2026, 10, 14, 0)).access)).toBe('ističe danas')
    expect(daysLeftLabel(paid('a', day(2026, 10, 13, 0)).access)).toBe('rok još 1 dan')
    expect(daysLeftLabel(paid('a', day(2026, 10, 12, 0)).access)).toBe('rok ističe danas')
    expect(daysLeftLabel(paid('a', day(2026, 10, 11, 0)).access)).toBe('isteklo pre 3 dana')
    expect(daysLeftLabel(paid('a', null).access)).toBe('-')
  })

  it('says who a sent predračun went to', () => {
    expect(noticeStatusLabel({ status: 'sent', ownerOnly: false })).toBe('poslat')
    expect(noticeStatusLabel({ status: 'sent', ownerOnly: true })).toBe('poslat samo vlasniku')
    expect(noticeStatusLabel({ status: 'failed', ownerOnly: false })).toBe('slanje nije uspelo')
    expect(noticeStatusLabel({ status: 'pending', ownerOnly: false })).toBe('u toku')
  })

  it('shows a moment as its Belgrade day and a DATE column as stored', () => {
    // 23:30 UTC on 10 October is already 11 October in Belgrade.
    expect(shownDay(new Date('2026-10-10T23:30:00.000Z'))).toBe('11.10.2026.')
    expect(shownDateOnly(new Date('2026-10-10T00:00:00.000Z'))).toBe('10.10.2026.')
  })
})

describe('ownerAccountTags', () => {
  it('is empty without env', () => {
    expect(ownerAccountTags({}).size).toBe(0)
  })

  it('marks the issuer and the owner’s other profiles as owner, demo accounts as demo', () => {
    const tags = ownerAccountTags({
      BILLING_ISSUER_PROFILE_ID: 'issuer',
      BILLING_EXCLUDE_PROFILE_IDS: ' own-a ,own-b',
      PLATFORM_DEMO_PROFILE_IDS: 'demo, own-b',
    })
    expect(Object.fromEntries(tags)).toEqual({ issuer: 'owner', 'own-a': 'owner', 'own-b': 'owner', demo: 'demo' })
  })
})
