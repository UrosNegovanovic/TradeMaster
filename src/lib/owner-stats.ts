import { accessStatus, isTrialPeriod } from '@/lib/access-period'
import { MONTHLY_PRICE_EUR } from '@/lib/billing-predracun'
import { formatLocalYmd } from '@/lib/local-date'

/**
 * Platform owner statistics (ROADMAP "Owner panel", step O2): pure counting over one slim row per company.
 * Only numbers leave this module: no company name, id, article, buyer or amount (ROADMAP rule 6).
 * The rows come from `loadOwnerStats` (src/lib/owner-stats-query.ts), where the database does the per-company
 * counting; products, invoices and stock movements are never loaded row by row.
 */

/** One company, already reduced to what the statistics need. */
export type OwnerStatsCompany = {
  createdAt: Date
  accessExpiresAt: Date | null
  /** Name and a 9-digit PIB filled in (`hasCompanyDetails`, the first onboarding step). */
  hasCompanyDetails: boolean
  productCount: number
  /** Issued invoices and predračuni (everything that is not a draft). */
  issuedDocumentCount: number
  /** Catalogs with an active share link. */
  sharedCatalogCount: number
  /** Latest write to products, invoices or stock movements. */
  lastActivityAt: Date | null
  /** Rows in `access_extensions`: confirmed payments. */
  paymentCount: number
}

/**
 * Why the company has the access date it has:
 * - 'trial': still on the first free period (`isTrialPeriod`), no payment yet;
 * - 'paid': at least one confirmed payment (`access_extensions`);
 * - 'manual': no payment, but the date is not the trial date (the owner changed it by hand, e.g. a gift).
 */
export type AccessKind = 'trial' | 'paid' | 'manual'
export type AccessKindCounts = Record<AccessKind, number>

export const NEW_COMPANY_WEEKS = 12

export type OwnerStats = {
  totalCompanies: number
  /** Companies opened per Belgrade week (Monday to Sunday), oldest first; the last entry is the current week. */
  newByWeek: Array<{ weekStartYmd: string; count: number }>
  /** Every company is in exactly one cell: the cells add up to `totalCompanies`. */
  access: {
    /** `accessExpiresAt` NULL. */
    unlimited: number
    active: AccessKindCounts
    /** Last 7 days before the expiry day. */
    expiring: AccessKindCounts
    /** The 2 days after the expiry day, still full access. */
    grace: AccessKindCounts
    /** Read-only. */
    expired: AccessKindCounts
  }
  activation: { companyDetails: number; product: number; issuedDocument: number; sharedCatalog: number }
  /** Companies with a write in the last 7 / 30 Belgrade days, today included. */
  activeCompanies: { last7Days: number; last30Days: number }
  conversion: {
    /** Companies that paid at least once. */
    paid: number
    /** Trial ended in read-only without any payment. */
    trialLapsed: number
    /** paid / (paid + trialLapsed); null until the first trial is decided either way. */
    rate: number | null
  }
  revenue: {
    /** Paid at least once and the paid period covers today (active or expiring). */
    payingCompanies: number
    monthlyPriceEur: number
    monthlyEur: number
  }
  /** Paid before, now read-only without a new payment. */
  churned: number
}

const DAY_MS = 86_400_000

/** Belgrade calendar day as a running day number, so day and week differences are plain subtraction. */
function localDayNumber(date: Date): number {
  const [year, month, day] = formatLocalYmd(date).split('-').map(Number)
  return Date.UTC(year, month - 1, day) / DAY_MS
}

const mondayOf = (dayNumber: number) => dayNumber - ((new Date(dayNumber * DAY_MS).getUTCDay() + 6) % 7)
const ymdOf = (dayNumber: number) => new Date(dayNumber * DAY_MS).toISOString().slice(0, 10)
const noKinds = (): AccessKindCounts => ({ trial: 0, paid: 0, manual: 0 })

export function accessKind(company: Pick<OwnerStatsCompany, 'createdAt' | 'accessExpiresAt' | 'paymentCount'>): AccessKind {
  if (company.paymentCount > 0) return 'paid'
  return isTrialPeriod(company.createdAt, company.accessExpiresAt) ? 'trial' : 'manual'
}

export function buildOwnerStats(
  companies: OwnerStatsCompany[],
  now = new Date(),
  monthlyPriceEur = MONTHLY_PRICE_EUR
): OwnerStats {
  const today = localDayNumber(now)
  const thisMonday = mondayOf(today)
  const weeks = Array.from({ length: NEW_COMPANY_WEEKS }, (_, index) => ({
    weekStartYmd: ymdOf(thisMonday - (NEW_COMPANY_WEEKS - 1 - index) * 7),
    count: 0,
  }))
  const access: OwnerStats['access'] = {
    unlimited: 0,
    active: noKinds(),
    expiring: noKinds(),
    grace: noKinds(),
    expired: noKinds(),
  }
  const activation = { companyDetails: 0, product: 0, issuedDocument: 0, sharedCatalog: 0 }
  const activeCompanies = { last7Days: 0, last30Days: 0 }
  let paid = 0

  for (const company of companies) {
    const weeksAgo = (thisMonday - mondayOf(localDayNumber(company.createdAt))) / 7
    if (weeksAgo >= 0 && weeksAgo < NEW_COMPANY_WEEKS) weeks[NEW_COMPANY_WEEKS - 1 - weeksAgo].count += 1

    const state = accessStatus(company.accessExpiresAt, now).state
    if (state === 'unlimited') access.unlimited += 1
    else access[state][accessKind(company)] += 1

    if (company.hasCompanyDetails) activation.companyDetails += 1
    if (company.productCount > 0) activation.product += 1
    if (company.issuedDocumentCount > 0) activation.issuedDocument += 1
    if (company.sharedCatalogCount > 0) activation.sharedCatalog += 1

    if (company.lastActivityAt) {
      const daysAgo = today - localDayNumber(company.lastActivityAt)
      if (daysAgo < 7) activeCompanies.last7Days += 1
      if (daysAgo < 30) activeCompanies.last30Days += 1
    }

    if (company.paymentCount > 0) paid += 1
  }

  const trialLapsed = access.expired.trial
  const decided = paid + trialLapsed
  const payingCompanies = access.active.paid + access.expiring.paid

  return {
    totalCompanies: companies.length,
    newByWeek: weeks,
    access,
    activation,
    activeCompanies,
    conversion: { paid, trialLapsed, rate: decided > 0 ? paid / decided : null },
    revenue: { payingCompanies, monthlyPriceEur, monthlyEur: payingCompanies * monthlyPriceEur },
    churned: access.expired.paid,
  }
}

type NonCustomerEnv = Record<string, string | undefined>

/**
 * Profiles that are not customers and never count in the owner statistics: the company that issues the
 * subscription predračuni, the owner's other profiles and demo accounts (comma-separated profile ids).
 */
export function nonCustomerProfileIds(env: NonCustomerEnv = process.env): string[] {
  const ids = [env.BILLING_ISSUER_PROFILE_ID, env.BILLING_EXCLUDE_PROFILE_IDS, env.PLATFORM_DEMO_PROFILE_IDS]
    .flatMap((value) => (value ?? '').split(','))
    .map((id) => id.trim())
    .filter(Boolean)
  return Array.from(new Set(ids))
}
