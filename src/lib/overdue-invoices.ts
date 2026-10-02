import { startOfLocalDay } from '@/lib/local-date'

export const DASHBOARD_OVERDUE_PREVIEW = 5

/** Whole Belgrade calendar days past the due date (0 = due today, so not overdue yet). */
export function daysOverdue(dueDate: Date | string, now = new Date()): number {
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate)
  if (Number.isNaN(due.getTime())) return 0
  const diff = startOfLocalDay(now).getTime() - startOfLocalDay(due).getTime()
  return Math.max(0, Math.round(diff / 86_400_000))
}

/** "1 dan", "3 dana": Serbian plural for the overdue badge. */
export function formatDaysOverdue(days: number): string {
  const lastTwo = days % 100
  const last = days % 10
  return last === 1 && lastTwo !== 11 ? `${days} dan` : `${days} dana`
}
