import { describe, expect, it } from 'vitest'
import type { ErrorEvent } from '@sentry/nextjs'
import { scrubEvent, scrubMessage } from './sentry-scrub'

describe('scrubMessage', () => {
  it('keeps only the first line, truncated', () => {
    expect(scrubMessage('Invalid `prisma.client.create()` invocation:\n  name: "Petar Petrović"')).toBe(
      'Invalid `prisma.client.create()` invocation:'
    )
    expect(scrubMessage('x'.repeat(500))).toHaveLength(200)
    expect(scrubMessage(undefined)).toBeUndefined()
  })
})

describe('scrubEvent', () => {
  it('drops user, request details, breadcrumbs and extra, keeping route and stack', () => {
    const event = {
      type: undefined,
      user: { id: 'user_123', email: 'a@b.rs' },
      extra: { pib: '123456789' },
      breadcrumbs: [{ message: 'clicked' }],
      server_name: 'host',
      message: 'Failed\nname: Kupac DOO',
      request: {
        url: 'https://app.example/api/invoices/export?from=2026-01-01#x',
        method: 'GET',
        cookies: { session: 'secret' },
        headers: { authorization: 'Bearer abc' },
        data: { clientName: 'Kupac' },
        query_string: 'from=2026-01-01',
      },
      exception: {
        values: [{ type: 'Error', value: 'Boom\n  at secret detail', stacktrace: { frames: [{ filename: 'a.ts' }] } }],
      },
    } as unknown as ErrorEvent

    const scrubbed = scrubEvent(event)

    expect(scrubbed.user).toBeUndefined()
    expect(scrubbed.extra).toBeUndefined()
    expect(scrubbed.breadcrumbs).toBeUndefined()
    expect(scrubbed.server_name).toBeUndefined()
    expect(scrubbed.request).toEqual({ url: 'https://app.example/api/invoices/export', method: 'GET' })
    expect(scrubbed.message).toBe('Failed')
    expect(scrubbed.exception?.values?.[0].value).toBe('Boom')
    expect(scrubbed.exception?.values?.[0].stacktrace?.frames).toHaveLength(1)
  })
})
