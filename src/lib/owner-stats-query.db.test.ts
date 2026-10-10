import '@/test/setup-test-database'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { zonedDateTimeToUtc } from '@/lib/local-date'
import { loadOwnerStats } from './owner-stats-query'

const prefix = `owner-stats-${randomUUID()}`
const now = zonedDateTimeToUtc(2026, 10, 14, 12, 0, 0) // Wednesday 14.10.2026, noon in Belgrade
const day = (year: number, month: number, date: number) => zonedDateTimeToUtc(year, month, date, 10, 0, 0)
let payingId = ''
let trialId = ''
let ownId = ''
/** Profiles left in the test database by other suites: kept out so the numbers are only this file's. */
let foreignIds: string[] = []

const invoice = (profileId: string, number: string, extra: object = {}) =>
  prisma.invoice.create({
    data: { profileId, invoiceNumber: `${prefix}-${number}`, dueDate: day(2026, 11, 1), clientName: 'Kupac', totalAmount: 100, ...extra },
  })

beforeEach(async () => {
  await prisma.profile.deleteMany({ where: { clerkUserId: { startsWith: prefix } } })
  foreignIds = (await prisma.profile.findMany({ select: { id: true } })).map((profile) => profile.id)

  // Paying company: details filled in, products, an issued invoice, a shared catalog, a stock movement, one payment.
  const paying = await prisma.profile.create({
    data: {
      clerkUserId: `${prefix}-paying`,
      companyName: 'Plaća d.o.o.',
      pib: '100000009',
      createdAt: day(2026, 6, 1),
      accessExpiresAt: zonedDateTimeToUtc(2026, 11, 10),
    },
  })
  payingId = paying.id
  const product = await prisma.product.create({ data: { profileId: payingId, name: 'Sok', sku: `${prefix}-1` } })
  await prisma.product.create({ data: { profileId: payingId, name: 'Voda', sku: `${prefix}-2` } })
  await invoice(payingId, '01', { status: 'UNPAID' })
  await invoice(payingId, 'PR-01', { status: 'UNPAID', documentType: 'PROFORMA' })
  await invoice(payingId, 'nacrt', { status: 'DRAFT' })
  await prisma.catalog.create({ data: { profileId: payingId, name: 'Ponuda', discount: 0, shareEnabled: true, shareToken: `${prefix}-token` } })
  await prisma.catalog.create({ data: { profileId: payingId, name: 'Interni', discount: 0 } })
  await prisma.stockMovement.create({
    data: { profileId: payingId, productId: product.id, type: 'IN', quantity: 5, reason: 'Prijem', createdAt: day(2026, 10, 13) },
  })
  await prisma.accessExtension.create({
    data: {
      profileId: payingId,
      reference: `${prefix}-PR-01`.toUpperCase(),
      paidOn: new Date('2026-10-08T00:00:00.000Z'),
      basis: 'continue',
      periodFrom: new Date('2026-10-11T00:00:00.000Z'),
      periodUntil: new Date('2026-11-10T00:00:00.000Z'),
      anchorDay: 10,
      newExpiresAt: zonedDateTimeToUtc(2026, 11, 10),
    },
  })

  // New company on its trial: only a draft invoice, a catalog that is not shared, no activity dates but its own.
  const trial = await prisma.profile.create({
    data: { clerkUserId: `${prefix}-trial`, createdAt: day(2026, 10, 12), accessExpiresAt: zonedDateTimeToUtc(2026, 12, 11) },
  })
  trialId = trial.id
  await invoice(trialId, 'nacrt', { status: 'DRAFT', createdAt: day(2026, 9, 1) })
  await prisma.catalog.create({ data: { profileId: trialId, name: 'Nacrt', discount: 0 } })

  // The owner's own company: has data, but is not a customer.
  const own = await prisma.profile.create({
    data: { clerkUserId: `${prefix}-own`, companyName: 'Izdavalac', pib: '100000010', createdAt: day(2026, 10, 13) },
  })
  ownId = own.id
  await prisma.product.create({ data: { profileId: ownId, name: 'Pretplata', sku: `${prefix}-own` } })
  await invoice(ownId, 'PR-99', { status: 'UNPAID', documentType: 'PROFORMA' })
})

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { clerkUserId: { startsWith: prefix } } })
  await prisma.$disconnect()
})

describe('loadOwnerStats (test database)', () => {
  it('counts per company from the real tables', async () => {
    const stats = await loadOwnerStats(prisma, { excludeProfileIds: [...foreignIds, ownId], now })

    expect(stats.totalCompanies).toBe(2)
    expect(stats.newByWeek.at(-1)).toEqual({ weekStartYmd: '2026-10-12', count: 1 })
    expect(stats.access.active).toEqual({ trial: 1, paid: 1, manual: 0 })
    // A draft is not an issued document; a catalog without a share link is not shared.
    expect(stats.activation).toEqual({ companyDetails: 1, product: 1, issuedDocument: 1, sharedCatalog: 1 })
    expect(stats.conversion).toEqual({ paid: 1, trialLapsed: 0, rate: 1 })
    expect(stats.revenue).toEqual({ payingCompanies: 1, monthlyPriceEur: 20, monthlyEur: 20 })
    expect(stats.churned).toBe(0)
  })

  it('takes the latest write to products, invoices or stock movements as activity', async () => {
    // The paying company's products were just written (real clock); the trial company's only row is from 1 September.
    const stats = await loadOwnerStats(prisma, { excludeProfileIds: [...foreignIds, ownId] })
    expect(stats.activeCompanies).toEqual({ last7Days: 1, last30Days: 1 })

    // The trial company's only row is a draft from 1 September: active within 30 days of 20 September, not 7.
    const earlier = await loadOwnerStats(prisma, {
      excludeProfileIds: [...foreignIds, ownId, payingId],
      now: zonedDateTimeToUtc(2026, 9, 20, 12, 0, 0),
    })
    expect(earlier.activeCompanies).toEqual({ last7Days: 0, last30Days: 1 })
  })

  it('leaves out the owner’s own and demo profiles, with all their rows', async () => {
    const withOwn = await loadOwnerStats(prisma, { excludeProfileIds: foreignIds, now })
    const withoutOwn = await loadOwnerStats(prisma, { excludeProfileIds: [...foreignIds, ownId], now })
    expect(withOwn.totalCompanies).toBe(3)
    expect(withOwn.activation.product).toBe(2)
    expect(withoutOwn.totalCompanies).toBe(2)
    expect(withoutOwn.activation.product).toBe(1)
    expect(withoutOwn.access.unlimited).toBe(0)
  })

  it('changes nothing in the database', async () => {
    const before = await prisma.profile.findMany({ where: { id: { in: [payingId, trialId, ownId] } }, orderBy: { id: 'asc' } })
    await loadOwnerStats(prisma, { excludeProfileIds: foreignIds, now })
    const after = await prisma.profile.findMany({ where: { id: { in: [payingId, trialId, ownId] } }, orderBy: { id: 'asc' } })
    expect(after).toEqual(before)
  })
})
