import { ACCESS_WARNING_DAYS, accessStatus, formatAccessDate, type AccessState, type AccessStatus } from '@/lib/access-period'
import { formatLocalYmd } from '@/lib/local-date'
import { accessKind, type AccessKind } from '@/lib/owner-stats'
import { countSr } from '@/lib/sr-format'

/**
 * Accounts list of the platform owner panel (ROADMAP "Owner panel", step O3): pure rules for one row, the
 * filters and the search. Account metadata and counts only; never a tenant's articles, buyers or amounts.
 */

/** What the query (src/lib/owner-accounts-query.ts) hands over for one company. */
export type OwnerAccountSource = {
  id: string
  companyName: string | null
  pib: string | null
  /** E-mail the Clerk account was opened with; null when Clerk could not be read. */
  signInEmail: string | null
  createdAt: Date
  accessExpiresAt: Date | null
  productCount: number
  /** Issued invoices (not drafts, not predračuni). */
  invoiceCount: number
  lastActivityAt: Date | null
  /** Rows in `access_extensions`. */
  paymentCount: number
  lastPayment: { reference: string; paidOn: Date; periodUntil: Date } | null
  /** Latest automatic subscription predračun; test ones (`isTest`) are never here. */
  lastNotice: OwnerAccountNotice | null
  /** The owner's own company or a demo account: listed, but not a customer. */
  tag: OwnerAccountTag | null
}

export type OwnerAccountNotice = {
  invoiceNumber: string | null
  status: string
  sentAt: Date | null
  ownerOnly: boolean
  periodFrom: Date
  error: string | null
}

export type OwnerAccountTag = 'owner' | 'demo'

export type OwnerAccount = OwnerAccountSource & {
  access: AccessStatus
  /** Null for accounts without an access date. */
  kind: AccessKind | null
  /** Expiring, in the grace days or read-only: the days are shown in red. */
  urgent: boolean
}

export function toOwnerAccount(source: OwnerAccountSource, now = new Date()): OwnerAccount {
  const access = accessStatus(source.accessExpiresAt, now)
  return {
    ...source,
    access,
    kind: access.state === 'unlimited' ? null : accessKind(source),
    urgent: access.state === 'expiring' || access.state === 'grace' || access.state === 'expired',
  }
}

/**
 * "Ističe za 10 dana": 7 days of notice + up to 3 days of weekend or holiday, the same window as
 * `npm run billing:due` (scripts/billing-due.ts; ROADMAP O5 moves both to one place).
 */
export const DUE_WITHIN_DAYS = ACCESS_WARNING_DAYS + 3

export const OWNER_ACCOUNT_FILTERS = ['all', 'due', 'grace', 'expired', 'trial'] as const
export type OwnerAccountFilter = (typeof OWNER_ACCOUNT_FILTERS)[number]

export const OWNER_ACCOUNT_FILTER_LABELS: Record<OwnerAccountFilter, string> = {
  all: 'Svi',
  due: `Ističe za ${DUE_WITHIN_DAYS} dana`,
  grace: 'U roku za uplatu',
  expired: 'Samo pregled',
  trial: 'Probni',
}

export function parseOwnerAccountFilter(value: string | string[] | null | undefined): OwnerAccountFilter {
  const single = Array.isArray(value) ? value[0] : value
  return OWNER_ACCOUNT_FILTERS.find((filter) => filter === single) ?? 'all'
}

export function matchesOwnerAccountFilter(account: OwnerAccount, filter: OwnerAccountFilter): boolean {
  const { state, daysLeft } = account.access
  switch (filter) {
    case 'all':
      return true
    case 'due':
      return state === 'expiring' || (state === 'active' && (daysLeft ?? Infinity) <= DUE_WITHIN_DAYS)
    case 'grace':
      return state === 'grace'
    case 'expired':
      return state === 'expired'
    case 'trial':
      // Still inside the free period; a trial that ran out is under "U roku za uplatu" or "Samo pregled".
      return account.kind === 'trial' && (state === 'active' || state === 'expiring')
  }
}

/** Lower case without diacritics, so "sunčano" finds "Suncano" and the other way round. */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()
}

/** Search by company name, PIB or sign-in e-mail; an empty query matches everything. */
export function matchesOwnerAccountSearch(account: OwnerAccount, query: string | null | undefined): boolean {
  const needle = fold(query ?? '')
  if (!needle) return true
  return [account.companyName, account.pib, account.signInEmail].some((value) => value && fold(value).includes(needle))
}

/** Soonest expiry first, accounts without a date last; within the same day the newer account first. */
function byExpiry(left: OwnerAccount, right: OwnerAccount): number {
  const a = left.accessExpiresAt?.getTime() ?? Infinity
  const b = right.accessExpiresAt?.getTime() ?? Infinity
  if (a !== b) return a < b ? -1 : 1
  return right.createdAt.getTime() - left.createdAt.getTime()
}

export function selectOwnerAccounts(
  accounts: OwnerAccount[],
  options: { filter?: OwnerAccountFilter; query?: string | null } = {}
): OwnerAccount[] {
  return accounts
    .filter((account) => matchesOwnerAccountFilter(account, options.filter ?? 'all'))
    .filter((account) => matchesOwnerAccountSearch(account, options.query))
    .sort(byExpiry)
}

/** How many accounts each filter holds (for the numbers on the filter buttons). */
export function countOwnerAccountFilters(accounts: OwnerAccount[]): Record<OwnerAccountFilter, number> {
  const counts = { all: 0, due: 0, grace: 0, expired: 0, trial: 0 }
  for (const account of accounts) {
    for (const filter of OWNER_ACCOUNT_FILTERS) {
      if (matchesOwnerAccountFilter(account, filter)) counts[filter] += 1
    }
  }
  return counts
}

export const ACCESS_STATE_LABELS: Record<AccessState, string> = {
  unlimited: 'Bez ograničenja',
  active: 'Aktivan',
  expiring: 'Ističe',
  grace: 'Rok za uplatu',
  expired: 'Samo pregled',
}

export const ACCESS_KIND_LABELS: Record<AccessKind, string> = {
  trial: 'probni',
  paid: 'pretplata',
  manual: 'ručno produženo',
}

export const OWNER_ACCOUNT_TAG_LABELS: Record<OwnerAccountTag, string> = {
  owner: 'firma vlasnika',
  demo: 'demo',
}

const days = (count: number) => countSr(count, 'dan', 'dana', 'dana')

/** The "Dana ostalo" cell: days to the expiry day, days left to pay in the grace period, or days since expiry. */
export function daysLeftLabel(access: AccessStatus): string {
  if (access.state === 'unlimited' || access.daysLeft === null) return '-'
  if (access.state === 'grace') {
    return access.graceDaysLeft === 0 ? 'rok ističe danas' : `rok još ${days(access.graceDaysLeft ?? 0)}`
  }
  if (access.state === 'expired') return `isteklo pre ${days(-access.daysLeft)}`
  return access.daysLeft === 0 ? 'ističe danas' : days(access.daysLeft)
}

export function noticeStatusLabel(notice: Pick<OwnerAccountNotice, 'status' | 'ownerOnly'>): string {
  if (notice.status === 'sent') return notice.ownerOnly ? 'poslat samo vlasniku' : 'poslat'
  if (notice.status === 'failed') return 'slanje nije uspelo'
  return 'u toku'
}

/** A moment as its Belgrade calendar day: "10.10.2026." */
export function shownDay(date: Date): string {
  return formatAccessDate(formatLocalYmd(date))
}

/** A DATE column (Prisma maps it through UTC midnight): the stored calendar day, "10.10.2026." */
export function shownDateOnly(date: Date): string {
  return formatAccessDate(date.toISOString().slice(0, 10))
}

type TagEnv = Record<string, string | undefined>

const idList = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

/** Profiles that are listed but are not customers: the owner's own companies and demo accounts. */
export function ownerAccountTags(env: TagEnv = process.env): Map<string, OwnerAccountTag> {
  const tags = new Map<string, OwnerAccountTag>()
  for (const id of idList(env.PLATFORM_DEMO_PROFILE_IDS)) tags.set(id, 'demo')
  for (const id of [...idList(env.BILLING_ISSUER_PROFILE_ID), ...idList(env.BILLING_EXCLUDE_PROFILE_IDS)]) tags.set(id, 'owner')
  return tags
}
