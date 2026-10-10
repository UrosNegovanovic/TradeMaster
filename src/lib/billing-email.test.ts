import { describe, expect, it, vi } from 'vitest'
import { RESEND_TEST_SENDER, clerkPrimaryEmail, resendMailer } from './billing-email'
import { isAuthorizedCron } from './cron-auth'
import { NBS_RATE_URL, fetchEurRate, parseEurRate } from './nbs-rate'

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const email = { to: 'kupac@firma.rs', subject: 'S', text: 'T', html: '<p>T</p>', idempotencyKey: 'predracun-1' }

describe('resendMailer', () => {
  it('needs an API key', () => {
    expect(() => resendMailer({} as NodeJS.ProcessEnv)).toThrow(/RESEND_API_KEY/)
  })

  it('posts to Resend with the idempotency key, the owner copy and reply-to', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(200, { id: 'msg_1' }))
    const send = resendMailer(
      { RESEND_API_KEY: 're_x', BILLING_EMAIL_BCC: 'owner@gmail.com', BILLING_EMAIL_REPLY_TO: 'owner@gmail.com' } as unknown as NodeJS.ProcessEnv,
      fetchImpl
    )
    await expect(send(email)).resolves.toEqual({ id: 'msg_1' })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.headers).toMatchObject({ authorization: 'Bearer re_x', 'idempotency-key': 'predracun-1' })
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({ from: RESEND_TEST_SENDER, to: ['kupac@firma.rs'], bcc: ['owner@gmail.com'], reply_to: ['owner@gmail.com'] })
  })

  it('sends no owner copy when the e-mail already goes only to the owner', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(200, { id: 'msg_2' }))
    const send = resendMailer({ RESEND_API_KEY: 're_x', BILLING_EMAIL_BCC: 'owner@gmail.com' } as unknown as NodeJS.ProcessEnv, fetchImpl)
    await send({ ...email, to: 'owner@gmail.com', ownerCopy: false })
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).not.toHaveProperty('bcc')
  })

  it('throws with Resend’s message when the e-mail is refused', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(403, { message: 'You can only send testing emails to your own email address' }))
    const send = resendMailer({ RESEND_API_KEY: 're_x' } as unknown as NodeJS.ProcessEnv, fetchImpl)
    await expect(send(email)).rejects.toThrow(/HTTP 403.*own email/)
  })
})

describe('clerkPrimaryEmail', () => {
  it('returns the primary address of the user', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      json(200, {
        primary_email_address_id: 'b',
        email_addresses: [
          { id: 'a', email_address: 'old@firma.rs' },
          { id: 'b', email_address: 'main@firma.rs' },
        ],
      })
    )
    await expect(clerkPrimaryEmail('user_123', { CLERK_SECRET_KEY: 'sk_test_x' } as unknown as NodeJS.ProcessEnv, fetchImpl)).resolves.toBe('main@firma.rs')
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.clerk.com/v1/users/user_123')
  })

  it('never builds a URL from an unexpected id and returns null without a key or on errors', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(404, {}))
    const env = { CLERK_SECRET_KEY: 'sk_test_x' } as unknown as NodeJS.ProcessEnv
    await expect(clerkPrimaryEmail('../admin', env, fetchImpl)).resolves.toBeNull()
    await expect(clerkPrimaryEmail('user_123', {} as NodeJS.ProcessEnv, fetchImpl)).resolves.toBeNull()
    await expect(clerkPrimaryEmail('user_123', env, fetchImpl)).resolves.toBeNull()
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})

describe('NBS rate', () => {
  it('reads the middle rate, date and list number', () => {
    expect(parseEurRate({ code: 'EUR', date: '2026-10-10', number: 193, exchange_middle: 117.3657 })).toEqual({
      middle: 117.3657,
      date: '2026-10-10',
      listNumber: 193,
    })
  })

  it('refuses a missing, wrong-currency or implausible rate', () => {
    expect(() => parseEurRate({ code: 'USD', date: '2026-10-10', exchange_middle: 100.1 })).toThrow(/Kurs NBS/)
    expect(() => parseEurRate({ code: 'EUR', date: '2026-10-10', exchange_middle: 1.17 })).toThrow(/Kurs NBS/)
    expect(() => parseEurRate({ code: 'EUR', exchange_middle: 117 })).toThrow(/Kurs NBS/)
    expect(() => parseEurRate(null)).toThrow(/Kurs NBS/)
  })

  it('fetches the fixed NBS mirror URL and fails on HTTP errors', async () => {
    const ok = vi.fn().mockResolvedValue(json(200, { code: 'EUR', date: '2026-10-10', number: 193, exchange_middle: 117.3657 }))
    await expect(fetchEurRate(ok)).resolves.toMatchObject({ middle: 117.3657 })
    expect(ok.mock.calls[0][0]).toBe(NBS_RATE_URL)
    await expect(fetchEurRate(vi.fn().mockResolvedValue(json(503, {})))).rejects.toThrow(/HTTP 503/)
  })
})

describe('isAuthorizedCron', () => {
  const secret = 'a-long-random-cron-secret'
  it('accepts only the exact bearer secret', () => {
    expect(isAuthorizedCron(`Bearer ${secret}`, secret)).toBe(true)
    expect(isAuthorizedCron(`Bearer ${secret}x`, secret)).toBe(false)
    expect(isAuthorizedCron(secret, secret)).toBe(false)
    expect(isAuthorizedCron(null, secret)).toBe(false)
  })

  it('stays closed when the secret is missing or too short', () => {
    expect(isAuthorizedCron('Bearer ', undefined)).toBe(false)
    expect(isAuthorizedCron('Bearer short', 'short')).toBe(false)
  })
})
