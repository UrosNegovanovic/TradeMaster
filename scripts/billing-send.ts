/**
 * The daily billing job by hand (the same code as /api/cron/billing): predračuni for companies whose access ends
 * within 7 days, issued in the owner's (T&G Nest) account and e-mailed. Without --send or --test nothing changes.
 *
 *   npm run billing:send                                       # dry run: who would get a predračun
 *   npm run billing:send -- --send                             # like the cron: customers only with
 *                                                              #   BILLING_AUTO_SEND=on, otherwise only you (BCC)
 *   npm run billing:send -- --only <PIB | id> [--send]         # one company
 *   npm run billing:send -- --test --only <PIB> --to <mejl>    # test: next month's predračun of one company,
 *                                                              #   marked "TEST, ne plaćati", only to --to
 *
 * --test refuses to run without both --only and --to, ignores BILLING_AUTO_SEND and never reaches the customer.
 * Needs BILLING_ISSUER_PROFILE_ID (and RESEND_API_KEY, CLERK_SECRET_KEY to send) in .env.
 * Uses DATABASE_URL from .env (production).
 */
import { existsSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { formatAccessDate } from '../src/lib/access-period'
import { clerkPrimaryEmail, ownerAddresses, resendMailer } from '../src/lib/billing-email'
import { chooseDelivery, runBilling } from '../src/lib/billing-run'
import { fetchEurRate } from '../src/lib/nbs-rate'
import { absoluteUrl } from '../src/lib/site-url'

if (existsSync('.env')) process.loadEnvFile('.env')
const prisma = new PrismaClient()

const option = (args: string[], name: string) => {
  const index = args.indexOf(name)
  const value = index >= 0 ? args[index + 1] : undefined
  return value && !value.startsWith('--') ? value : undefined
}

const LABEL = {
  sent: 'POSLATO',
  would_send: 'bi bilo poslato',
  already_sent: 'već poslato ranije',
  in_progress: 'drugo pokretanje upravo šalje',
  no_email: 'NEMA MEJLA',
  failed: 'GREŠKA',
} as const

const WHERE = {
  dry: 'probno, ništa se ne šalje',
  customer: 'kupcima (BILLING_AUTO_SEND=on)',
  owner: 'samo vama (BILLING_AUTO_SEND isključen)',
  test: 'TEST, samo na --to',
} as const

async function main() {
  const args = process.argv.slice(2)
  const only = option(args, '--only')
  const to = option(args, '--to')
  const test = args.includes('--test')
  if (to && !test) throw new Error('--to radi samo uz --test.')

  // Checked before anything else: a test must never reach a customer.
  const delivery = test
    ? chooseDelivery({ autoSend: undefined, ownerAddresses: [], test: { only, to } })
    : args.includes('--send')
      ? chooseDelivery({ autoSend: process.env.BILLING_AUTO_SEND, ownerAddresses: ownerAddresses() })
      : ({ kind: 'dry' } as const)

  const issuerProfileId = process.env.BILLING_ISSUER_PROFILE_ID?.trim()
  if (!issuerProfileId) throw new Error('Postavite BILLING_ISSUER_PROFILE_ID u .env (id profila T&G Nest).')

  let onlyProfileId: string | undefined
  if (only) {
    const match = await prisma.profile.findMany({ where: { OR: [{ id: only }, { pib: only }] }, select: { id: true } })
    if (match.length !== 1) throw new Error(`--only ${only}: ${match.length === 0 ? 'nema' : 'više'} firmi.`)
    onlyProfileId = match[0].id
  }

  console.log(`Slanje: ${WHERE[delivery.kind]}`)
  const items = await runBilling({
    db: prisma,
    issuerProfileId,
    delivery,
    getRate: () => fetchEurRate(),
    mailer: delivery.kind === 'dry' ? undefined : resendMailer(),
    lookupEmail: (clerkUserId) => clerkPrimaryEmail(clerkUserId),
    linkFor: (path) => absoluteUrl(path),
    onlyProfileId,
    excludeProfileIds: (process.env.BILLING_EXCLUDE_PROFILE_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean),
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
  if (delivery.kind === 'dry' && items.some((item) => item.outcome === 'would_send')) {
    console.log('Ništa nije poslato. Dodajte --send (ili --test --only <PIB> --to <mejl> za probu).')
  }
  if (items.some((item) => item.outcome === 'failed')) process.exitCode = 1
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
