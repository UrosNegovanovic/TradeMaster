import { scrubEvent } from '@/lib/sentry-scrub'

/** Sentry runs only when a DSN is configured; every runtime shares these privacy-first options. */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined

/**
 * /uslovi and /privatnost name Sentry's EU data region (Germany). A DSN from any other region
 * keeps Sentry off, so the published location is never wrong.
 */
export function isEuSentryDsn(dsn: string | undefined): boolean {
  if (!dsn) return false
  try {
    return new URL(dsn).hostname.endsWith('.de.sentry.io')
  } catch {
    return false
  }
}

export function sentryBaseOptions() {
  return {
    dsn: SENTRY_DSN,
    enabled: isEuSentryDsn(SENTRY_DSN),
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV,
    sendDefaultPii: false,
    maxBreadcrumbs: 0,
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
  }
}
