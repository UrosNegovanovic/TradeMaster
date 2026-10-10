import { describe, expect, it, vi } from 'vitest'
import { developmentAccount, ensureProductionUser } from './identity-link-clerk'

const DEV_KEY = 'sk_test_example'
const LIVE_KEY = 'sk_live_example'
const answer = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const user = (id: string, email: string, extra: object = {}) => ({
  id,
  primary_email_address_id: 'e1',
  email_addresses: [{ id: 'e1', email_address: email, verification: { status: 'verified' } }],
  ...extra,
})
type Call = [string, RequestInit]
const calls = (mock: ReturnType<typeof vi.fn>) => mock.mock.calls as unknown as Call[]

describe('developmentAccount', () => {
  it('reads the primary e-mail and whether it is verified', async () => {
    const fetchImpl = vi.fn(async () => answer(user('user_old1', 'vlasnik@firma.rs')))
    expect(await developmentAccount(DEV_KEY, 'user_old1', fetchImpl as never)).toEqual({ exists: true, email: 'vlasnik@firma.rs', verified: true })
    expect(calls(fetchImpl)[0][0]).toBe('https://api.clerk.com/v1/users/user_old1')
  })

  it('reports an unverified address as unverified', async () => {
    const body = { id: 'user_old1', primary_email_address_id: 'e1', email_addresses: [{ id: 'e1', email_address: 'a@b.rs', verification: { status: 'unverified' } }] }
    const fetchImpl = vi.fn(async () => answer(body))
    expect((await developmentAccount(DEV_KEY, 'user_old1', fetchImpl as never)).verified).toBe(false)
  })

  it('says the account is gone on 404 and does not ask for an id that is not a Clerk id', async () => {
    const gone = vi.fn(async () => answer({ errors: [] }, 404))
    expect(await developmentAccount(DEV_KEY, 'user_old1', gone as never)).toEqual({ exists: false, email: null, verified: false })
    const never = vi.fn()
    expect((await developmentAccount(DEV_KEY, 'seed/../users', never as never)).exists).toBe(false)
    expect(never).not.toHaveBeenCalled()
  })

  it('refuses a production key, so the old account is never read from the wrong instance', async () => {
    const fetchImpl = vi.fn()
    await expect(developmentAccount(LIVE_KEY, 'user_old1', fetchImpl as never)).rejects.toMatchObject({ code: 'wrong_key' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

describe('ensureProductionUser', () => {
  const input = { email: 'vlasnik@firma.rs', externalId: 'user_old1' }

  it('creates the user without a password, tagged with the old id', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(answer([])) // by external id
      .mockResolvedValueOnce(answer([])) // by e-mail
      .mockResolvedValueOnce(answer({ id: 'user_new1' }))
    expect(await ensureProductionUser(LIVE_KEY, input, fetchImpl as never)).toEqual({ id: 'user_new1', created: true })

    const [first, second, third] = calls(fetchImpl)
    expect(first[0]).toContain('external_id=user_old1')
    expect(second[0]).toContain('email_address=vlasnik%40firma.rs')
    expect(third[0]).toBe('https://api.clerk.com/v1/users')
    expect(third[1].method).toBe('POST')
    expect(JSON.parse(third[1].body as string)).toEqual({ email_address: ['vlasnik@firma.rs'], external_id: 'user_old1', skip_password_requirement: true })
    expect((third[1].headers as Record<string, string>).authorization).toBe('Bearer sk_live_example')
  })

  it('finds the user made by an earlier run instead of creating a second one', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(answer([user('user_new1', 'vlasnik@firma.rs', { external_id: 'user_old1' })]))
    expect(await ensureProductionUser(LIVE_KEY, input, fetchImpl as never)).toEqual({ id: 'user_new1', created: false })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('never takes over a production user who signed up on their own with that e-mail', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(answer([]))
      .mockResolvedValueOnce(answer([user('user_self', 'Vlasnik@Firma.rs', { external_id: null })]))
    await expect(ensureProductionUser(LIVE_KEY, input, fetchImpl as never)).rejects.toMatchObject({ code: 'email_taken' })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('reports Clerk’s refusal without creating anything twice', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(answer([]))
      .mockResolvedValueOnce(answer([]))
      .mockResolvedValueOnce(answer({ errors: [{ code: 'form_identifier_exists' }] }, 422))
    await expect(ensureProductionUser(LIVE_KEY, input, fetchImpl as never)).rejects.toThrow(/422: form_identifier_exists/)
  })

  it('refuses a Development key, so no user is ever created in the wrong instance', async () => {
    const fetchImpl = vi.fn()
    await expect(ensureProductionUser(DEV_KEY, input, fetchImpl as never)).rejects.toMatchObject({ code: 'wrong_key' })
    await expect(ensureProductionUser(undefined, input, fetchImpl as never)).rejects.toMatchObject({ code: 'wrong_key' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
