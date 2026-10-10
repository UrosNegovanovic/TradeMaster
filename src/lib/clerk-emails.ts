/**
 * Sign-in e-mails of many Clerk users at once (Clerk Backend API, no SDK), for the owner panel's accounts list
 * (ROADMAP O3). One request per CLERK_BATCH users. Throws when Clerk is not configured or does not answer, so
 * the caller can show the list without e-mails instead of with wrong ones.
 */

/** Clerk accepts up to 100 `user_id` filters per request. */
export const CLERK_BATCH = 100

type ClerkUser = {
  id: string
  primary_email_address_id?: string | null
  email_addresses?: Array<{ id: string; email_address: string }>
}

/** Clerk user id → primary e-mail. Users Clerk does not know, or without an address, are simply missing. */
export async function clerkPrimaryEmails(
  clerkUserIds: string[],
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch
): Promise<Map<string, string>> {
  const secret = env.CLERK_SECRET_KEY?.trim()
  if (!secret) throw new Error('CLERK_SECRET_KEY is not set')

  const ids = Array.from(new Set(clerkUserIds)).filter((id) => /^user_[A-Za-z0-9]+$/.test(id))
  const emails = new Map<string, string>()
  for (let start = 0; start < ids.length; start += CLERK_BATCH) {
    const params = new URLSearchParams({ limit: String(CLERK_BATCH) })
    for (const id of ids.slice(start, start + CLERK_BATCH)) params.append('user_id', id)
    const response = await fetchImpl(`https://api.clerk.com/v1/users?${params}`, {
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error(`Clerk answered ${response.status}`)
    for (const user of (await response.json()) as ClerkUser[]) {
      const primary = user.email_addresses?.find((item) => item.id === user.primary_email_address_id)
      const email = primary?.email_address ?? user.email_addresses?.[0]?.email_address
      if (email) emails.set(user.id, email)
    }
  }
  return emails
}
