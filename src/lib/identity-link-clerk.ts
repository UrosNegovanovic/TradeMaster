/**
 * Clerk Backend API calls for the Development → Production cutover (ROADMAP A0.3), no SDK.
 * Two instances, two keys: the Development key only reads the old account; the Production key looks up and
 * creates the new one. A key of the wrong kind is refused before any request is made.
 */

const API = 'https://api.clerk.com/v1'

type FetchLike = typeof fetch

type ClerkUser = {
  id: string
  external_id?: string | null
  primary_email_address_id?: string | null
  email_addresses?: Array<{ id: string; email_address: string; verification?: { status?: string } | null }>
}

export class ClerkLinkError extends Error {
  constructor(
    message: string,
    readonly code: 'wrong_key' | 'request_failed' | 'email_taken'
  ) {
    super(message)
  }
}

function requireKey(key: string | undefined, prefix: 'sk_test_' | 'sk_live_', name: string): string {
  const value = key?.trim() ?? ''
  if (!value.startsWith(prefix)) {
    throw new ClerkLinkError(`${name} mora biti ključ koji počinje sa ${prefix}.`, 'wrong_key')
  }
  return value
}

async function call(fetchImpl: FetchLike, secret: string, path: string, init: { method?: string; body?: unknown } = {}) {
  const response = await fetchImpl(`${API}${path}`, {
    method: init.method ?? 'GET',
    headers: { authorization: `Bearer ${secret}`, ...(init.body ? { 'content-type': 'application/json' } : {}) },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    signal: AbortSignal.timeout(15_000),
  })
  return response
}

function primaryEmail(user: ClerkUser) {
  const primary = user.email_addresses?.find((item) => item.id === user.primary_email_address_id) ?? user.email_addresses?.[0]
  return primary ? { email: primary.email_address, verified: primary.verification?.status === 'verified' } : { email: null, verified: false }
}

/** Primary e-mail of the old account, read from the Development instance. Null user when it no longer exists. */
export async function developmentAccount(
  developmentKey: string | undefined,
  clerkUserId: string,
  fetchImpl: FetchLike = fetch
): Promise<{ exists: boolean; email: string | null; verified: boolean }> {
  const secret = requireKey(developmentKey, 'sk_test_', 'Ključ Development instance')
  if (!/^user_[A-Za-z0-9]+$/.test(clerkUserId)) return { exists: false, email: null, verified: false }
  const response = await call(fetchImpl, secret, `/users/${clerkUserId}`)
  if (response.status === 404) return { exists: false, email: null, verified: false }
  if (!response.ok) throw new ClerkLinkError(`Clerk Development je odgovorio ${response.status}.`, 'request_failed')
  return { exists: true, ...primaryEmail((await response.json()) as ClerkUser) }
}

async function list(fetchImpl: FetchLike, secret: string, filter: 'external_id' | 'email_address', value: string): Promise<ClerkUser[]> {
  const params = new URLSearchParams({ limit: '10' })
  params.append(filter, value)
  const response = await call(fetchImpl, secret, `/users?${params}`)
  if (!response.ok) throw new ClerkLinkError(`Clerk Production je odgovorio ${response.status}.`, 'request_failed')
  return (await response.json()) as ClerkUser[]
}

/**
 * The production user for one approved row. `externalId` is the old Development id, which makes the step
 * repeatable: a user created by an earlier run is found again instead of created twice.
 * An existing production user with the same e-mail but without that external id signed up on their own; the
 * script never takes them over (`email_taken`), that is the owner's manual path.
 */
export async function ensureProductionUser(
  productionKey: string | undefined,
  input: { email: string; externalId: string },
  fetchImpl: FetchLike = fetch
): Promise<{ id: string; created: boolean }> {
  const secret = requireKey(productionKey, 'sk_live_', 'Ključ Production instance')

  const known = (await list(fetchImpl, secret, 'external_id', input.externalId)).find((user) => user.external_id === input.externalId)
  if (known) return { id: known.id, created: false }

  const sameEmail = (await list(fetchImpl, secret, 'email_address', input.email)).filter((user) =>
    user.email_addresses?.some((item) => item.email_address.toLowerCase() === input.email.toLowerCase())
  )
  if (sameEmail.length > 0) {
    throw new ClerkLinkError(
      'U Production instanci već postoji korisnik sa tim mejlom koji nije napravljen ovom skriptom; povezivanje traži potvrdu vlasnika.',
      'email_taken'
    )
  }

  const response = await call(fetchImpl, secret, '/users', {
    method: 'POST',
    // No password: the user signs in with a code sent to this address, or sets a new password.
    body: { email_address: [input.email], external_id: input.externalId, skip_password_requirement: true },
  })
  const body = (await response.json().catch(() => ({}))) as ClerkUser & { errors?: Array<{ message?: string; code?: string }> }
  if (!response.ok || !body.id) {
    const detail = body.errors?.map((item) => item.code ?? item.message).filter(Boolean).join(', ') || 'bez poruke'
    throw new ClerkLinkError(`Clerk Production nije napravio korisnika (HTTP ${response.status}: ${detail}).`, 'request_failed')
  }
  return { id: body.id, created: true }
}
