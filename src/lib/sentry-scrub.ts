import type { ErrorEvent } from '@sentry/nextjs'

const MAX_MESSAGE_LENGTH = 200

/**
 * Error messages from Prisma and validators can carry tenant data (names, PIB, amounts) after the
 * first line, so only the first line survives, truncated.
 */
export function scrubMessage(message: string | undefined | null): string | undefined {
  if (!message) return undefined
  return message.split('\n')[0].slice(0, MAX_MESSAGE_LENGTH)
}

function stripQuery(url: string | undefined): string | undefined {
  return url ? url.split('?')[0].split('#')[0] : undefined
}

/**
 * Sentry `beforeSend`: keep the stack trace and route, drop everything that can identify a person or
 * a company (user, cookies, headers, request body, query string, breadcrumbs, extra context).
 */
export function scrubEvent<T extends ErrorEvent>(event: T): T {
  delete event.user
  delete event.extra
  delete event.breadcrumbs
  delete event.server_name

  if (event.request) {
    event.request = { url: stripQuery(event.request.url), method: event.request.method }
  }

  event.message = scrubMessage(event.message)
  for (const exception of event.exception?.values ?? []) {
    exception.value = scrubMessage(exception.value)
  }

  return event
}
