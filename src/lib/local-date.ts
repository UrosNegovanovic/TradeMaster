/** Calendar helpers in Europe/Belgrade, independent of the server UTC clock. */

export const APP_TIMEZONE = 'Europe/Belgrade'

type ZonedParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function zonedParts(date: Date, timeZone = APP_TIMEZONE): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)

  let hour = read('hour')
  if (hour === 24) hour = 0

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour,
    minute: read('minute'),
    second: read('second'),
  }
}

function tzOffsetMs(date: Date): number {
  const zoned = zonedParts(date)
  const asUtc = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, zoned.second)
  return asUtc - date.getTime()
}

/** UTC instant of a civil datetime in Europe/Belgrade. */
export function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second)
  const firstOffset = tzOffsetMs(new Date(utcGuess))
  const instant = utcGuess - firstOffset
  const secondOffset = tzOffsetMs(new Date(instant))
  if (secondOffset !== firstOffset) {
    return new Date(utcGuess - secondOffset)
  }
  return new Date(instant)
}

export function startOfLocalDay(date = new Date()): Date {
  const { year, month, day } = zonedParts(date)
  return zonedDateTimeToUtc(year, month, day, 0, 0, 0)
}

export function startOfLocalTomorrow(date = new Date()): Date {
  const start = startOfLocalDay(date)
  // Advance 26h then snap back to the next Belgrade midnight (DST-safe).
  const { year, month, day } = zonedParts(new Date(start.getTime() + 26 * 60 * 60 * 1000))
  return zonedDateTimeToUtc(year, month, day, 0, 0, 0)
}

export function startOfLocalMonth(date = new Date()): Date {
  const { year, month } = zonedParts(date)
  return zonedDateTimeToUtc(year, month, 1, 0, 0, 0)
}

export function startOfLocalYear(date = new Date()): Date {
  const { year } = zonedParts(date)
  return zonedDateTimeToUtc(year, 1, 1, 0, 0, 0)
}

export function addLocalMonths(date: Date, months: number): Date {
  const { year, month } = zonedParts(date)
  const total = year * 12 + (month - 1) + months
  const nextYear = Math.floor(total / 12)
  const nextMonth = (total % 12) + 1
  return zonedDateTimeToUtc(nextYear, nextMonth, 1, 0, 0, 0)
}

/** Belgrade midnight `days` calendar days after the day of `date` (DST-safe: counts days, not 24h blocks). */
export function addLocalDays(date: Date, days: number): Date {
  const { year, month, day } = zonedParts(date)
  return zonedDateTimeToUtc(year, month, day + days, 0, 0, 0)
}

export function formatLocalYm(date: Date): string {
  const { year, month } = zonedParts(date)
  return `${year}-${String(month).padStart(2, '0')}`
}

export function formatLocalYmd(date: Date): string {
  const { year, month, day } = zonedParts(date)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function parseLocalYmd(value: string | null | undefined): Date | null {
  if (!value) {
    return null
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utcProbe = new Date(Date.UTC(year, month - 1, day))

  if (
    utcProbe.getUTCFullYear() !== year ||
    utcProbe.getUTCMonth() !== month - 1 ||
    utcProbe.getUTCDate() !== day
  ) {
    return null
  }

  return zonedDateTimeToUtc(year, month, day, 0, 0, 0)
}

export function isSameLocalDay(left: Date | null, right: Date | null): boolean {
  if (!left || !right) {
    return false
  }

  return formatLocalYmd(left) === formatLocalYmd(right)
}

export function belgradeMonthIndex(date: Date): number {
  return zonedParts(date).month - 1
}

export function belgradeYear(date: Date): number {
  return zonedParts(date).year
}

/**
 * Default "rok" for a new document: `days` Belgrade calendar days after today, as YYYY-MM-DD for a date
 * input. A UTC date would land a day early between 00:00 and 02:00 Belgrade time (ROADMAP A9.3).
 */
export function defaultDueDateYmd(days = 30, now = new Date()): string {
  return formatLocalYmd(addLocalDays(now, days))
}

/** Whole Belgrade calendar days from `from` to `to` ("Rok plaćanja: 30 dana"), never negative. */
export function localDaysBetween(from: Date | string, to: Date | string): number {
  const toUtcDay = (value: Date | string) => {
    const [year, month, day] = formatLocalYmd(new Date(value)).split('-').map(Number)
    return Date.UTC(year, month - 1, day)
  }
  return Math.max(0, Math.round((toUtcDay(to) - toUtcDay(from)) / 86_400_000))
}
