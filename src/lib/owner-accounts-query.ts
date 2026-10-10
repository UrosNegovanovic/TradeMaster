import type { Prisma, PrismaClient } from '@prisma/client'
import { toOwnerAccount, type OwnerAccount, type OwnerAccountTag } from '@/lib/owner-accounts'
import { loadLastActivityByProfile } from '@/lib/owner-stats-query'

/**
 * Reads the accounts list and one account's billing history for the owner panel (ROADMAP O3). Read-only.
 * Per company: profile metadata, counts the database computes, the last payment and the last automatic
 * predračun. No product, buyer, catalog or invoice content is selected (ROADMAP rule 6).
 */

/** Clerk user id → sign-in e-mail. Injected so tests and scripts need no Clerk. */
export type EmailLookup = (clerkUserIds: string[]) => Promise<Map<string, string>>

type Options = {
  lookupEmails: EmailLookup
  /** Profiles that are not customers (`ownerAccountTags`). */
  tags?: Map<string, OwnerAccountTag>
  now?: Date
}

const accountSelect = {
  id: true,
  clerkUserId: true,
  companyName: true,
  pib: true,
  createdAt: true,
  accessExpiresAt: true,
  _count: {
    select: {
      products: true,
      accessExtensions: true,
      invoices: { where: { documentType: 'INVOICE', status: { not: 'DRAFT' } } },
    },
  },
  accessExtensions: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { reference: true, paidOn: true, periodUntil: true },
  },
  billingNotices: {
    where: { isTest: false },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { invoiceNumber: true, status: true, sentAt: true, ownerOnly: true, periodFrom: true, error: true },
  },
} satisfies Prisma.ProfileSelect

type AccountRow = Prisma.ProfileGetPayload<{ select: typeof accountSelect }>

/** The list still opens when Clerk cannot be read; it then shows no e-mails and says so. */
async function safeEmails(lookup: EmailLookup, clerkUserIds: string[]) {
  try {
    return { emails: await lookup(clerkUserIds), emailsAvailable: true }
  } catch (error) {
    console.error('Owner accounts: sign-in e-mails could not be read from Clerk:', error instanceof Error ? error.message : error)
    return { emails: new Map<string, string>(), emailsAvailable: false }
  }
}

function toAccount(
  row: AccountRow,
  extra: { email: string | null; lastActivityAt: Date | null; tag: OwnerAccountTag | null },
  now?: Date
): OwnerAccount {
  return toOwnerAccount(
    {
      id: row.id,
      companyName: row.companyName,
      pib: row.pib,
      signInEmail: extra.email,
      createdAt: row.createdAt,
      accessExpiresAt: row.accessExpiresAt,
      productCount: row._count.products,
      invoiceCount: row._count.invoices,
      lastActivityAt: extra.lastActivityAt,
      paymentCount: row._count.accessExtensions,
      lastPayment: row.accessExtensions[0] ?? null,
      lastNotice: row.billingNotices[0] ?? null,
      tag: extra.tag,
    },
    now
  )
}

export async function loadOwnerAccounts(
  db: PrismaClient,
  options: Options
): Promise<{ accounts: OwnerAccount[]; emailsAvailable: boolean }> {
  const [rows, lastActivity] = await Promise.all([
    db.profile.findMany({ select: accountSelect }),
    loadLastActivityByProfile(db),
  ])
  const { emails, emailsAvailable } = await safeEmails(
    options.lookupEmails,
    rows.map((row) => row.clerkUserId)
  )
  const accounts = rows.map((row) =>
    toAccount(
      row,
      {
        email: emails.get(row.clerkUserId) ?? null,
        lastActivityAt: lastActivity.get(row.id) ?? null,
        tag: options.tags?.get(row.id) ?? null,
      },
      options.now
    )
  )
  return { accounts, emailsAvailable }
}

const extensionSelect = {
  id: true,
  reference: true,
  paidOn: true,
  basis: true,
  periodFrom: true,
  periodUntil: true,
  previousExpiresAt: true,
  createdAt: true,
} satisfies Prisma.AccessExtensionSelect

const noticeSelect = {
  id: true,
  invoiceNumber: true,
  status: true,
  periodFrom: true,
  periodUntil: true,
  recipient: true,
  sentAt: true,
  error: true,
  attempts: true,
  isTest: true,
  ownerOnly: true,
  createdAt: true,
} satisfies Prisma.BillingNoticeSelect

/** How many history rows the account page shows; a company has one of each per month. */
const HISTORY_LIMIT = 100

export type OwnerAccountDetail = {
  account: OwnerAccount
  /** Company e-mail from Podešavanja: where the automatic predračun goes first. */
  contactEmail: string | null
  emailsAvailable: boolean
  extensions: Array<Prisma.AccessExtensionGetPayload<{ select: typeof extensionSelect }>>
  /** Newest first, test predračuni included (marked `isTest`). */
  notices: Array<Prisma.BillingNoticeGetPayload<{ select: typeof noticeSelect }>>
}

export async function loadOwnerAccountDetail(
  db: PrismaClient,
  profileId: string,
  options: Options
): Promise<OwnerAccountDetail | null> {
  const row = await db.profile.findUnique({
    where: { id: profileId },
    select: { ...accountSelect, contactEmail: true },
  })
  if (!row) return null

  const [extensions, notices, lastActivity, { emails, emailsAvailable }] = await Promise.all([
    db.accessExtension.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
      select: extensionSelect,
    }),
    db.billingNotice.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
      select: noticeSelect,
    }),
    loadLastActivityByProfile(db, { profileId }),
    safeEmails(options.lookupEmails, [row.clerkUserId]),
  ])

  return {
    account: toAccount(
      row,
      {
        email: emails.get(row.clerkUserId) ?? null,
        lastActivityAt: lastActivity.get(profileId) ?? null,
        tag: options.tags?.get(profileId) ?? null,
      },
      options.now
    ),
    contactEmail: row.contactEmail,
    emailsAvailable,
    extensions,
    notices,
  }
}
