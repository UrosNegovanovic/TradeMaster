import { scrubEvent } from '@/lib/sentry-scrub'

/** Sentry runs only when a DSN is configured; every runtime shares these privacy-first options. */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined

export function sentryBaseOptions() {
  return {
    dsn: SENTRY_DSN,
    enabled: Boolean(SENTRY_DSN),
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV,
    sendDefaultPii: false,
    maxBreadcrumbs: 0,
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
  }
}
