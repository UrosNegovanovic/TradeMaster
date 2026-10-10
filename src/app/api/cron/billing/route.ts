import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clerkPrimaryEmail, ownerAddresses, resendMailer } from '@/lib/billing-email'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { chooseDelivery, runBilling } from '@/lib/billing-run'
import { fetchEurRate } from '@/lib/nbs-rate'
import { absoluteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const excludedProfiles = () =>
  (process.env.BILLING_EXCLUDE_PROFILE_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean)

/**
 * Daily billing job, called by Vercel Cron (vercel.json) with `Authorization: Bearer $CRON_SECRET`.
 * Customers get e-mail only when BILLING_AUTO_SEND=on. Off (default): the predračun goes only to the owner
 * (BILLING_EMAIL_BCC), or, without that address, nothing is written or sent.
 * No Clerk session: the shared secret is the authentication (route-access.ts lists it); anything else is 401.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const issuerProfileId = process.env.BILLING_ISSUER_PROFILE_ID?.trim()
  if (!issuerProfileId) {
    return NextResponse.json({ error: 'BILLING_ISSUER_PROFILE_ID is not set' }, { status: 503 })
  }
  const delivery = chooseDelivery({ autoSend: process.env.BILLING_AUTO_SEND, ownerAddresses: ownerAddresses() })

  try {
    const items = await runBilling({
      db: prisma,
      issuerProfileId,
      delivery,
      getRate: () => fetchEurRate(),
      mailer: delivery.kind === 'dry' ? undefined : resendMailer(),
      excludeProfileIds: excludedProfiles(),
      lookupEmail: (clerkUserId) => clerkPrimaryEmail(clerkUserId),
      linkFor: (path) => absoluteUrl(path),
    })
    const summary = items.reduce<Record<string, number>>((counts, item) => {
      counts[item.outcome] = (counts[item.outcome] ?? 0) + 1
      return counts
    }, {})
    // Logged for Vercel → Logs; no e-mail addresses or company names.
    console.info('billing cron', JSON.stringify({ delivery: delivery.kind, summary }))
    const failed = items.filter((item) => item.outcome === 'failed')
    return NextResponse.json(
      {
        delivery: delivery.kind,
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
