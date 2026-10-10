import { addLocalDays, startOfLocalDay, formatLocalYmd } from '@/lib/local-date'

/**
 * Manual billing (no checkout yet): every company has an "access until" date that the owner extends by hand
 * after a paid invoice (scripts/extend-access.mjs). After the expiry day there are ACCESS_GRACE_DAYS with full
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

/** One paid month extends access by this many days. */
export const PAID_PERIOD_DAYS = 30

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

/**
 * New expiry after a paid month (manual billing until in-app payment exists). Paid before read-only (active,
 * expiring or grace): the month continues from the old expiry day, so no paid day is lost and grace days are
 * not free extra days. Paid after read-only (or never limited): the month starts today.
 */
export function extendAccessAfterPayment(
  expiresAt: Date | string | null | undefined,
  now = new Date(),
  days = PAID_PERIOD_DAYS
): Date {
  const status = accessStatus(expiresAt, now)
  const fromExpiry = expiresAt && status.state !== 'expired' && status.state !== 'unlimited'
  return addLocalDays(fromExpiry ? new Date(expiresAt) : startOfLocalDay(now), days)
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
