import { Prisma, type PrismaClient } from '@prisma/client'
import { formatAccessDate, normalizePaymentReference, planAccessExtension, type AccessExtensionPlan } from '@/lib/access-period'

/**
 * Recording a confirmed payment as one month of access (manual billing, docs/billing-runbook.md).
 * The extension and its trace (access_extensions) are written in one transaction. The reference
 * (predračun/faktura number) is unique, so the same payment can never extend access twice.
 */

export type AccessExtensionInput = {
  profileId: string
  /** Number of the predračun/faktura the payment was for. */
  reference: string
  /** Bank statement date of the payment, YYYY-MM-DD. */
  paidOn: string
  now?: Date
}

export class AccessExtensionError extends Error {
  constructor(
    message: string,
    readonly code: 'duplicate' | 'not_found' | 'changed'
  ) {
    super(message)
  }
}

type Db = PrismaClient | Prisma.TransactionClient

/** The DATE columns hold the calendar day; Prisma maps them through UTC midnight. */
const dateOnly = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`)
const shown = (date: Date) => formatAccessDate(date.toISOString().slice(0, 10))

async function alreadyUsed(db: Db, reference: string) {
  const existing = await db.accessExtension.findUnique({
    where: { reference },
    select: { paidOn: true, periodUntil: true, createdAt: true, profile: { select: { companyName: true, pib: true } } },
  })
  if (!existing) return null
  const company = existing.profile.companyName ?? existing.profile.pib ?? 'nepoznata firma'
  return new AccessExtensionError(
    `Uplata ${reference} je već iskorišćena (${company}, uplaćeno ${shown(existing.paidOn)}, pristup do ${shown(existing.periodUntil)}). Pristup nije ponovo produžen.`,
    'duplicate'
  )
}

/** The renewal day kept by the last extension, as long as nobody changed the expiry by hand since. */
async function storedAnchor(db: Db, profileId: string, expiresAt: Date | null): Promise<number | null> {
  if (!expiresAt) return null
  const last = await db.accessExtension.findFirst({
    where: { profileId },
    orderBy: { createdAt: 'desc' },
    select: { anchorDay: true, newExpiresAt: true },
  })
  return last && last.newExpiresAt.getTime() === expiresAt.getTime() ? last.anchorDay : null
}

/** What would happen; changes nothing. Throws for an already used reference. */
export async function previewAccessExtension(db: Db, input: AccessExtensionInput) {
  const reference = normalizePaymentReference(input.reference)
  const duplicate = await alreadyUsed(db, reference)
  if (duplicate) throw duplicate
  const profile = await db.profile.findUnique({ where: { id: input.profileId }, select: { accessExpiresAt: true } })
  if (!profile) throw new AccessExtensionError('Firma ne postoji.', 'not_found')
  const plan = planAccessExtension({
    expiresAt: profile.accessExpiresAt,
    paidOn: input.paidOn,
    anchorDay: await storedAnchor(db, input.profileId, profile.accessExpiresAt),
    now: input.now,
  })
  return { reference, previousExpiresAt: profile.accessExpiresAt, plan }
}

/** Extends access by one calendar month and records why. Safe to retry: a second run with the same reference fails. */
export async function applyAccessExtension(
  db: PrismaClient,
  input: AccessExtensionInput
): Promise<{ reference: string; plan: AccessExtensionPlan; extensionId: string }> {
  try {
    return await db.$transaction(async (tx) => {
      const { reference, previousExpiresAt, plan } = await previewAccessExtension(tx, input)
      // Only if the expiry is still what the plan was built on (no parallel or manual change in between).
      const updated = await tx.profile.updateMany({
        where: { id: input.profileId, accessExpiresAt: previousExpiresAt },
        data: { accessExpiresAt: plan.expiresAt },
      })
      if (updated.count !== 1) {
        throw new AccessExtensionError('Datum pristupa se upravo promenio. Pokrenite komandu ponovo.', 'changed')
      }
      const extension = await tx.accessExtension.create({
        data: {
          profileId: input.profileId,
          reference,
          paidOn: dateOnly(input.paidOn),
          basis: plan.basis,
          periodFrom: dateOnly(plan.fromYmd),
          periodUntil: dateOnly(plan.untilYmd),
          anchorDay: plan.anchorDay,
          previousExpiresAt,
          newExpiresAt: plan.expiresAt,
        },
        select: { id: true },
      })
      return { reference, plan, extensionId: extension.id }
    })
  } catch (error) {
    // Two runs at the same moment: the unique index stops the second one and rolls back its extension.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw (await alreadyUsed(db, normalizePaymentReference(input.reference))) ?? error
    }
    throw error
  }
}
