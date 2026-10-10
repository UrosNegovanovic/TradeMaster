import '@/test/setup-test-database'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { zonedDateTimeToUtc } from '@/lib/local-date'
import { loadOwnerAccountDetail, loadOwnerAccounts } from './owner-accounts-query'

const prefix = `owner-accounts-${randomUUID()}`
const now = zonedDateTimeToUtc(2026, 10, 14, 12, 0, 0) // Wednesday 14.10.2026, noon in Belgrade
const day = (year: number, month: number, date: number) => zonedDateTimeToUtc(year, month, date, 10, 0, 0)
const dateOnly = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`)
const clerkId = (name: string) => `${prefix}-${name}`
let payingId = ''
let trialId = ''
let otherId = ''

const emails = async (ids: string[]) => new Map(ids.filter((id) => id === clerkId('paying')).map((id) => [id, 'prijava@placa.rs']))
const mine = async () =>
  (await loadOwnerAccounts(prisma, { lookupEmails: emails, tags: new Map([[otherId, 'demo']]), now })).accounts.filter((account) =>
    [payingId, trialId, otherId].includes(account.id)
  )

const invoice = (profileId: string, number: string, extra: object = {}) =>
  prisma.invoice.create({
    data: { profileId, invoiceNumber: `${prefix}-${number}`, dueDate: day(2026, 11, 1), clientName: 'Kupac', totalAmount: 100, ...extra },
  })

beforeEach(async () => {
  await prisma.profile.deleteMany({ where: { clerkUserId: { startsWith: prefix } } })

  const paying = await prisma.profile.create({
    data: {
      clerkUserId: clerkId('paying'),
      companyName: 'Plaća d.o.o.',
      pib: '100000009',
      contactEmail: 'racuni@placa.rs',
      createdAt: day(2026, 6, 1),
      accessExpiresAt: zonedDateTimeToUtc(2026, 10, 18),
    },
  })
  payingId = paying.id
  const product = await prisma.product.create({ data: { profileId: payingId, name: 'Sok', sku: `${prefix}-1` } })
  await prisma.product.create({ data: { profileId: payingId, name: 'Voda', sku: `${prefix}-2` } })
  await invoice(payingId, '01', { status: 'PAID' })
  await invoice(payingId, '02', { status: 'UNPAID' })
  await invoice(payingId, 'nacrt', { status: 'DRAFT' })
  await invoice(payingId, 'PR-01', { status: 'UNPAID', documentType: 'PROFORMA' })
  await prisma.stockMovement.create({ data: { profileId: payingId, productId: product.id, type: 'IN', quantity: 5, reason: 'Prijem' } })
  for (const [index, month] of [8, 9].entries()) {
    await prisma.accessExtension.create({
      data: {
        profileId: payingId,
        reference: `${prefix}-PR-0${index + 1}`.toUpperCase(),
        paidOn: dateOnly(`2026-0${month}-15`),
        basis: 'continue',
        periodFrom: dateOnly(`2026-0${month}-19`),
        periodUntil: dateOnly(`2026-${String(month + 1).padStart(2, '0')}-18`),
        anchorDay: 18,
        newExpiresAt: zonedDateTimeToUtc(2026, month + 1, 18),
        createdAt: day(2026, month, 16),
      },
    })
  }
  await prisma.billingNotice.create({
    data: {
      profileId: payingId,
      periodFrom: dateOnly('2026-10-19'),
      periodUntil: dateOnly('2026-11-18'),
      status: 'sent',
      invoiceNumber: 'PR-07/2026',
      recipient: 'racuni@placa.rs',
      sentAt: day(2026, 10, 11),
      attempts: 1,
      createdAt: day(2026, 10, 11),
    },
  })
  // A later test predračun for the same month: never "the last predračun" in the list.
  await prisma.billingNotice.create({
    data: {
      profileId: payingId,
      periodFrom: dateOnly('2026-10-19'),
      periodUntil: dateOnly('2026-11-18'),
      status: 'sent',
      invoiceNumber: 'PR-08/2026',
      recipient: 'vlasnik@example.com',
      isTest: true,
      sentAt: day(2026, 10, 12),
      createdAt: day(2026, 10, 12),
    },
  })

  const trial = await prisma.profile.create({
    data: { clerkUserId: clerkId('trial'), createdAt: day(2026, 10, 12), accessExpiresAt: zonedDateTimeToUtc(2026, 12, 11) },
  })
  trialId = trial.id

  const other = await prisma.profile.create({ data: { clerkUserId: clerkId('other'), companyName: 'Demo', createdAt: day(2026, 9, 1) } })
  otherId = other.id
})

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { clerkUserId: { startsWith: prefix } } })
  await prisma.$disconnect()
})

describe('loadOwnerAccounts (test database)', () => {
  it('returns one row per company with counts, the last payment and the last real predračun', async () => {
    const paying = (await mine()).find((account) => account.id === payingId)

    expect(paying).toMatchObject({
      companyName: 'Plaća d.o.o.',
      pib: '100000009',
      signInEmail: 'prijava@placa.rs',
      productCount: 2,
      invoiceCount: 2, // issued invoices only: no draft, no predračun
      paymentCount: 2,
      kind: 'paid',
      urgent: true,
      tag: null,
      access: { state: 'expiring', daysLeft: 4 },
    })
    expect(paying?.lastPayment?.reference).toBe(`${prefix}-PR-02`.toUpperCase())
    expect(paying?.lastPayment?.paidOn.toISOString().slice(0, 10)).toBe('2026-09-15')
    expect(paying?.lastNotice).toMatchObject({ invoiceNumber: 'PR-07/2026', status: 'sent', ownerOnly: false })
    expect(paying?.lastActivityAt).toBeInstanceOf(Date)
  })

  it('lists a new company with zeros and nulls, and tags a non-customer', async () => {
    const accounts = await mine()
    expect(accounts.find((account) => account.id === trialId)).toMatchObject({
      companyName: null,
      signInEmail: null,
      productCount: 0,
      invoiceCount: 0,
      paymentCount: 0,
      lastPayment: null,
      lastNotice: null,
      lastActivityAt: null,
      kind: 'trial',
      urgent: false,
    })
    expect(accounts.find((account) => account.id === otherId)).toMatchObject({ tag: 'demo', kind: null, access: { state: 'unlimited' } })
  })

  it('still lists everyone when Clerk cannot be read', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await loadOwnerAccounts(prisma, {
      lookupEmails: async () => {
        throw new Error('Clerk answered 503')
      },
      now,
    })
    errorLog.mockRestore()
    expect(result.emailsAvailable).toBe(false)
    expect(result.accounts.find((account) => account.id === payingId)).toMatchObject({ signInEmail: null, productCount: 2 })
  })
})

describe('loadOwnerAccountDetail (test database)', () => {
  it('returns the payment and predračun history, newest first, with test predračuni marked', async () => {
    const detail = await loadOwnerAccountDetail(prisma, payingId, { lookupEmails: emails, now })

    expect(detail?.account).toMatchObject({ id: payingId, signInEmail: 'prijava@placa.rs', productCount: 2, invoiceCount: 2 })
    expect(detail?.contactEmail).toBe('racuni@placa.rs')
    expect(detail?.extensions.map((row) => row.reference)).toEqual([`${prefix}-PR-02`, `${prefix}-PR-01`].map((ref) => ref.toUpperCase()))
    expect(detail?.notices.map((row) => [row.invoiceNumber, row.isTest])).toEqual([
      ['PR-08/2026', true],
      ['PR-07/2026', false],
    ])
  })

  it('never returns another company’s history', async () => {
    const detail = await loadOwnerAccountDetail(prisma, trialId, { lookupEmails: emails, now })
    expect(detail?.extensions).toEqual([])
    expect(detail?.notices).toEqual([])
    expect(detail?.account.lastActivityAt).toBeNull()
  })

  it('is null for an unknown id', async () => {
    expect(await loadOwnerAccountDetail(prisma, 'no-such-profile', { lookupEmails: emails, now })).toBeNull()
  })

  it('selects nothing but account metadata', async () => {
    const detail = await loadOwnerAccountDetail(prisma, payingId, { lookupEmails: emails, now })
    const json = JSON.stringify(detail)
    expect(json).not.toMatch(/Sok|Voda|Kupac|costPrice|totalAmount|clerkUserId/)
  })
})
