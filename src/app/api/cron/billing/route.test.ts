import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { runBilling } = vi.hoisted(() => ({ runBilling: vi.fn() }))
vi.mock('@/lib/billing-run', async (importOriginal) => ({ ...(await importOriginal<object>()), runBilling }))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import { GET } from './route'

const secret = 'cron-secret-for-tests-0123456789'
const call = (authorization?: string) =>
  GET(new NextRequest('http://localhost/api/cron/billing', { headers: authorization ? { authorization } : {} }))

afterEach(() => {
  vi.unstubAllEnvs()
  runBilling.mockReset()
})

describe('GET /api/cron/billing', () => {
  it('rejects every request without the exact Bearer CRON_SECRET with 401', async () => {
    vi.stubEnv('CRON_SECRET', secret)
    vi.stubEnv('BILLING_ISSUER_PROFILE_ID', 'issuer')
    for (const header of [undefined, secret, `Bearer ${secret}x`, `Basic ${secret}`, 'Bearer ']) {
      expect((await call(header)).status).toBe(401)
    }
    expect(runBilling).not.toHaveBeenCalled()
  })

  it('stays closed when CRON_SECRET is not set', async () => {
    vi.stubEnv('CRON_SECRET', '')
    expect((await call('Bearer ')).status).toBe(401)
    expect(runBilling).not.toHaveBeenCalled()
  })

  it('without BILLING_AUTO_SEND and BILLING_EMAIL_BCC runs dry (nothing written or sent)', async () => {
    vi.stubEnv('CRON_SECRET', secret)
    vi.stubEnv('BILLING_ISSUER_PROFILE_ID', 'issuer')
    vi.stubEnv('BILLING_AUTO_SEND', '')
    vi.stubEnv('BILLING_EMAIL_BCC', '')
    runBilling.mockResolvedValue([])
    const response = await call(`Bearer ${secret}`)
    expect(response.status).toBe(200)
    expect(runBilling.mock.calls[0][0]).toMatchObject({ delivery: { kind: 'dry' }, mailer: undefined })
  })

  it('with BILLING_AUTO_SEND off but an owner address, sends only to the owner', async () => {
    vi.stubEnv('CRON_SECRET', secret)
    vi.stubEnv('BILLING_ISSUER_PROFILE_ID', 'issuer')
    vi.stubEnv('BILLING_AUTO_SEND', 'off')
    vi.stubEnv('BILLING_EMAIL_BCC', 'owner@gmail.com')
    vi.stubEnv('RESEND_API_KEY', 're_test')
    runBilling.mockResolvedValue([])
    await call(`Bearer ${secret}`)
    expect(runBilling.mock.calls[0][0].delivery).toEqual({ kind: 'owner', to: 'owner@gmail.com' })
  })
})
