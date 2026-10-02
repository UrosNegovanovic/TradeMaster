import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reachedMilestones, trackOnce, type AnalyticsEvent } from './analytics'

const now = new Date('2026-10-02T12:00:00.000Z')
const base = {
  profileCreatedAt: '2026-09-01T00:00:00.000Z',
  productCount: 0,
  invoiceCount: 0,
  sharedCatalogCount: 0,
  sharedInvoiceCount: 0,
  now,
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial }
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value
    },
  }
}

describe('reachedMilestones', () => {
  it('is empty for an old company with no data', () => {
    expect(reachedMilestones(base)).toEqual([])
  })

  it('marks a profile created minutes ago as a signup', () => {
    expect(reachedMilestones({ ...base, profileCreatedAt: '2026-10-02T11:50:00.000Z' })).toEqual(['signup'])
    expect(reachedMilestones({ ...base, profileCreatedAt: '2026-10-02T10:00:00.000Z' })).toEqual([])
  })

  it('maps each data count to its milestone', () => {
    expect(
      reachedMilestones({ ...base, productCount: 3, invoiceCount: 1, sharedCatalogCount: 1, sharedInvoiceCount: 2 })
    ).toEqual(['first_product', 'first_invoice', 'catalog_shared', 'invoice_shared'])
  })
})

describe('trackOnce', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS', 'on')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does nothing unless analytics is switched on', () => {
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS', '')
    const send = vi.fn()
    expect(trackOnce('signup', memoryStorage(), send)).toBe(false)
    expect(send).not.toHaveBeenCalled()
  })

  it('sends an event once per browser', () => {
    const storage = memoryStorage()
    const sent: AnalyticsEvent[] = []
    expect(trackOnce('first_invoice', storage, (event) => sent.push(event))).toBe(true)
    expect(trackOnce('first_invoice', storage, (event) => sent.push(event))).toBe(false)
    expect(trackOnce('first_product', storage, (event) => sent.push(event))).toBe(true)
    expect(sent).toEqual(['first_invoice', 'first_product'])
  })

  it('does not send when storage throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => undefined,
    }
    const send = vi.fn()
    expect(trackOnce('signup', broken, send)).toBe(false)
    expect(send).not.toHaveBeenCalled()
  })
})
