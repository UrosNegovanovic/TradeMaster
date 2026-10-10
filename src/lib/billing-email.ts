/**
 * Outbound e-mail for billing (Resend HTTP API, no SDK) and the recipient lookup (Clerk Backend API).
 * Env:
 *   RESEND_API_KEY        Resend API key (resend.com → API Keys). Without it nothing is sent.
 *   BILLING_EMAIL_FROM    Sender, e.g. "TradeMaster <racuni@trademaster.rs>" once the domain is verified in Resend.
 *                         Until then Resend's test sender, which only delivers to the Resend account's own address.
 *   BILLING_EMAIL_BCC     Owner's copy of every e-mail (comma-separated allowed).
 *   BILLING_EMAIL_REPLY_TO Where customers' replies go (the owner's inbox).
 */

export const RESEND_TEST_SENDER = 'TradeMaster <onboarding@resend.dev>'

export type OutgoingEmail = {
  to: string
  subject: string
  text: string
  html: string
  /** Same key → Resend sends at most once (24 h), so a retried job never sends twice. */
  idempotencyKey: string
  /** false: no owner copy (the e-mail already goes only to the owner: test run or BILLING_AUTO_SEND off). */
  ownerCopy?: boolean
}

export type SendResult = { id: string }
export type Mailer = (email: OutgoingEmail) => Promise<SendResult>

const list = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

/** BILLING_EMAIL_BCC as a list: the owner's address(es). */
export function ownerAddresses(env: NodeJS.ProcessEnv = process.env): string[] {
  return list(env.BILLING_EMAIL_BCC)
}

export function resendMailer(env: NodeJS.ProcessEnv = process.env, fetchImpl: typeof fetch = fetch): Mailer {
  const apiKey = env.RESEND_API_KEY?.trim()
  if (!apiKey) throw new Error('RESEND_API_KEY nije podešen: mejl se ne može poslati.')
  const from = env.BILLING_EMAIL_FROM?.trim() || RESEND_TEST_SENDER
  const bcc = list(env.BILLING_EMAIL_BCC)
  const replyTo = list(env.BILLING_EMAIL_REPLY_TO)

  return async (email) => {
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'idempotency-key': email.idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: [email.to],
        ...(bcc.length && email.ownerCopy !== false ? { bcc } : {}),
        ...(replyTo.length ? { reply_to: replyTo } : {}),
        subject: email.subject,
        text: email.text,
        html: email.html,
        tags: [{ name: 'category', value: 'predracun' }],
      }),
      signal: AbortSignal.timeout(15_000),
    })
    const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string }
    if (!response.ok || !body.id) {
      throw new Error(`Resend je odbio mejl (HTTP ${response.status}): ${body.message ?? 'bez poruke'}`)
    }
    return { id: body.id }
  }
}

/** Primary e-mail of a Clerk user (the address they signed up with). Null when it cannot be read. */
export async function clerkPrimaryEmail(
  clerkUserId: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch
): Promise<string | null> {
  const secret = env.CLERK_SECRET_KEY?.trim()
  if (!secret || !/^user_[A-Za-z0-9]+$/.test(clerkUserId)) return null
  const response = await fetchImpl(`https://api.clerk.com/v1/users/${clerkUserId}`, {
    headers: { authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) return null
  const user = (await response.json()) as {
    primary_email_address_id?: string | null
    email_addresses?: Array<{ id: string; email_address: string }>
  }
  const primary = user.email_addresses?.find((item) => item.id === user.primary_email_address_id)
  return primary?.email_address ?? user.email_addresses?.[0]?.email_address ?? null
}
