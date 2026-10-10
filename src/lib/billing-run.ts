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
} from '@/lib/billing-predracun'
import type { Mailer } from '@/lib/billing-email'
import { computeInvoiceAmounts } from '@/lib/invoice-service'
import { reserveNextInvoiceNumber } from '@/lib/invoice-number'
import { invoiceSharePath } from '@/lib/public-invoice'
import type { EurRate } from '@/lib/nbs-rate'

/**
 * Daily billing job (Vercel Cron → /api/cron/billing, or `npm run billing:send`): for every company whose
 * access ends within 7 days, issue a predračun in the owner's own TradeMaster account (the issuer) and e-mail
 * it with a public link (IPS QR). One predračun per company and month (billing_notices unique), and a retried
 * e-mail reuses the same predračun and the same Resend idempotency key, so nothing is ever sent twice.
 * Dry run (send: false) writes nothing.
 */

export type BillingRunOptions = {
  db: PrismaClient
  issuerProfileId: string
  send: boolean
  getRate: () => Promise<EurRate>
  mailer?: Mailer
  /** Sign-up e-mail of a Clerk user, used when the company has no e-mail in Podešavanja. */
  lookupEmail: (clerkUserId: string) => Promise<string | null>
  /** Absolute URL of a public share path. */
  linkFor: (path: string) => string
  now?: Date
  /** Only this company (testing, or a manual resend). */
  onlyProfileId?: string
  /** Testing: deliver to this address instead of the company's. */
  recipientOverride?: string
}

export type BillingRunItem = {
  profileId: string
  company: string
  expiryYmd: string
  periodFromYmd: string
  periodUntilYmd: string
  recipient: string | null
  outcome: 'sent' | 'would_send' | 'already_sent' | 'in_progress' | 'no_email' | 'failed'
  invoiceNumber?: string | null
  totalAmount?: string
  error?: string
}

/** A 'pending' claim older than this belongs to a run that died; the next run may take it over. */
const STALE_CLAIM_MS = 10 * 60_000

const dateOnly = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`)
const message = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 500)

export async function runBilling(options: BillingRunOptions): Promise<BillingRunItem[]> {
  const { db, now = new Date() } = options
  if (options.send && !options.mailer) throw new Error('Za slanje je potreban mailer (RESEND_API_KEY).')

  const issuer = await db.profile.findUnique({ where: { id: options.issuerProfileId } })
  if (!issuer) throw new Error('BILLING_ISSUER_PROFILE_ID ne odgovara nijednoj firmi.')
  if (!issuer.companyName || !issuer.pib || !issuer.giroAccount) {
    throw new Error('Firma izdavalac mora imati naziv, PIB i žiro-račun u Podešavanjima.')
  }

  const candidates = await db.profile.findMany({
    where: {
      accessExpiresAt: { not: null },
      id: options.onlyProfileId ? options.onlyProfileId : { not: issuer.id },
    },
    orderBy: { accessExpiresAt: 'asc' },
    include: { accessExtensions: { orderBy: { createdAt: 'desc' }, take: 1, select: { anchorDay: true, newExpiresAt: true } } },
  })
  const due = candidates.filter((profile) => profile.id !== issuer.id && isPredracunDue(profile.accessExpiresAt, now))
  if (due.length === 0) return []

  const rate = await options.getRate()
  const unitPrice = monthlyPriceRsd(rate)
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
    }

    try {
      const contactEmail = profile.contactEmail
      const own = isDeliverableRecipient(contactEmail) ? contactEmail : await options.lookupEmail(profile.clerkUserId)
      const realRecipient = isDeliverableRecipient(own) ? own.trim() : null
      const recipient = options.recipientOverride ?? realRecipient
      const existing = await db.billingNotice.findUnique({
        where: { profileId_periodFrom: { profileId: profile.id, periodFrom: dateOnly(period.fromYmd) } },
      })
      if (existing?.status === 'sent') {
        items.push({ ...base, recipient: existing.recipient, outcome: 'already_sent', invoiceNumber: existing.invoiceNumber })
        continue
      }
      if (!recipient) {
        items.push({ ...base, recipient: null, outcome: 'no_email', error: 'Firma nema ispravan mejl (ni u Podešavanjima ni u nalogu).' })
        continue
      }
      if (!options.send) {
        items.push({ ...base, recipient, outcome: 'would_send', invoiceNumber: existing?.invoiceNumber ?? null })
        continue
      }

      const notice = await claimNotice(db, profile.id, period, existing?.id)
      if (!notice) {
        items.push({ ...base, recipient, outcome: 'in_progress' })
        continue
      }

      try {
        const predracun = notice.invoiceId
          ? await db.invoice.findUniqueOrThrow({ where: { id: notice.invoiceId } })
          : await issuePredracun(db, {
              issuerId: issuer.id,
              inVatSystem: issuer.inVatSystem,
              noticeId: notice.id,
              buyer: { name: company ?? recipient, address: profile.address, pib: profile.pib },
              dueYmd: expiryYmd,
              period,
              unitPrice,
              rate,
              now,
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
          issuer: { companyName: issuer.companyName, pib: issuer.pib, giroAccount: issuer.giroAccount },
          link: options.linkFor(invoiceSharePath(predracun.shareToken)),
        })
        const sent = await options.mailer!({ to: recipient, ...email, idempotencyKey: `predracun-${notice.id}` })
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
  existingId: string | undefined
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
    data: { status: 'pending', attempts: { increment: 1 }, error: null },
  })
  return claimed.count === 1 ? db.billingNotice.findUnique({ where: { id: existingId } }) : null
}

/** The predračun in the issuer's account, with a public link, written together with its notice. */
async function issuePredracun(
  db: PrismaClient,
  input: {
    issuerId: string
    inVatSystem: boolean
    noticeId: string
    buyer: { name: string; address: string | null; pib: string | null }
    dueYmd: string
    period: { fromYmd: string; untilYmd: string }
    unitPrice: string
    rate: EurRate
    now: Date
  }
) {
  const { items, vatAmount, totalAmount } = computeInvoiceAmounts(
    [{ productId: null, free: true, productName: predracunLineName(input.period), quantity: 1, unitPrice: input.unitPrice, discount: 0, vatRate: 20 }],
    input.inVatSystem
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
        note: predracunNote(input.rate),
        totalAmount,
        vatEnabled: input.inVatSystem,
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
