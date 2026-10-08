import { describe, expect, it } from 'vitest'
import { cookieStatement, subprocessorStatus, subprocessors, type ProcessingFlags } from './data-processing'
import { isEuSentryDsn } from './sentry-options'

const off: ProcessingFlags = { analytics: false, sentry: false, sharedRateLimit: false }
const on: ProcessingFlags = { analytics: true, sentry: true, sharedRateLimit: true }

describe('subprocessors', () => {
  it('always lists the same six services, whatever is switched on', () => {
    const names = (flags: ProcessingFlags) => subprocessors(flags).map((entry) => entry.name)
    expect(names(off)).toEqual([
      'Supabase Inc.',
      'Vercel Inc.',
      'Clerk Inc.',
      'Upstash Inc.',
      'Functional Software Inc. (Sentry)',
      'Vercel Inc. (Web Analytics)',
    ])
    expect(names(on)).toEqual(names(off))
  })

  it('labels optional services by the deployment settings', () => {
    const status = (flags: ProcessingFlags) => subprocessors(flags).map(subprocessorStatus)
    expect(status(off)).toEqual([
      'uključeno',
      'uključeno',
      'uključeno',
      'trenutno nije uključeno',
      'trenutno nije uključeno',
      'trenutno nije uključeno',
    ])
    expect(status(on).every((label) => label === 'uključeno')).toBe(true)
  })

  it('states EU locations and keeps buyer data away from Clerk', () => {
    const byName = Object.fromEntries(subprocessors(on).map((entry) => [entry.name, entry]))
    expect(byName['Supabase Inc.'].location).toBe('EU (Irska)')
    expect(byName['Upstash Inc.'].location).toBe('EU (Irska)')
    expect(byName['Functional Software Inc. (Sentry)'].location).toBe('EU (Nemačka)')
    expect(byName['Vercel Inc.'].purpose).toMatch(/Dablinu/)
    expect(byName['Clerk Inc.'].purpose).toMatch(/ne prima podatke vaših kupaca/)
  })
})

describe('isEuSentryDsn', () => {
  it('accepts only DSNs in the EU (de.sentry.io) region', () => {
    expect(isEuSentryDsn('https://abc123@o4500000000.ingest.de.sentry.io/4500000000')).toBe(true)
    expect(isEuSentryDsn('https://abc123@o4500000000.ingest.us.sentry.io/4500000000')).toBe(false)
    expect(isEuSentryDsn('https://abc123@o450.ingest.sentry.io/45')).toBe(false)
    expect(isEuSentryDsn('https://evil.de.sentry.io.example.com/1')).toBe(false)
    expect(isEuSentryDsn(undefined)).toBe(false)
    expect(isEuSentryDsn('not a url')).toBe(false)
  })
})

describe('cookieStatement', () => {
  it('never claims measurement when analytics is off, and says it is cookieless when on', () => {
    expect(cookieStatement(off)).toMatch(/nije uključeno/)
    expect(cookieStatement(on)).toMatch(/ne postavlja kolačiće/)
    for (const flags of [off, on]) expect(cookieStatement(flags)).toMatch(/neophodne za prijavu/)
  })
})
