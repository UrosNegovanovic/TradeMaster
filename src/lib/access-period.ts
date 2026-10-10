import { addLocalDays, startOfLocalDay, formatLocalYmd, parseLocalYmd, zonedDateTimeToUtc } from '@/lib/local-date'

/**
 * Manual billing (no checkout yet): every company has an "access until" date that the owner extends by hand
 * after a confirmed payment (scripts/extend-access.ts); one payment = one calendar month. After the expiry day there are ACCESS_GRACE_DAYS with full
 * access and a red notice; then the account is read-only. Data is never locked away: reading and export stay.
 * `accessExpiresAt` NULL means no limit (accounts that existed before this feature, or granted by the owner).
 */

/** Length of the first access period given to a new company. */
export const INITIAL_ACCESS_DAYS = 60

/**
 * The banner starts this many days before the date: the owner sends the predračun then and a bank transfer
 * needs 1-2 working days (docs/billing-runbook.md).
 */
export const ACCESS_WARNING_DAYS = 7

/**
 * Days after the expiry day in which everything still works, with a red notice to pay (dunning grace).
 * Read-only starts the day after the last grace day.
 */
export const ACCESS_GRACE_DAYS = 2

/** 'grace': past the expiry day but within ACCESS_GRACE_DAYS, still full access. 'expired': read-only. */
export type AccessState = 'unlimited' | 'active' | 'expiring' | 'grace' | 'expired'

export type AccessStatus = {
  state: AccessState
  /** Whole Belgrade calendar days until the expiry day (0 = expires today); negative once expired. */
  daysLeft: number | null
  /** Expiry day as YYYY-MM-DD in Belgrade, for display. */
  untilYmd: string | null
  /** Last day to pay before read-only, YYYY-MM-DD in Belgrade; set once past the expiry day. */
  graceUntilYmd: string | null
  /** Whole days until graceUntilYmd (0 = today is the last day); set in the grace state. */
  graceDaysLeft: number | null
}

/** Access period granted when a company is created. */
export function initialAccessExpiry(now = new Date()): Date {
  return addLocalDays(now, INITIAL_ACCESS_DAYS)
}

export function accessStatus(expiresAt: Date | string | null | undefined, now = new Date()): AccessStatus {
  const none = { untilYmd: null, graceUntilYmd: null, graceDaysLeft: null }
  if (!expiresAt) return { state: 'unlimited', daysLeft: null, ...none }
  const expiry = new Date(expiresAt)
  if (Number.isNaN(expiry.getTime())) return { state: 'unlimited', daysLeft: null, ...none }

  // Access lasts through the whole expiry day.
  const daysLeft = Math.round((startOfLocalDay(expiry).getTime() - startOfLocalDay(now).getTime()) / 86_400_000)
  const untilYmd = formatLocalYmd(expiry)
  if (daysLeft < 0) {
    const graceUntilYmd = formatLocalYmd(addLocalDays(expiry, ACCESS_GRACE_DAYS))
    if (daysLeft >= -ACCESS_GRACE_DAYS) {
      return { state: 'grace', daysLeft, untilYmd, graceUntilYmd, graceDaysLeft: ACCESS_GRACE_DAYS + daysLeft }
    }
    return { state: 'expired', daysLeft, untilYmd, graceUntilYmd, graceDaysLeft: null }
  }
  const base = { daysLeft, untilYmd, graceUntilYmd: null, graceDaysLeft: null }
  if (daysLeft <= ACCESS_WARNING_DAYS) return { state: 'expiring', ...base }
  return { state: 'active', ...base }
}

/**
 * True while the company is still on its first, free period (expiry is exactly INITIAL_ACCESS_DAYS after the
 * account was created; the owner has not extended it after a payment). Picks "probni period" vs "pretplata".
 */
export function isTrialPeriod(createdAt: Date | string | null | undefined, expiresAt: Date | string | null | undefined): boolean {
  if (!createdAt || !expiresAt) return false
  const trialEnd = startOfLocalDay(initialAccessExpiry(new Date(createdAt)))
  return startOfLocalDay(new Date(expiresAt)).getTime() === trialEnd.getTime()
}

/** Calendar parts of a Belgrade day. */
type Ymd = { year: number; month: number; day: number }

function toYmd(date: Date): Ymd {
  const [year, month, day] = formatLocalYmd(date).split('-').map(Number)
  return { year, month, day }
}

function ymdString({ year, month, day }: Ymd): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Days in a month (1-12); handles leap years (February 2028 has 29). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** The anchor day in the month after `ymd`, or that month's last day when it is shorter (31 → 28/29/30). */
function nextRenewalDay({ year, month }: Ymd, anchorDay: number): Ymd {
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  return { year: nextYear, month: nextMonth, day: Math.min(anchorDay, daysInMonth(nextYear, nextMonth)) }
}

/**
 * How a payment is applied:
 * - 'continue': paid before read-only (active, expiring or within the grace days, judged on the bank payment
 *   date). The new month follows the old expiry day, so early payers lose no day and grace days are not free.
 * - 'reactivate': paid after read-only started (or the account had no limit). The month starts on the day the
 *   owner confirms the payment, because until then the account was read-only.
 */
export type AccessExtensionBasis = 'continue' | 'reactivate'

export type AccessExtensionPlan = {
  basis: AccessExtensionBasis
  /** First day of the paid month (YYYY-MM-DD, Belgrade). */
  fromYmd: string
  /** Last day of the paid month, inclusive (YYYY-MM-DD, Belgrade): the new expiry day. */
  untilYmd: string
  /** New Profile.accessExpiresAt (Belgrade midnight of untilYmd, as everywhere else). */
  expiresAt: Date
  /** Renewal day of the month (1-31; 31 = always the month's last day). Kept so 31.01. → 28.02. → 31.03. */
  anchorDay: number
}

/**
 * One payment = one calendar month of access (manual billing, docs/billing-runbook.md).
 * Access lasts through the whole expiry day. A paid month ends on the same day of the next month as the old
 * expiry (the anchor day); when that month is shorter it ends on its last day, and the month after returns
 * to the anchor (31.01. → 28.02., 29.02. in a leap year → 31.03.). `anchorDay` comes from the previous
 * extension record; without one it is the day of the current expiry.
 *
 * Reactivation on day R (after read-only): access from R through the day before the same date next month
 * (10.03. → 09.04.; 01.03. → 31.03.; 31.01. → 28.02.).
 */
export function planAccessExtension(input: {
  expiresAt: Date | string | null | undefined
  /** Bank statement date of the payment (YYYY-MM-DD); decides on-time vs. late. */
  paidOn: string
  anchorDay?: number | null
  /** When the owner confirms the payment (defaults to now). */
  now?: Date
}): AccessExtensionPlan {
  const now = input.now ?? new Date()
  const paidOnDate = parseLocalYmd(input.paidOn)
  if (!paidOnDate) throw new Error('Datum uplate mora biti u obliku GGGG-MM-DD.')
  if (paidOnDate.getTime() > startOfLocalDay(now).getTime()) throw new Error('Datum uplate ne može biti u budućnosti.')

  const today = toYmd(now)
  const expiry = input.expiresAt ? new Date(input.expiresAt) : null
  const stateOnPayment = accessStatus(expiry, paidOnDate).state
  const onTime = expiry && !Number.isNaN(expiry.getTime()) && stateOnPayment !== 'expired' && stateOnPayment !== 'unlimited'

  if (onTime) {
    const old = toYmd(expiry)
    const anchorDay = validAnchor(input.anchorDay) ?? old.day
    const until = nextRenewalDay(old, anchorDay)
    const plan = build('continue', toYmd(addLocalDays(expiry, 1)), until, anchorDay)
    // Paid on time but confirmed more than a month later: never hand back an already past date.
    if (plan.untilYmd >= ymdString(today)) return plan
  }

  // Read-only (or no limit): the month starts today and ends the day before the same date next month.
  const yesterday = toYmd(addLocalDays(now, -1))
  const anchorDay = yesterday.day === daysInMonth(yesterday.year, yesterday.month) ? 31 : yesterday.day
  return build('reactivate', today, nextRenewalDay(yesterday, anchorDay), anchorDay)
}

function validAnchor(day: number | null | undefined): number | null {
  return day && Number.isInteger(day) && day >= 1 && day <= 31 ? day : null
}

function build(basis: AccessExtensionBasis, from: Ymd, until: Ymd, anchorDay: number): AccessExtensionPlan {
  return {
    basis,
    fromYmd: ymdString(from),
    untilYmd: ymdString(until),
    expiresAt: zonedDateTimeToUtc(until.year, until.month, until.day, 0, 0, 0),
    anchorDay,
  }
}

/**
 * Payment reference as stored in access_extensions (unique): the predračun/faktura number the payment was for,
 * trimmed, upper-cased, inner spaces collapsed, so "pr-03/2026 " and "PR-03/2026" are the same payment.
 */
export function normalizePaymentReference(value: string): string {
  const reference = value.trim().replace(/\s+/g, ' ').toUpperCase()
  if (reference.length < 3 || reference.length > 100) {
    throw new Error('Navedite broj predračuna ili fakture za koju je stigla uplata (3-100 znakova).')
  }
  return reference
}

/** "danas", "sutra", "za 5 dana" (Serbian plural: 1, 21 -> dan). */
export function formatDaysLeft(daysLeft: number): string {
  if (daysLeft <= 0) return 'danas'
  if (daysLeft === 1) return 'sutra'
  const lastTwo = daysLeft % 100
  const last = daysLeft % 10
  return `za ${daysLeft} ${last === 1 && lastTwo !== 11 ? 'dan' : 'dana'}`
}

export function formatAccessDate(ymd: string): string {
  const [year, month, day] = ymd.split('-')
  return `${day}.${month}.${year}.`
}
