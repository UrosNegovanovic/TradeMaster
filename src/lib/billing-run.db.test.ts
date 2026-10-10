import '@/test/setup-test-database'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { zonedDateTimeToUtc } from '@/lib/local-date'
import type { Mailer } from './billing-email'
import { runBilling, type BillingRunOptions } from './billing-run'
import { subscriptionDocumentsFor, subscriptionInvoiceIds } from './subscription-documents'

const prefix = `billing-run-${randomUUID()}`
const now = new Date('2026-11-03T06:00:00.000Z') // 03.11.2026, 07:00 Belgrade
const rate = { middle: 117.3657, date: '2026-11-03', listNumber: 212 }
let issuerId = ''
let customerId = ''
let mailer: ReturnType<typeof vi.fn> & Mailer

const options = (extra: Partial<BillingRunOptions> = {}): BillingRunOptions => ({
  db: prisma,
  issuerProfileId: issuerId,
  delivery: { kind: 'customer' },
  getRate: async () => rate,
  mailer,
  lookupEmail: async () => 'signup@kupac.rs',
  linkFor: (path) => `https://app.test${path}`,
  now,
  ...extra,
})

beforeEach(async () => {
  await prisma.profile.deleteMany({ where: { clerkUserId: { startsWith: prefix } } })
  mailer = vi.fn(async () => ({ id: `msg-${randomUUID()}` })) as typeof mailer
  const issuer = await prisma.profile.create({
    data: {
      clerkUserId: `${prefix}-issuer`,
      companyName: 'Izdavalac d.o.o.',
      pib: '100000009',
      giroAccount: '160-0000000000000-00',
      inVatSystem: false, // paušalac
    },
  })
  const customer = await prisma.profile.create({
    data: {
      clerkUserId: `${prefix}-customer`,
      companyName: 'Kupac d.o.o.',
      pib: '100000010',
      address: 'Ulica 1, Beograd',
      inVatSystem: true, // the customer's OWN PDV setting must not matter
      accessExpiresAt: zonedDateTimeToUtc(2026, 11, 10),
    },
  })
  // Not due yet (expires in 3 weeks): left alone.
  await prisma.profile.create({ data: { clerkUserId: `${prefix}-later`, companyName: 'Kasnije', accessExpiresAt: zonedDateTimeToUtc(2026, 11, 25) } })
  issuerId = issuer.id
  customerId = customer.id
})

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { clerkUserId: { startsWith: prefix } } })
  await prisma.$disconnect()
})

const onlyOurs = (items: Awaited<ReturnType<typeof runBilling>>) => items.filter((item) => item.profileId === customerId)
const issuerInvoices = () => prisma.invoice.findMany({ where: { profileId: issuerId }, include: { items: true, billingNotice: true } })

describe('runBilling (test database)', () => {
  it('dry run shows the predračun and writes nothing', async () => {
    const items = onlyOurs(await runBilling(options({ delivery: { kind: 'dry' }, mailer: undefined })))
    expect(items).toEqual([expect.objectContaining({ outcome: 'would_send', recipient: 'signup@kupac.rs', periodFromYmd: '2026-11-11', periodUntilYmd: '2026-12-10' })])
    expect(await prisma.billingNotice.count({ where: { profileId: customerId } })).toBe(0)
    expect(await prisma.invoice.count({ where: { profileId: issuerId } })).toBe(0)
  })

  it('issues the predračun in the issuer account without PDV (issuer is paušalac) and e-mails it once', async () => {
    const items = onlyOurs(await runBilling(options()))
    expect(items).toEqual([expect.objectContaining({ outcome: 'sent', invoiceNumber: 'PR-01/2026' })])

    const [invoice] = await issuerInvoices()
    expect(invoice).toMatchObject({ documentType: 'PROFORMA', status: 'UNPAID', clientName: 'Kupac d.o.o.', clientPib: '100000010', shareEnabled: true, vatEnabled: false })
    expect(invoice.dueDate.toISOString().slice(0, 10)).toBe('2026-11-10')
    expect(invoice.items).toHaveLength(1)
    expect(invoice.items[0]).toMatchObject({ productName: 'TradeMaster pretplata, 1 mesec (od 11.11.2026. do 10.12.2026.)', quantity: 1 })
    expect(Number(invoice.items[0].vatRate)).toBe(0)
    expect(invoice.items[0].unitPrice.toString()).toBe('2347.31')
    expect(invoice.vatAmount.toString()).toBe('0')
    expect(invoice.totalAmount.toString()).toBe('2347.31')
    expect(invoice.note).toContain('Obveznik nije u sistemu PDV-a.')
    expect(invoice.note).toContain('117,3657')
    expect(invoice.note).toContain('kursna lista br. 212')
    expect(invoice.note).toContain('Nije dokument iz vašeg poslovanja.')
    // Source mark: the issuer can filter subscription documents from invoices to his own clients.
    expect(subscriptionInvoiceIds(await issuerInvoices()).has(invoice.id)).toBe(true)

    expect(mailer).toHaveBeenCalledTimes(1)
    const sent = mailer.mock.calls[0][0]
    expect(sent).toMatchObject({ to: 'signup@kupac.rs', ownerCopy: true })
    expect(sent.subject).toContain('PR-01/2026')
    expect(sent.text).toContain(`https://app.test/shared/invoice/${invoice.shareToken}`)

    const notice = await prisma.billingNotice.findFirstOrThrow({ where: { profileId: customerId } })
    expect(notice).toMatchObject({ status: 'sent', invoiceId: invoice.id, invoiceNumber: 'PR-01/2026', recipient: 'signup@kupac.rs', attempts: 1, isTest: false, ownerOnly: false })
    expect(notice.messageId).toMatch(/^msg-/)
  })

  it('adds PDV only when the ISSUER is in the PDV system', async () => {
    await prisma.profile.update({ where: { id: issuerId }, data: { inVatSystem: true } })
    await prisma.profile.update({ where: { id: customerId }, data: { inVatSystem: false } })
    await runBilling(options())
    const [invoice] = await issuerInvoices()
    expect(invoice.vatEnabled).toBe(true)
    expect(invoice.vatAmount.toString()).toBe('469.46')
    expect(invoice.totalAmount.toString()).toBe('2816.77')
    expect(invoice.note).not.toContain('Obveznik nije u sistemu PDV-a.')
  })

  it('never touches the paying company\'s own invoices, clients, stock, numbering or profile (A vs B)', async () => {
    const own = await prisma.invoice.create({
      data: { invoiceNumber: '01/2026', dueDate: now, clientName: 'Setvi', totalAmount: 100, status: 'UNPAID', profileId: customerId },
    })
    await prisma.client.create({ data: { name: 'Setvi', profileId: customerId } })
    const before = {
      profile: await prisma.profile.findUniqueOrThrow({ where: { id: customerId } }),
      invoices: await prisma.invoice.findMany({ where: { profileId: customerId }, orderBy: { id: 'asc' } }),
      clients: await prisma.client.count({ where: { profileId: customerId } }),
      stock: await prisma.stockMovement.count({ where: { profileId: customerId } }),
      products: await prisma.product.count({ where: { profileId: customerId } }),
    }
    await runBilling(options())
    await runBilling(options({ delivery: { kind: 'test', to: 'owner@gmail.com' }, onlyProfileId: customerId }))

    expect(await prisma.profile.findUniqueOrThrow({ where: { id: customerId } })).toEqual(before.profile)
    expect(await prisma.invoice.findMany({ where: { profileId: customerId }, orderBy: { id: 'asc' } })).toEqual(before.invoices)
    expect(await prisma.client.count({ where: { profileId: customerId } })).toBe(before.clients)
    expect(await prisma.stockMovement.count({ where: { profileId: customerId } })).toBe(before.stock)
    expect(await prisma.product.count({ where: { profileId: customerId } })).toBe(before.products)
    expect(await prisma.invoice.findUniqueOrThrow({ where: { id: own.id } })).toMatchObject({ invoiceNumber: '01/2026' })
    // Everything billing wrote is in the issuer's account.
    expect(await prisma.invoice.count({ where: { profileId: issuerId } })).toBe(2)
  })

  it('a second run (or the next day) sends nothing again for the same month', async () => {
    await runBilling(options())
    const again = onlyOurs(await runBilling(options({ now: new Date('2026-11-04T06:00:00.000Z') })))
    expect(again).toEqual([expect.objectContaining({ outcome: 'already_sent', invoiceNumber: 'PR-01/2026' })])
    expect(mailer).toHaveBeenCalledTimes(1)
    expect(await prisma.invoice.count({ where: { profileId: issuerId } })).toBe(1)
  })

  it('two runs at the same moment issue one predračun and one e-mail', async () => {
    await Promise.all([runBilling(options()), runBilling(options())])
    expect(await prisma.invoice.count({ where: { profileId: issuerId } })).toBe(1)
    expect(mailer).toHaveBeenCalledTimes(1)
  })

  it('a failed e-mail is retried with the same predračun and the same idempotency key', async () => {
    mailer.mockRejectedValueOnce(new Error('Resend je odbio mejl (HTTP 500)'))
    const first = onlyOurs(await runBilling(options()))
    expect(first[0]).toMatchObject({ outcome: 'failed', error: expect.stringMatching(/HTTP 500/) })
    expect(await prisma.billingNotice.findFirstOrThrow({ where: { profileId: customerId } })).toMatchObject({ status: 'failed' })

    const retry = onlyOurs(await runBilling(options()))
    expect(retry[0]).toMatchObject({ outcome: 'sent', invoiceNumber: 'PR-01/2026' })
    expect(await prisma.invoice.count({ where: { profileId: issuerId } })).toBe(1)
    expect(mailer.mock.calls[0][0].idempotencyKey).toBe(mailer.mock.calls[1][0].idempotencyKey)
  })

  it('no rate, no predračun: nothing is written', async () => {
    await expect(runBilling(options({ getRate: async () => Promise.reject(new Error('Kurs NBS nije dostupan.')) }))).rejects.toThrow(/Kurs NBS/)
    expect(await prisma.billingNotice.count({ where: { profileId: customerId } })).toBe(0)
    expect(await prisma.invoice.count({ where: { profileId: issuerId } })).toBe(0)
    expect(mailer).not.toHaveBeenCalled()
  })

  it('prefers the e-mail from Podešavanja and skips test addresses', async () => {
    await prisma.profile.update({ where: { id: customerId }, data: { contactEmail: 'racuni@kupac.rs' } })
    expect(onlyOurs(await runBilling(options({ delivery: { kind: 'dry' }, mailer: undefined })))[0].recipient).toBe('racuni@kupac.rs')

    await prisma.profile.update({ where: { id: customerId }, data: { contactEmail: null } })
    const noEmail = onlyOurs(await runBilling(options({ lookupEmail: async () => 'demo+clerk_test@example.com' })))
    expect(noEmail[0]).toMatchObject({ outcome: 'no_email' })
    expect(mailer).not.toHaveBeenCalled()
  })

  it('switch off: the predračun goes only to the owner, never to the customer', async () => {
    const items = onlyOurs(await runBilling(options({ delivery: { kind: 'owner', to: 'owner@gmail.com' } })))
    expect(items[0]).toMatchObject({ outcome: 'sent', recipient: 'owner@gmail.com', delivery: 'owner' })
    expect(mailer).toHaveBeenCalledTimes(1)
    expect(mailer.mock.calls[0][0]).toMatchObject({ to: 'owner@gmail.com', ownerCopy: false })
    expect(await prisma.billingNotice.findFirstOrThrow({ where: { profileId: customerId } })).toMatchObject({ ownerOnly: true, recipient: 'owner@gmail.com' })
  })

  describe('test mode (billing:send --test)', () => {
    const test = (extra: Partial<BillingRunOptions> = {}) =>
      options({ delivery: { kind: 'test', to: 'owner@gmail.com' }, onlyProfileId: customerId, ...extra })

    it('refuses to run without --only', async () => {
      await expect(runBilling(options({ delivery: { kind: 'test', to: 'owner@gmail.com' } }))).rejects.toThrow(/--only/)
      expect(mailer).not.toHaveBeenCalled()
    })

    it('ignores the 7-day window, goes only to --to and is marked TEST', async () => {
      const later = await prisma.profile.findFirstOrThrow({ where: { clerkUserId: `${prefix}-later` } })
      const items = await runBilling(test({ onlyProfileId: later.id }))
      expect(items).toEqual([expect.objectContaining({ outcome: 'sent', recipient: 'owner@gmail.com', delivery: 'test' })])
      expect(mailer.mock.calls[0][0]).toMatchObject({ to: 'owner@gmail.com', ownerCopy: false })
      expect(mailer.mock.calls[0][0].subject).toMatch(/^\[TEST, ne plaćati\]/)
      const [invoice] = await issuerInvoices()
      expect(invoice.note?.startsWith('TEST, ne plaćati.')).toBe(true)
      expect(invoice.billingNotice).toMatchObject({ isTest: true, ownerOnly: false, profileId: later.id })
    })

    it('never blocks or replaces the real predračun of that month, and is hidden from the customer', async () => {
      await runBilling(test())
      const real = onlyOurs(await runBilling(options()))
      expect(real[0]).toMatchObject({ outcome: 'sent', recipient: 'signup@kupac.rs' })
      expect(await prisma.billingNotice.count({ where: { profileId: customerId } })).toBe(2)
      const documents = await subscriptionDocumentsFor(prisma, customerId)
      expect(documents).toHaveLength(1)
      expect(documents[0]).toMatchObject({ invoiceNumber: 'PR-02/2026', periodFrom: '2026-11-11' })
      expect(documents[0].url).toMatch(/^\/shared\/invoice\//)
    })

    it('is never made for the issuer or its duplicate profile', async () => {
      const duplicate = await prisma.profile.create({
        data: { clerkUserId: `${prefix}-dup`, companyName: ' izdavalac D.O.O. ', pib: '100000011', accessExpiresAt: zonedDateTimeToUtc(2026, 11, 8) },
      })
      await expect(runBilling(test({ onlyProfileId: duplicate.id }))).rejects.toThrow(/izdavaoca/)
      await expect(runBilling(test({ onlyProfileId: issuerId }))).rejects.toThrow()
      expect(mailer).not.toHaveBeenCalled()
    })
  })

  it('never bills the issuer, its duplicates or listed profiles, and refuses an issuer without žiro-račun', async () => {
    await prisma.profile.update({ where: { id: issuerId }, data: { accessExpiresAt: zonedDateTimeToUtc(2026, 11, 8) } })
    const samePib = await prisma.profile.create({ data: { clerkUserId: `${prefix}-same-pib`, companyName: 'Drugo ime', pib: '100000009', accessExpiresAt: zonedDateTimeToUtc(2026, 11, 8) } })
    const listed = await prisma.profile.create({ data: { clerkUserId: `${prefix}-listed`, companyName: 'Moj drugi nalog', accessExpiresAt: zonedDateTimeToUtc(2026, 11, 8) } })
    const items = await runBilling(options({ delivery: { kind: 'dry' }, mailer: undefined, excludeProfileIds: [listed.id] }))
    const billed = items.map((item) => item.profileId)
    expect(billed).not.toContain(issuerId)
    expect(billed).not.toContain(samePib.id)
    expect(billed).not.toContain(listed.id)
    expect(billed).toContain(customerId)

    await prisma.profile.update({ where: { id: issuerId }, data: { giroAccount: null } })
    await expect(runBilling(options())).rejects.toThrow(/žiro-račun/)
  })
})
