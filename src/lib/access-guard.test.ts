import { describe, expect, it } from 'vitest'
import { ACCESS_EXPIRED_MESSAGE, accessExpiredResponse } from './access-guard'

const past = '2020-01-01T00:00:00.000Z'
const future = '2999-01-01T00:00:00.000Z'

describe('accessExpiredResponse', () => {
  it('lets unlimited, active and expiring accounts through', () => {
    expect(accessExpiredResponse({ accessExpiresAt: null })).toBeNull()
    expect(accessExpiredResponse({})).toBeNull()
    expect(accessExpiredResponse({ accessExpiresAt: future })).toBeNull()
  })

  it('answers 402 with a Serbian message and a stable code once expired', async () => {
    const response = accessExpiredResponse({ accessExpiresAt: past })
    expect(response?.status).toBe(402)
    expect(await response?.json()).toEqual({ error: ACCESS_EXPIRED_MESSAGE, code: 'ACCESS_EXPIRED' })
    expect(ACCESS_EXPIRED_MESSAGE).toMatch(/samo za pregled/)
    expect(ACCESS_EXPIRED_MESSAGE).toMatch(/20 €/)
  })
})
