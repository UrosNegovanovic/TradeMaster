import { describe, expect, it } from 'vitest'
import { cookieStatement, subprocessors, type ProcessingFlags } from './data-processing'

const off: ProcessingFlags = { analytics: false, sentry: false, sharedRateLimit: false }
const on: ProcessingFlags = { analytics: true, sentry: true, sharedRateLimit: true }

describe('subprocessors', () => {
  it('always lists database, hosting and sign-in, with the EU database location', () => {
    const names = subprocessors(off).map((entry) => entry.name)
    expect(names).toEqual(['Supabase Inc.', 'Vercel Inc.', 'Clerk Inc.'])
    expect(subprocessors(off)[0].location).toMatch(/Irska/)
  })

  it('adds optional services only while they are switched on', () => {
    const names = subprocessors(on).map((entry) => entry.name)
    expect(names).toContain('Upstash Inc.')
    expect(names).toContain('Functional Software Inc. (Sentry)')
    expect(names).toContain('Vercel Inc. (Web Analytics)')
    expect(subprocessors({ ...off, sentry: true }).map((entry) => entry.name)).not.toContain('Upstash Inc.')
  })
})

describe('cookieStatement', () => {
  it('never claims measurement when analytics is off, and says it is cookieless when on', () => {
    expect(cookieStatement(off)).toMatch(/nije uključeno/)
    expect(cookieStatement(on)).toMatch(/ne postavlja kolačiće/)
    for (const flags of [off, on]) expect(cookieStatement(flags)).toMatch(/neophodne za prijavu/)
  })
})
