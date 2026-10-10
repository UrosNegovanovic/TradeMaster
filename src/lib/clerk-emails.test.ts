import { describe, expect, it, vi } from 'vitest'
import { CLERK_BATCH, clerkPrimaryEmails } from './clerk-emails'

const env = { CLERK_SECRET_KEY: 'sk_test_example' }
const user = (id: string, email: string) => ({
  id,
  primary_email_address_id: 'primary',
  email_addresses: [
    { id: 'other', email_address: `stari-${email}` },
    { id: 'primary', email_address: email },
  ],
})
const answer = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

describe('clerkPrimaryEmails', () => {
  it('returns the primary e-mail per user in one request', async () => {
    const fetchImpl = vi.fn(async () => answer([user('user_a', 'a@firma.rs'), user('user_b', 'b@firma.rs')]))
    const emails = await clerkPrimaryEmails(['user_a', 'user_b'], env, fetchImpl as never)

    expect(Object.fromEntries(emails)).toEqual({ user_a: 'a@firma.rs', user_b: 'b@firma.rs' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('https://api.clerk.com/v1/users?')
    expect(url).toContain('user_id=user_a&user_id=user_b')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sk_test_example')
  })

  it('falls back to the first address when no primary is set, and skips users without one', async () => {
    const fetchImpl = vi.fn(async () =>
      answer([
        { id: 'user_a', primary_email_address_id: null, email_addresses: [{ id: 'x', email_address: 'jedini@firma.rs' }] },
        { id: 'user_b', email_addresses: [] },
      ])
    )
    const emails = await clerkPrimaryEmails(['user_a', 'user_b'], env, fetchImpl as never)
    expect(Object.fromEntries(emails)).toEqual({ user_a: 'jedini@firma.rs' })
  })

  it('asks in batches and never sends an id that is not a Clerk user id', async () => {
    const ids = Array.from({ length: CLERK_BATCH + 5 }, (_, index) => `user_${index}`)
    const fetchImpl = vi.fn(async () => answer([]))
    await clerkPrimaryEmails([...ids, 'user_0', 'seed-profile', 'user_x&limit=500'], env, fetchImpl as never)

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    const urls = fetchImpl.mock.calls.map((call) => (call as unknown as [string])[0])
    expect(urls[0].match(/user_id=/g)).toHaveLength(CLERK_BATCH)
    expect(urls[1].match(/user_id=/g)).toHaveLength(5)
    expect(urls.join(' ')).not.toContain('seed-profile')
    expect(urls.join(' ')).not.toContain('limit=500')
  })

  it('makes no request without ids', async () => {
    const fetchImpl = vi.fn()
    expect((await clerkPrimaryEmails([], env, fetchImpl as never)).size).toBe(0)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('throws when Clerk is not configured or refuses, so no partial list is shown as complete', async () => {
    await expect(clerkPrimaryEmails(['user_a'], {}, vi.fn() as never)).rejects.toThrow(/CLERK_SECRET_KEY/)
    const refused = vi.fn(async () => answer({ errors: [] }, 401))
    await expect(clerkPrimaryEmails(['user_a'], env, refused as never)).rejects.toThrow(/401/)
  })
})
