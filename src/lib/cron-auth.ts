import { timingSafeEqual } from 'node:crypto'

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Constant-time compare; a short or missing secret never passes. */
export function isAuthorizedCron(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !header) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const given = Buffer.from(header)
  return given.length === expected.length && timingSafeEqual(given, expected)
}
