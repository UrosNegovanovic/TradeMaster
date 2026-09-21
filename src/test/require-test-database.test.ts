import { afterEach, describe, expect, it } from 'vitest'
import { ensureTestDatabaseUrl } from './require-test-database'

const originalTestUrl = process.env.TEST_DATABASE_URL
const originalDatabaseUrl = process.env.DATABASE_URL
const originalDirectUrl = process.env.DIRECT_URL

describe('ensureTestDatabaseUrl (unit)', () => {
  afterEach(() => {
    if (originalTestUrl === undefined) {
      delete process.env.TEST_DATABASE_URL
    } else {
      process.env.TEST_DATABASE_URL = originalTestUrl
    }

    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl
    }

    if (originalDirectUrl === undefined) {
      delete process.env.DIRECT_URL
    } else {
      process.env.DIRECT_URL = originalDirectUrl
    }
  })

  it('refuses to run without TEST_DATABASE_URL', () => {
    delete process.env.TEST_DATABASE_URL
    expect(() => ensureTestDatabaseUrl()).toThrow(/TEST_DATABASE_URL must be set/)
  })

  it('refuses when TEST_DATABASE_URL matches DATABASE_URL', () => {
    process.env.TEST_DATABASE_URL = 'postgresql://test:test@127.0.0.1:54329/trademaster_invoice_test'
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
    expect(() => ensureTestDatabaseUrl()).toThrow(/matches the application DATABASE_URL/)
  })
})
