import { randomBytes } from 'node:crypto'
import { Prisma, type PrismaClient } from '@prisma/client'
import { accessStatus } from '@/lib/access-period'
import {
  isDeliverableRecipient,
  isPredracunDue,
  monthlyPriceRsd,
  predracunEmail,
  predracunLineName,
  predracunNote,
  predracunPeriod,
  type BillingDelivery,
  type BillingIssuer,
} from '@/lib/billing-predracun'

export { chooseDelivery, type BillingDelivery } from '@/lib/billing-predracun'
import type { Mailer } from '@/lib/billing-email'
import { computeInvoiceAmounts } from '@/lib/invoice-service'
import { reserveNextInvoiceNumber } from '@/lib/invoice-number'
import { invoiceSharePath } from '@/lib/public-invoice'
import type { EurRate } from '@/lib/nbs-rate'

/**
 * Platform billing (B): T&G Nest (the issuer, BILLING_ISSUER_PROFILE_ID) bills companies for using TradeMaster.
 * Daily job (Vercel Cron → /api/cron/billing, or `npm run billing:send`): for every company whose access ends
 * within 7 days, issue a predračun in the issuer's own account and e-mail its public link (IPS QR, PDF).
 *
 * Separation from the companies' own invoicing (A): this code writes only invoices of the ISSUER profile and
 * billing_notices. It never writes a paying company's invoices, clients, stock or number series, and PDV comes
 * only from the issuer's Profile.inVatSystem (billing-run.db.test.ts checks this).
 *
 * Once only: billing_notices is unique per (company, month, isTest); a retried e-mail reuses the same predračun
 * and the same Resend idempotency key.
 */

export type BillingRunOptions = {
  db: PrismaClient
  issuerProfileId: string
  delivery: BillingDelivery
  getRate: () => Promise<EurRate>
  mailer?: Mailer
  /** Sign-up e-mail of a Clerk user, used when the company has no e-mail in Podešavanja. */
  lookupEmail: (clerkUserId: string) => Promise<string | null>
  /** Absolute URL of a public share path. */
  linkFor: (path: string) => string
  now?: Date
  /** Only this company (required for a test run). */
  onlyProfileId?: string
  /** Never billed: other profiles of the issuer's company (BILLING_EXCLUDE_PROFILE_IDS). */
  excludeProfileIds?: string[]
}

export type BillingRunItem = {
  profileId: string
  company: string
  expiryYmd: string
  periodFromYmd: string
  periodUntilYmd: string
  recipient: string | null
  outcome: 'sent' | 'would_send' | 'already_sent' | 'in_progress' | 'no_email' | 'failed'
  delivery: BillingDelivery['kind']
  invoiceNumber?: string | null
  totalAmount?: string
  error?: string
}

/** A 'pending' claim older than this belongs to a run that died; the next run may take it over. */
const STALE_CLAIM_MS = 10 * 60_000

const dateOnly = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`)
const message = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 500)
const sameName = (left: string | null, right: string | null) =>
  !!left && !!right && left.trim().toLocaleLowerCase('sr') === right.trim().toLocaleLowerCase('sr')

export async function runBilling(options: BillingRunOptions): Promise<BillingRunItem[]> {
  const { db, delivery, now = new Date() } = options
  const sends = delivery.kind !== 'dry'
  if (sends && !options.mailer) throw new Error('Za slanje je potreban mailer (RESEND_API_KEY).')
  if (delivery.kind === 'test' && !options.onlyProfileId) throw new Error('--test radi samo uz --only <PIB> i --to <mejl>.')

  const issuer = await db.profile.findUnique({ where: { id: options.issuerProfileId } })
  if (!issuer) throw new Error('BILLING_ISSUER_PROFILE_ID ne odgovara nijednoj firmi.')
  if (!issuer.companyName || !issuer.pib || !issuer.giroAccount) {
    throw new Error('Firma izdavalac mora imati naziv, PIB i žiro-račun u Podešavanjima.')
  }
  const issuerData: BillingIssuer = {
    companyName: issuer.companyName,
    pib: issuer.pib,
    giroAccount: issuer.giroAccount,
    inVatSystem: issuer.inVatSystem,
  }
  // The issuer and its duplicate profiles (same PIB, same company name, or listed) are never billed.
  const isIssuerCompany = (profile: { id: string; pib: string | null; companyName: string | null }) =>
    profile.id === issuer.id ||
    (options.excludeProfileIds ?? []).includes(profile.id) ||
    (!!profile.pib && profile.pib === issuer.pib) ||
    sameName(profile.companyName, issuer.companyName)

  const candidates = await db.profile.findMany({
    where: { accessExpiresAt: { not: null }, ...(options.onlyProfileId ? { id: options.onlyProfileId } : {}) },
    orderBy: { accessExpiresAt: 'asc' },
    include: { accessExtensions: { orderBy: { createdAt: 'desc' }, take: 1, select: { anchorDay: true, newExpiresAt: true } } },
  })
  if (delivery.kind === 'test' && candidates.length === 0) throw new Error('Firma za test nema datum isteka pristupa.')
  // A test does not wait for the 7-day window: it previews next month's predračun of one company.
  const due = candidates.filter(
    (profile) => !isIssuerCompany(profile) && (delivery.kind === 'test' || isPredracunDue(profile.accessExpiresAt, now))
  )
  if (due.length === 0) {
    if (delivery.kind === 'test') throw new Error('Test se ne pravi za firmu izdavaoca ni njen duplikat.')
    return []
  }

  // No rate, no predračun: nothing is written before this succeeds.
  const rate = await options.getRate()
  const unitPrice = monthlyPriceRsd(rate)
  const isTest = delivery.kind === 'test'
  const items: BillingRunItem[] = []

  for (const profile of due) {
    const expiresAt = profile.accessExpiresAt!
    const last = profile.accessExtensions[0]
    const anchorDay = last && last.newExpiresAt.getTime() === expiresAt.getTime() ? last.anchorDay : null
    const period = predracunPeriod(expiresAt, anchorDay, now)
    const expiryYmd = accessStatus(expiresAt, now).untilYmd!
    const company = profile.companyName?.trim() || null
    const base = {
      profileId: profile.id,
      company: company ?? '(bez naziva)',
      expiryYmd,
      periodFromYmd: period.fromYmd,
      periodUntilYmd: period.untilYmd,
      delivery: delivery.kind,
    }

    try {
      let recipient: string | null
      if (delivery.kind === 'owner' || delivery.kind === 'test') {
        recipient = delivery.to
      } else {
        const contactEmail = profile.contactEmail
        const own = isDeliverableRecipient(contactEmail) ? contactEmail : await options.lookupEmail(profile.clerkUserId)
        recipient = isDeliverableRecipient(own) ? own.trim() : null
      }
      const existing = await db.billingNotice.findUnique({
        where: { profileId_periodFrom_isTest: { profileId: profile.id, periodFrom: dateOnly(period.fromYmd), isTest } },
      })
      if (existing?.status === 'sent') {
        items.push({ ...base, recipient: existing.recipient, outcome: 'already_sent', invoiceNumber: existing.invoiceNumber })
        continue
      }
      if (!recipient) {
        items.push({ ...base, recipient: null, outcome: 'no_email', error: 'Firma nema ispravan mejl (ni u Podešavanjima ni u nalogu).' })
        continue
      }
      if (!sends) {
        items.push({ ...base, recipient, outcome: 'would_send', invoiceNumber: existing?.invoiceNumber ?? null })
        continue
      }

      const notice = await claimNotice(db, profile.id, period, existing?.id, { isTest, ownerOnly: delivery.kind === 'owner' })
      if (!notice) {
        items.push({ ...base, recipient, outcome: 'in_progress' })
        continue
      }

      try {
        const predracun = notice.invoiceId
          ? await db.invoice.findUniqueOrThrow({ where: { id: notice.invoiceId } })
          : await issuePredracun(db, {
              issuerId: issuer.id,
              issuer: issuerData,
              noticeId: notice.id,
              buyer: { name: company ?? recipient, address: profile.address, pib: profile.pib },
              dueYmd: expiryYmd,
              period,
              unitPrice,
              rate,
              now,
              isTest,
            })
        if (!predracun.shareToken || !predracun.shareEnabled) {
          throw new Error(`Predračun ${predracun.invoiceNumber} više nema javni link; uključite deljenje i pokrenite ponovo.`)
        }
        const email = predracunEmail({
          buyerName: company ?? 'vašu firmu',
          invoiceNumber: predracun.invoiceNumber,
          expiryYmd,
          period,
          totalAmount: predracun.totalAmount.toString(),
          vatAmount: predracun.vatAmount.toString(),
          rate,
          issuer: issuerData,
          link: options.linkFor(invoiceSharePath(predracun.shareToken)),
          test: isTest,
        })
        const sent = await options.mailer!({
          to: recipient,
          ...email,
          idempotencyKey: `predracun-${notice.id}`,
          ownerCopy: delivery.kind === 'customer',
        })
        await db.billingNotice.update({
          where: { id: notice.id },
          data: { status: 'sent', messageId: sent.id, recipient, sentAt: new Date(), error: null },
        })
        items.push({
          ...base,
          recipient,
          outcome: 'sent',
          invoiceNumber: predracun.invoiceNumber,
          totalAmount: predracun.totalAmount.toString(),
        })
      } catch (error) {
        await db.billingNotice.update({ where: { id: notice.id }, data: { status: 'failed', error: message(error), recipient } })
        throw error
      }
    } catch (error) {
      items.push({ ...base, recipient: null, outcome: 'failed', error: message(error) })
    }
  }
  return items
}

/** Takes the month for this run: a new row, or a failed / abandoned one. Null when another run holds it. */
async function claimNotice(
  db: PrismaClient,
  profileId: string,
  period: { fromYmd: string; untilYmd: string },
  existingId: string | undefined,
  flags: { isTest: boolean; ownerOnly: boolean }
) {
  if (!existingId) {
    try {
      return await db.billingNotice.create({
        data: {
          profileId,
          periodFrom: dateOnly(period.fromYmd),
          periodUntil: dateOnly(period.untilYmd),
          status: 'pending',
          attempts: 1,
          ...flags,
        },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return null
      throw error
    }
  }
  const claimed = await db.billingNotice.updateMany({
    where: {
      id: existingId,
      // Real clock, not the run's `now`: updatedAt is written by the database clock.
      OR: [{ status: 'failed' }, { status: 'pending', updatedAt: { lt: new Date(Date.now() - STALE_CLAIM_MS) } }],
    },
    data: { status: 'pending', attempts: { increment: 1 }, error: null, ownerOnly: flags.ownerOnly },
  })
  return claimed.count === 1 ? db.billingNotice.findUnique({ where: { id: existingId } }) : null
}

/** The predračun in the ISSUER's account (never the paying company's), with a public link, linked to its notice. */
async function issuePredracun(
  db: PrismaClient,
  input: {
    issuerId: string
    issuer: BillingIssuer
    noticeId: string
    buyer: { name: string; address: string | null; pib: string | null }
    dueYmd: string
    period: { fromYmd: string; untilYmd: string }
    unitPrice: string
    rate: EurRate
    now: Date
    isTest: boolean
  }
) {
  // PDV only from the issuer: the paying company's own inVatSystem is never read here.
  const { items, vatAmount, totalAmount } = computeInvoiceAmounts(
    [{ productId: null, free: true, productName: predracunLineName(input.period), quantity: 1, unitPrice: input.unitPrice, discount: 0, vatRate: 20 }],
    input.issuer.inVatSystem
  )
  const line = items[0]
  return db.$transaction(async (tx) => {
    const invoiceNumber = await reserveNextInvoiceNumber(tx, input.issuerId, input.now, 'PROFORMA')
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        documentType: 'PROFORMA',
        status: 'UNPAID',
        dueDate: dateOnly(input.dueYmd),
        clientName: input.buyer.name,
        clientAddress: input.buyer.address?.trim() || null,
        clientPib: input.buyer.pib && /^\d{9}$/.test(input.buyer.pib) ? input.buyer.pib : null,
        note: predracunNote(input.rate, input.issuer, input.isTest),
        totalAmount,
        vatEnabled: input.issuer.inVatSystem,
        vatAmount,
        shareToken: randomBytes(32).toString('hex'),
        shareEnabled: true,
        profileId: input.issuerId,
        items: {
          create: {
            productName: line.productName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            unitCost: 0,
            discount: line.discount,
            vatRate: line.vatRate,
            total: line.total,
          },
        },
      },
    })
    await tx.billingNotice.update({
      where: { id: input.noticeId },
      data: { invoiceId: invoice.id, invoiceNumber, eurRate: input.rate.middle },
    })
    return invoice
  })
}
