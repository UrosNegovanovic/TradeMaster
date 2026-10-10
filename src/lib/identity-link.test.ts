import { describe, expect, it } from 'vitest'
import {
  isTestAddress,
  nonCustomerProfileIds,
  parseApprovedList,
  planRegistration,
  productionEmailFor,
  type ApprovedRow,
} from './identity-link'

const sheetRow = (profileId: string, oldId: string, klasa: unknown, prenosi: unknown) => ({
  Rb: 1,
  'Naziv firme': 'Firma d.o.o.',
  'Profile ID': profileId,
  'Clerk user ID (stari)': oldId,
  KLASA: klasa,
  'PRENOSI SE': prenosi,
})

const row = (overrides: Partial<ApprovedRow> = {}): ApprovedRow => ({
  line: 2,
  profileId: 'p1',
  oldClerkUserId: 'user_old1',
  accountClass: 'REAL',
  transfer: true,
  ...overrides,
})

describe('parseApprovedList', () => {
  it('reads class and decision from the workbook words', () => {
    const rows = parseApprovedList([
      sheetRow('p1', 'user_a', 'stvarni', 'da'),
      sheetRow('p2', 'user_b', ' Vlasnički ', 'DA'),
      sheetRow('p3', 'user_c', 'demo', 'ne'),
      sheetRow('p4', 'user_d', 'testni', 'ne'),
    ])
    expect(rows.map((item) => [item.line, item.accountClass, item.transfer])).toEqual([
      [2, 'REAL', true],
      [3, 'OWNER', true],
      [4, 'DEMO', false],
      [5, 'TEST', false],
    ])
  })

  it('leaves an empty or unknown cell undecided instead of guessing', () => {
    const rows = parseApprovedList([
      sheetRow('p1', 'user_a', null, null),
      sheetRow('p2', 'user_b', 'kupac', 'možda'),
      sheetRow('p3', 'user_c', 'stvarni', ''),
    ])
    expect(rows.map((item) => [item.accountClass, item.transfer])).toEqual([
      [null, null],
      [null, null],
      ['REAL', null],
    ])
  })

  it('ignores lines without a profile id', () => {
    expect(parseApprovedList([sheetRow('', '', null, null), sheetRow('p1', 'user_a', 'testni', 'ne')])).toHaveLength(1)
  })
})

describe('planRegistration', () => {
  const profiles = [
    { id: 'p1', clerkUserId: 'user_old1' },
    { id: 'p2', clerkUserId: 'user_old2' },
    { id: 'p3', clerkUserId: 'user_old3' },
  ]

  it('registers only rows the owner approved to carry over', () => {
    const plan = planRegistration(
      [
        row(),
        row({ line: 3, profileId: 'p2', oldClerkUserId: 'user_old2', accountClass: 'TEST', transfer: false }),
        row({ line: 4, profileId: 'p3', oldClerkUserId: 'user_old3', accountClass: null, transfer: null }),
      ],
      profiles
    )
    expect(plan.items.map((item) => item.action)).toEqual(['register', 'not_transferred', 'undecided'])
    expect(plan.profilesNotOnList).toEqual([])
  })

  it('does nothing for a row with a class but no decision', () => {
    const plan = planRegistration([row({ transfer: null })], profiles)
    expect(plan.items[0]).toMatchObject({ action: 'undecided', reason: 'Nije odlučeno da li se prenosi.' })
  })

  it('refuses a profile that does not exist', () => {
    const plan = planRegistration([row({ profileId: 'missing' })], profiles)
    expect(plan.items[0]).toMatchObject({ action: 'refused', reason: 'Profil sa ovim id-jem ne postoji u bazi.' })
  })

  it('refuses a profile whose Clerk id changed since the inventory', () => {
    const plan = planRegistration([row({ oldClerkUserId: 'user_other' })], profiles)
    expect(plan.items[0].action).toBe('refused')
    expect(plan.items[0].reason).toMatch(/promenio posle popisa/)
  })

  it('refuses a profile or an old id that appears twice', () => {
    const twice = planRegistration([row(), row({ line: 3 })], profiles)
    expect(twice.items.map((item) => item.action)).toEqual(['refused', 'refused'])
    const sameOldId = planRegistration([row(), row({ line: 3, profileId: 'p2' })], profiles)
    expect(sameOldId.items.map((item) => item.reason)).toEqual(['Isti Clerk id je na spisku više puta.', 'Isti Clerk id je na spisku više puta.'])
  })

  it('refuses an old id that is not a Clerk user id', () => {
    const plan = planRegistration([row({ oldClerkUserId: 'seed-profile' })], [{ id: 'p1', clerkUserId: 'seed-profile' }])
    expect(plan.items[0]).toMatchObject({ action: 'refused', reason: 'Clerk id na spisku nije ispravan.' })
  })

  it('shows an already registered row and keeps it even after the profile was linked', () => {
    const linked = [{ id: 'p1', clerkUserId: 'user_new1' }]
    const plan = planRegistration([row()], linked, [
      { profileId: 'p1', oldClerkUserId: 'user_old1', newClerkUserId: 'user_new1', status: 'LINKED' },
    ])
    expect(plan.items[0]).toMatchObject({ action: 'registered', reason: 'stanje veze: LINKED' })
  })

  it('refuses a row whose link was registered with another old id', () => {
    const plan = planRegistration([row()], profiles, [
      { profileId: 'p1', oldClerkUserId: 'user_else', newClerkUserId: null, status: 'PENDING' },
    ])
    expect(plan.items[0].action).toBe('refused')
  })

  it('reports profiles opened after the inventory', () => {
    const plan = planRegistration([row()], profiles)
    expect(plan.profilesNotOnList).toEqual(['p2', 'p3'])
  })
})

describe('nonCustomerProfileIds', () => {
  it('lists the owner’s, demo and test profiles, never a real or an undecided one', () => {
    const ids = nonCustomerProfileIds([
      row({ profileId: 'real' }),
      row({ profileId: 'own', accountClass: 'OWNER' }),
      row({ profileId: 'demo', accountClass: 'DEMO' }),
      row({ profileId: 'test', accountClass: 'TEST', transfer: false }),
      row({ profileId: 'open', accountClass: null }),
    ])
    expect(ids).toEqual(['own', 'demo', 'test'])
  })
})

describe('productionEmailFor', () => {
  const base = { developmentEmail: 'Vlasnik@Firma.rs', developmentEmailVerified: true }

  it('uses the verified Development e-mail for a real customer', () => {
    expect(productionEmailFor({ accountClass: 'REAL', ...base })).toEqual({ ok: true, email: 'vlasnik@firma.rs' })
  })

  it('never lets a typed e-mail take over a real customer', () => {
    const result = productionEmailFor({ accountClass: 'REAL', ...base, override: 'neko@drugi.rs' })
    expect(result.ok).toBe(false)
  })

  it('refuses an unverified or missing Development e-mail', () => {
    expect(productionEmailFor({ accountClass: 'REAL', ...base, developmentEmailVerified: false }).ok).toBe(false)
    expect(productionEmailFor({ accountClass: 'REAL', developmentEmail: null, developmentEmailVerified: false }).ok).toBe(false)
  })

  it('asks for a real address when the Development one is a test address', () => {
    const demo = { accountClass: 'DEMO' as const, developmentEmail: 'demo+clerk_test@example.com', developmentEmailVerified: true }
    const without = productionEmailFor(demo)
    expect(without).toMatchObject({ ok: false })
    expect(productionEmailFor({ ...demo, override: ' Demo@TradeMaster.rs ' })).toEqual({ ok: true, email: 'demo@trademaster.rs' })
  })

  it('refuses an override that cannot receive mail', () => {
    for (const override of ['nije-mejl', 'x+clerk_test@firma.rs', 'x@example.com']) {
      expect(productionEmailFor({ accountClass: 'OWNER', ...base, override }).ok).toBe(false)
    }
  })
})

describe('isTestAddress', () => {
  it('recognizes Clerk test addresses and reserved domains', () => {
    expect(isTestAddress('e2e+clerk_test@example.com')).toBe(true)
    expect(isTestAddress('ime@example.org')).toBe(true)
    expect(isTestAddress('ime@firma.test')).toBe(true)
    expect(isTestAddress('ime@firma.rs')).toBe(false)
  })
})
