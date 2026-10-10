import '@/test/setup-test-database'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { zonedDateTimeToUtc } from '@/lib/local-date'
import type { Mailer } from './billing-email'
import { runBilling, type BillingRunOptions } from './billing-run'

const prefix = `billing-run-${randomUUID()}`
const now = new Date('2026-11-03T06:00:00.000Z') // 03.11.2026, 07:00 Belgrade
const rate = { middle: 117.3657, date: '2026-11-03', listNumber: 212 }
let issuerId = ''
let customerId = ''
let mailer: ReturnType<typeof vi.fn> & Mailer

const options = (extra: Partial<BillingRunOptions> = {}): BillingRunOptions => ({
  db: prisma,
  issuerProfileId: issuerId,
  send: true,
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
      inVatSystem: true,
    },
  })
  const customer = await prisma.profile.create({
    data: {
      clerkUserId: `${prefix}-customer`,
      companyName: 'Kupac d.o.o.',
      pib: '100000010',
      address: 'Ulica 1, Beograd',
      accessExpiresAt: zonedDateTimeToUtc(2026, 11, 10),
    },
  })
  // Not due yet (expires in 3 weeks) and a test address: both must be left alone.
  await prisma.profile.create({ data: { clerkUserId: `${prefix}-later`, companyName: 'Kasnije', accessExpiresAt: zonedDateTimeToUtc(2026, 11, 25) } })
  issuerId = issuer.id
  customerId = customer.id
})

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { clerkUserId: { startsWith: prefix } } })
  await prisma.$disconnect()
})

const onlyOurs = (items: Awaited<ReturnType<typeof runBilling>>) => items.filter((item) => item.profileId === customerId)

describe('runBilling (test database)', () => {
  it('dry run shows the predračun and writes nothing', async () => {
    const items = onlyOurs(await runBilling(options({ send: false, mailer: undefined })))
    expect(items).toEqual([expect.objectContaining({ outcome: 'would_send', recipient: 'signup@kupac.rs', periodFromYmd: '2026-11-11', periodUntilYmd: '2026-12-10' })])
    expect(await prisma.billingNotice.count({ where: { profileId: customerId } })).toBe(0)
    expect(await prisma.invoice.count({ where: { profileId: issuerId } })).toBe(0)
  })

  it('issues the predračun in the issuer account (20 € + PDV at the NBS rate) and e-mails it once', async () => {
    const items = onlyOurs(await runBilling(options()))
    expect(items).toEqual([expect.objectContaining({ outcome: 'sent', invoiceNumber: 'PR-01/2026' })])

    const invoice = await prisma.invoice.findFirstOrThrow({ where: { profileId: issuerId }, include: { items: true } })
    expect(invoice).toMatchObject({ documentType: 'PROFORMA', status: 'UNPAID', clientName: 'Kupac d.o.o.', clientPib: '100000010', shareEnabled: true, vatEnabled: true })
    expect(invoice.dueDate.toISOString().slice(0, 10)).toBe('2026-11-10')
    expect(invoice.items).toHaveLength(1)
    expect(invoice.items[0]).toMatchObject({ productName: 'TradeMaster pretplata, 1 mesec (od 11.11.2026. do 10.12.2026.)', quantity: 1 })
    expect(Number(invoice.items[0].vatRate)).toBe(20)
    expect(invoice.items[0].unitPrice.toString()).toBe('2347.31')
    expect(invoice.vatAmount.toString()).toBe('469.46')
    expect(invoice.totalAmount.toString()).toBe('2816.77')
    expect(invoice.note).toContain('117,3657')

    expect(mailer).toHaveBeenCalledTimes(1)
    const sent = mailer.mock.calls[0][0]
    expect(sent.to).toBe('signup@kupac.rs')
    expect(sent.subject).toContain('PR-01/2026')
    expect(sent.text).toContain(`https://app.test/shared/invoice/${invoice.shareToken}`)

    const notice = await prisma.billingNotice.findFirstOrThrow({ where: { profileId: customerId } })
    expect(notice).toMatchObject({ status: 'sent', invoiceId: invoice.id, invoiceNumber: 'PR-01/2026', recipient: 'signup@kupac.rs', attempts: 1 })
    expect(notice.messageId).toMatch(/^msg-/)
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

  it('prefers the e-mail from Podešavanja and skips test addresses', async () => {
    await prisma.profile.update({ where: { id: customerId }, data: { contactEmail: 'racuni@kupac.rs' } })
    expect(onlyOurs(await runBilling(options({ send: false, mailer: undefined })))[0].recipient).toBe('racuni@kupac.rs')

    await prisma.profile.update({ where: { id: customerId }, data: { contactEmail: null } })
    const noEmail = onlyOurs(await runBilling(options({ lookupEmail: async () => 'demo+clerk_test@example.com' })))
    expect(noEmail[0]).toMatchObject({ outcome: 'no_email' })
    expect(mailer).not.toHaveBeenCalled()
  })

  it('a test run can deliver to the owner instead of the customer', async () => {
    const items = onlyOurs(await runBilling(options({ onlyProfileId: customerId, recipientOverride: 'owner@gmail.com' })))
    expect(items[0]).toMatchObject({ outcome: 'sent', recipient: 'owner@gmail.com' })
    expect(mailer.mock.calls[0][0].to).toBe('owner@gmail.com')
  })

  it('never bills the issuer itself and refuses an issuer without žiro-račun', async () => {
    await prisma.profile.update({ where: { id: issuerId }, data: { accessExpiresAt: zonedDateTimeToUtc(2026, 11, 8) } })
    const items = await runBilling(options({ send: false, mailer: undefined }))
    expect(items.some((item) => item.profileId === issuerId)).toBe(false)

    await prisma.profile.update({ where: { id: issuerId }, data: { giroAccount: null } })
    await expect(runBilling(options())).rejects.toThrow(/žiro-račun/)
  })
})
