/**
 * The daily billing job by hand (the same code as /api/cron/billing): predračuni for companies whose access ends
 * within 7 days, issued in the owner's account and e-mailed. Without --send it only shows what would happen.
 *
 *   npm run billing:send                                   # dry run: who would get a predračun, nothing changes
 *   npm run billing:send -- --send                         # issue and send
 *   npm run billing:send -- --only <PIB | id> [--send]     # one company
 *   npm run billing:send -- --only <PIB> --to <mejl> --send  # test: deliver to this address instead
 *
 * Needs BILLING_ISSUER_PROFILE_ID (and RESEND_API_KEY, CLERK_SECRET_KEY for --send) in .env.
 * Uses DATABASE_URL from .env (production).
 */
import { existsSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { formatAccessDate } from '../src/lib/access-period'
import { clerkPrimaryEmail, resendMailer } from '../src/lib/billing-email'
import { runBilling } from '../src/lib/billing-run'
import { fetchEurRate } from '../src/lib/nbs-rate'
import { absoluteUrl } from '../src/lib/site-url'

if (existsSync('.env')) process.loadEnvFile('.env')
const prisma = new PrismaClient()

const option = (args: string[], name: string) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

const LABEL = {
  sent: 'POSLATO',
  would_send: 'bi bilo poslato',
  already_sent: 'već poslato ranije',
  in_progress: 'drugo pokretanje upravo šalje',
  no_email: 'NEMA MEJLA',
  failed: 'GREŠKA',
} as const

async function main() {
  const args = process.argv.slice(2)
  const send = args.includes('--send')
  const issuerProfileId = process.env.BILLING_ISSUER_PROFILE_ID?.trim()
  if (!issuerProfileId) throw new Error('Postavite BILLING_ISSUER_PROFILE_ID u .env (id profila T&G Nest).')

  const only = option(args, '--only')
  let onlyProfileId: string | undefined
  if (only) {
    const match = await prisma.profile.findMany({ where: { OR: [{ id: only }, { pib: only }] }, select: { id: true } })
    if (match.length !== 1) throw new Error(`--only ${only}: ${match.length === 0 ? 'nema' : 'više'} firmi.`)
    onlyProfileId = match[0].id
  }
  const to = option(args, '--to')

  const items = await runBilling({
    db: prisma,
    issuerProfileId,
    send,
    getRate: () => fetchEurRate(),
    mailer: send ? resendMailer() : undefined,
    lookupEmail: (clerkUserId) => clerkPrimaryEmail(clerkUserId),
    linkFor: (path) => absoluteUrl(path),
    onlyProfileId,
    recipientOverride: to,
  })

  if (items.length === 0) console.log('Danas nikome ne treba predračun.')
  for (const item of items) {
    console.log(
      [
        item.company,
        `ističe ${formatAccessDate(item.expiryYmd)}`,
        `period ${formatAccessDate(item.periodFromYmd)} - ${formatAccessDate(item.periodUntilYmd)}`,
        item.recipient ?? '-',
        item.invoiceNumber ? `predračun ${item.invoiceNumber}` : null,
        item.totalAmount ? `${item.totalAmount} RSD` : null,
        LABEL[item.outcome],
        item.error ?? null,
      ]
        .filter(Boolean)
        .join(' | ')
    )
  }
  if (!send && items.some((item) => item.outcome === 'would_send')) console.log('Ništa nije poslato. Dodajte --send da pošaljete.')
  if (items.some((item) => item.outcome === 'failed')) process.exitCode = 1
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
