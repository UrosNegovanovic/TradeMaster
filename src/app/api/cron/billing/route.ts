import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clerkPrimaryEmail, resendMailer } from '@/lib/billing-email'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { runBilling } from '@/lib/billing-run'
import { fetchEurRate } from '@/lib/nbs-rate'
import { absoluteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Daily billing job, called by Vercel Cron (vercel.json) with `Authorization: Bearer $CRON_SECRET`.
 * Sends predračuni only when BILLING_AUTO_SEND=on; otherwise a dry run that changes nothing.
 * No Clerk session: the shared secret is the authentication (route-access.ts lists it).
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const issuerProfileId = process.env.BILLING_ISSUER_PROFILE_ID?.trim()
  if (!issuerProfileId) {
    return NextResponse.json({ error: 'BILLING_ISSUER_PROFILE_ID is not set' }, { status: 503 })
  }
  const send = process.env.BILLING_AUTO_SEND === 'on'

  try {
    const items = await runBilling({
      db: prisma,
      issuerProfileId,
      send,
      getRate: () => fetchEurRate(),
      mailer: send ? resendMailer() : undefined,
      lookupEmail: (clerkUserId) => clerkPrimaryEmail(clerkUserId),
      linkFor: (path) => absoluteUrl(path),
    })
    const summary = items.reduce<Record<string, number>>((counts, item) => {
      counts[item.outcome] = (counts[item.outcome] ?? 0) + 1
      return counts
    }, {})
    // Logged for Vercel → Logs; no e-mail addresses or company names.
    console.info('billing cron', JSON.stringify({ send, summary }))
    const failed = items.filter((item) => item.outcome === 'failed')
    return NextResponse.json(
      {
        send,
        summary,
        failed: failed.map((item) => ({ profileId: item.profileId, error: item.error })),
      },
      { status: failed.length ? 207 : 200 }
    )
  } catch (error) {
    console.error('billing cron failed', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Billing run failed' }, { status: 500 })
  }
}
