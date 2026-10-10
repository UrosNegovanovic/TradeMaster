import '@/test/setup-test-database'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { applyLink, attachProductionUser, registerLinks, revertLink } from './identity-link-db'

const prefix = `identity-link-${randomUUID()}`
// Clerk ids are unique per run, so parallel leftovers in the test database never collide.
const run = randomUUID().replace(/-/g, '')
const oldId = (name: string) => `user_old${name}${run}`
const newId = (name: string) => `user_new${name}${run}`
let companyId = ''
let otherId = ''

const clerkIdOf = async (id: string) => (await prisma.profile.findUniqueOrThrow({ where: { id } })).clerkUserId
const linkOf = (profileId: string) => prisma.clerkIdentityLink.findUnique({ where: { profileId } })
const register = (profileId = companyId, old = oldId('a')) =>
  registerLinks(prisma, [{ profileId, oldClerkUserId: old, accountClass: 'REAL' }], 'Vlasnik')

/** Everything a company owns, counted by profile id: must be identical before and after the swap. */
async function rowCounts(profileId: string) {
  const [products, invoices, invoiceItems, catalogs, clients, movements, extensions] = await Promise.all([
    prisma.product.count({ where: { profileId } }),
    prisma.invoice.count({ where: { profileId } }),
    prisma.invoiceItem.count({ where: { invoice: { profileId } } }),
    prisma.catalog.count({ where: { profileId } }),
    prisma.client.count({ where: { profileId } }),
    prisma.stockMovement.count({ where: { profileId } }),
    prisma.accessExtension.count({ where: { profileId } }),
  ])
  return { products, invoices, invoiceItems, catalogs, clients, movements, extensions }
}

beforeEach(async () => {
  await prisma.profile.deleteMany({ where: { companyName: { startsWith: prefix } } })

  const company = await prisma.profile.create({
    data: { clerkUserId: oldId('a'), companyName: `${prefix} Firma d.o.o.`, pib: '100000009', accessExpiresAt: new Date('2026-12-04T23:00:00.000Z') },
  })
  companyId = company.id
  const product = await prisma.product.create({ data: { profileId: companyId, name: 'Sok', sku: `${prefix}-1` } })
  await prisma.invoice.create({
    data: {
      profileId: companyId,
      invoiceNumber: `${prefix}-01`,
      dueDate: new Date('2026-11-01T00:00:00.000Z'),
      clientName: 'Kupac',
      totalAmount: 100,
      status: 'UNPAID',
      items: { create: { productName: 'Sok', quantity: 1, unitPrice: 100, unitCost: 60, discount: 0, vatRate: 0, total: 100 } },
    },
  })
  await prisma.catalog.create({ data: { profileId: companyId, name: 'Ponuda', discount: 0 } })
  await prisma.client.create({ data: { profileId: companyId, name: 'Kupac d.o.o.' } })
  await prisma.stockMovement.create({ data: { profileId: companyId, productId: product.id, type: 'IN', quantity: 5, reason: 'Prijem' } })
  await prisma.accessExtension.create({
    data: {
      profileId: companyId,
      reference: `${prefix}-PR-01`.toUpperCase(),
      paidOn: new Date('2026-10-01T00:00:00.000Z'),
      basis: 'continue',
      periodFrom: new Date('2026-11-05T00:00:00.000Z'),
      periodUntil: new Date('2026-12-04T00:00:00.000Z'),
      anchorDay: 4,
      newExpiresAt: new Date('2026-12-04T23:00:00.000Z'),
    },
  })

  const other = await prisma.profile.create({ data: { clerkUserId: oldId('b'), companyName: `${prefix} Druga firma` } })
  otherId = other.id
})

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { companyName: { startsWith: prefix } } })
  await prisma.$disconnect()
})

describe('identity link (test database)', () => {
  it('hands the company to its production identity and keeps every row on it', async () => {
    const before = await rowCounts(companyId)
    await register()
    await attachProductionUser(prisma, companyId, newId('a'))
    expect(await applyLink(prisma, companyId)).toBe('linked')

    expect(await clerkIdOf(companyId)).toBe(newId('a'))
    expect(await rowCounts(companyId)).toEqual(before)
    expect(before).toEqual({ products: 1, invoices: 1, invoiceItems: 1, catalogs: 1, clients: 1, movements: 1, extensions: 1 })
    // The production identity finds the same company; the Development identity finds nothing.
    expect((await prisma.profile.findUnique({ where: { clerkUserId: newId('a') } }))?.id).toBe(companyId)
    expect(await prisma.profile.findUnique({ where: { clerkUserId: oldId('a') } })).toBeNull()
    expect(await linkOf(companyId)).toMatchObject({ status: 'LINKED', oldClerkUserId: oldId('a'), newClerkUserId: newId('a'), approvedBy: 'Vlasnik' })
    // Nobody else moved.
    expect(await clerkIdOf(otherId)).toBe(oldId('b'))
  })

  it('changes nothing when the same row is applied twice', async () => {
    await register()
    await attachProductionUser(prisma, companyId, newId('a'))
    await applyLink(prisma, companyId)
    const first = await linkOf(companyId)

    expect(await applyLink(prisma, companyId)).toBe('already_linked')
    expect(await clerkIdOf(companyId)).toBe(newId('a'))
    expect((await linkOf(companyId))?.linkedAt).toEqual(first?.linkedAt)
    // Registering the same approval again adds no second row.
    expect(await register()).toEqual({ created: 0, existing: 1 })
    expect(await prisma.clerkIdentityLink.count({ where: { profileId: companyId } })).toBe(1)
  })

  it('refuses a profile that is not on the approved list', async () => {
    await expect(attachProductionUser(prisma, otherId, newId('b'))).rejects.toMatchObject({ code: 'not_registered' })
    await expect(applyLink(prisma, otherId)).rejects.toMatchObject({ code: 'not_registered' })
    await expect(revertLink(prisma, otherId)).rejects.toMatchObject({ code: 'not_registered' })
    expect(await clerkIdOf(otherId)).toBe(oldId('b'))
  })

  it('refuses to apply before the production user exists', async () => {
    await register()
    await expect(applyLink(prisma, companyId)).rejects.toMatchObject({ code: 'no_production_user' })
    expect(await clerkIdOf(companyId)).toBe(oldId('a'))
  })

  it('refuses when the profile’s Clerk id changed after the approval', async () => {
    await expect(register(companyId, 'user_someoneelse')).rejects.toMatchObject({ code: 'changed' })
    expect(await linkOf(companyId)).toBeNull()

    await register()
    await attachProductionUser(prisma, companyId, newId('a'))
    await prisma.profile.update({ where: { id: companyId }, data: { clerkUserId: `user_manual${run}` } })
    await expect(applyLink(prisma, companyId)).rejects.toMatchObject({ code: 'changed' })
    expect(await clerkIdOf(companyId)).toBe(`user_manual${run}`)
    expect((await linkOf(companyId))?.status).toBe('PENDING')
  })

  it('registers all rows or none', async () => {
    await expect(
      registerLinks(
        prisma,
        [
          { profileId: companyId, oldClerkUserId: oldId('a'), accountClass: 'REAL' },
          { profileId: otherId, oldClerkUserId: 'user_wrong', accountClass: 'TEST' },
        ],
        'Vlasnik'
      )
    ).rejects.toMatchObject({ code: 'changed' })
    expect(await linkOf(companyId)).toBeNull()
    expect(await linkOf(otherId)).toBeNull()
  })

  it('never gives one production user two companies', async () => {
    await registerLinks(
      prisma,
      [
        { profileId: companyId, oldClerkUserId: oldId('a'), accountClass: 'REAL' },
        { profileId: otherId, oldClerkUserId: oldId('b'), accountClass: 'REAL' },
      ],
      'Vlasnik'
    )
    await attachProductionUser(prisma, companyId, newId('a'))
    await expect(attachProductionUser(prisma, otherId, newId('a'))).rejects.toMatchObject({ code: 'production_user_taken' })

    // A production user who already opened a company of their own is not attached by the script.
    const selfSignedUp = await prisma.profile.create({ data: { clerkUserId: newId('b'), companyName: `${prefix} Nova prazna` } })
    await expect(attachProductionUser(prisma, otherId, newId('b'))).rejects.toMatchObject({ code: 'production_user_taken' })
    expect(await clerkIdOf(otherId)).toBe(oldId('b'))
    expect(await clerkIdOf(selfSignedUp.id)).toBe(newId('b'))
  })

  it('refuses the swap when the production user got a company after the id was attached', async () => {
    await register()
    await attachProductionUser(prisma, companyId, newId('a'))
    await prisma.profile.create({ data: { clerkUserId: newId('a'), companyName: `${prefix} Nastala u međuvremenu` } })

    await expect(applyLink(prisma, companyId)).rejects.toMatchObject({ code: 'production_user_taken' })
    expect(await clerkIdOf(companyId)).toBe(oldId('a'))
    expect((await linkOf(companyId))?.status).toBe('PENDING')
  })

  it('reverts to the Development id and can be applied again', async () => {
    const before = await rowCounts(companyId)
    await register()
    await attachProductionUser(prisma, companyId, newId('a'))
    await applyLink(prisma, companyId)

    await revertLink(prisma, companyId)
    expect(await clerkIdOf(companyId)).toBe(oldId('a'))
    expect(await rowCounts(companyId)).toEqual(before)
    expect(await linkOf(companyId)).toMatchObject({ status: 'REVERTED', newClerkUserId: newId('a') })
    await expect(revertLink(prisma, companyId)).rejects.toMatchObject({ code: 'not_linked' })

    expect(await applyLink(prisma, companyId)).toBe('linked')
    expect(await clerkIdOf(companyId)).toBe(newId('a'))
    expect(await linkOf(companyId)).toMatchObject({ status: 'LINKED', revertedAt: null })
  })

  it('needs the name of who approved the list', async () => {
    await expect(registerLinks(prisma, [{ profileId: companyId, oldClerkUserId: oldId('a'), accountClass: 'REAL' }], '  ')).rejects.toThrow(/odobrio/)
  })
})
