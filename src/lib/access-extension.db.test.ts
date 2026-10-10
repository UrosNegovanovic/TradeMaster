import '@/test/setup-test-database'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { formatLocalYmd, zonedDateTimeToUtc } from '@/lib/local-date'
import { applyAccessExtension, previewAccessExtension } from './access-extension'

const prefix = `access-extension-${randomUUID()}`
const ref = (name: string) => `${prefix}-${name}`.toUpperCase()
const at = (ymd: string) => new Date(`${ymd}T10:00:00.000Z`)
const expiry = (year: number, month: number, day: number) => zonedDateTimeToUtc(year, month, day)
let profileId = ''
let otherProfileId = ''

beforeEach(async () => {
  await prisma.profile.deleteMany({ where: { clerkUserId: { startsWith: prefix } } })
  const profile = await prisma.profile.create({
    data: { clerkUserId: `${prefix}-a`, companyName: 'Pretplata d.o.o.', accessExpiresAt: expiry(2027, 1, 31) },
  })
  const other = await prisma.profile.create({ data: { clerkUserId: `${prefix}-b`, companyName: 'Druga firma' } })
  profileId = profile.id
  otherProfileId = other.id
})

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { clerkUserId: { startsWith: prefix } } })
  await prisma.$disconnect()
})

const expiryYmd = async (id = profileId) => {
  const profile = await prisma.profile.findUniqueOrThrow({ where: { id } })
  return profile.accessExpiresAt ? formatLocalYmd(profile.accessExpiresAt) : null
}

describe('applyAccessExtension (test database)', () => {
  it('extends by a calendar month and records the payment it was based on', async () => {
    const result = await applyAccessExtension(prisma, {
      profileId,
      reference: ` ${ref('pr-01')} `,
      paidOn: '2027-01-27',
      now: at('2027-01-28'),
    })
    expect(result.plan).toMatchObject({ basis: 'continue', fromYmd: '2027-02-01', untilYmd: '2027-02-28', anchorDay: 31 })
    expect(await expiryYmd()).toBe('2027-02-28')

    const row = await prisma.accessExtension.findUniqueOrThrow({ where: { id: result.extensionId } })
    expect(row).toMatchObject({ profileId, reference: ref('pr-01'), basis: 'continue', anchorDay: 31 })
    expect(row.paidOn.toISOString().slice(0, 10)).toBe('2027-01-27')
    expect(row.periodFrom.toISOString().slice(0, 10)).toBe('2027-02-01')
    expect(row.periodUntil.toISOString().slice(0, 10)).toBe('2027-02-28')
    expect(row.previousExpiresAt?.toISOString()).toBe(expiry(2027, 1, 31).toISOString())
  })

  it('keeps the renewal day from the record: 31.01. → 28.02. → 31.03.', async () => {
    await applyAccessExtension(prisma, { profileId, reference: ref('pr-01'), paidOn: '2027-01-27', now: at('2027-01-28') })
    const next = await applyAccessExtension(prisma, { profileId, reference: ref('pr-02'), paidOn: '2027-02-24', now: at('2027-02-25') })
    expect(next.plan.untilYmd).toBe('2027-03-31')
    expect(await expiryYmd()).toBe('2027-03-31')
  })

  it('never extends twice for the same payment, also with a differently typed reference', async () => {
    await applyAccessExtension(prisma, { profileId, reference: ref('pr-01'), paidOn: '2027-01-27', now: at('2027-01-28') })
    const again = { profileId, reference: `  ${ref('pr-01').toLowerCase()}`, paidOn: '2027-01-27', now: at('2027-01-29') }
    await expect(applyAccessExtension(prisma, again)).rejects.toMatchObject({ code: 'duplicate' })
    await expect(previewAccessExtension(prisma, again)).rejects.toThrow(/već iskorišćena/)
    expect(await expiryYmd()).toBe('2027-02-28')
    expect(await prisma.accessExtension.count({ where: { profileId } })).toBe(1)
  })

  it('refuses the same payment for a second company', async () => {
    await applyAccessExtension(prisma, { profileId, reference: ref('pr-01'), paidOn: '2027-01-27', now: at('2027-01-28') })
    await expect(
      applyAccessExtension(prisma, { profileId: otherProfileId, reference: ref('pr-01'), paidOn: '2027-01-27', now: at('2027-01-28') })
    ).rejects.toThrow(/Pretplata d\.o\.o\./)
    expect(await expiryYmd(otherProfileId)).toBeNull()
  })

  it('two confirmations at the same moment extend only once', async () => {
    const input = { profileId, reference: ref('pr-race'), paidOn: '2027-01-27', now: at('2027-01-28') }
    const results = await Promise.allSettled([applyAccessExtension(prisma, input), applyAccessExtension(prisma, input)])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(await expiryYmd()).toBe('2027-02-28')
    expect(await prisma.accessExtension.count({ where: { profileId } })).toBe(1)
  })

  it('a payment after read-only starts on the reactivation day', async () => {
    const result = await applyAccessExtension(prisma, { profileId, reference: ref('late'), paidOn: '2027-02-08', now: at('2027-02-10') })
    expect(result.plan).toMatchObject({ basis: 'reactivate', fromYmd: '2027-02-10', untilYmd: '2027-03-09' })
    expect(await expiryYmd()).toBe('2027-03-09')
  })

  it('ignores a stored anchor once the owner changed the date by hand', async () => {
    await applyAccessExtension(prisma, { profileId, reference: ref('pr-01'), paidOn: '2027-01-27', now: at('2027-01-28') })
    await prisma.profile.update({ where: { id: profileId }, data: { accessExpiresAt: expiry(2027, 2, 15) } })
    const next = await applyAccessExtension(prisma, { profileId, reference: ref('pr-02'), paidOn: '2027-02-10', now: at('2027-02-11') })
    expect(next.plan.untilYmd).toBe('2027-03-15')
  })
})
