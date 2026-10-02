import { addLocalDays, startOfLocalDay, formatLocalYmd } from '@/lib/local-date'

/**
 * Manual billing (no checkout yet): every company has an "access until" date that the owner extends by hand
 * after a paid invoice. The app only informs; it never locks data away from a customer.
 * `accessExpiresAt` NULL means no limit (accounts that existed before this feature, or granted by the owner).
 */

/** Length of the first access period given to a new company. */
export const INITIAL_ACCESS_DAYS = 60

/** The banner starts showing this many days before the date. */
export const ACCESS_WARNING_DAYS = 14

export type AccessState = 'unlimited' | 'active' | 'expiring' | 'expired'

export type AccessStatus = {
  state: AccessState
  /** Whole Belgrade calendar days until the expiry day (0 = expires today); negative once expired. */
  daysLeft: number | null
  /** Expiry day as YYYY-MM-DD in Belgrade, for display. */
  untilYmd: string | null
}

/** Access period granted when a company is created. */
export function initialAccessExpiry(now = new Date()): Date {
  return addLocalDays(now, INITIAL_ACCESS_DAYS)
}

export function accessStatus(expiresAt: Date | string | null | undefined, now = new Date()): AccessStatus {
  if (!expiresAt) return { state: 'unlimited', daysLeft: null, untilYmd: null }
  const expiry = new Date(expiresAt)
  if (Number.isNaN(expiry.getTime())) return { state: 'unlimited', daysLeft: null, untilYmd: null }

  // Access lasts through the whole expiry day.
  const daysLeft = Math.round((startOfLocalDay(expiry).getTime() - startOfLocalDay(now).getTime()) / 86_400_000)
  const untilYmd = formatLocalYmd(expiry)
  if (daysLeft < 0) return { state: 'expired', daysLeft, untilYmd }
  if (daysLeft <= ACCESS_WARNING_DAYS) return { state: 'expiring', daysLeft, untilYmd }
  return { state: 'active', daysLeft, untilYmd }
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
