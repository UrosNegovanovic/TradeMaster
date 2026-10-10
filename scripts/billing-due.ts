/**
 * Owner's billing checklist (docs/billing-runbook.md): companies whose access ends within 7 days, that are in
 * the 2 grace days, or already read-only, with the e-mail for the predračun. Read-only, changes nothing.
 *
 *   npm run billing:due              # who needs a predračun / a reminder now
 *   npm run billing:due -- --all     # every company with an access date
 *
 * Uses DATABASE_URL from .env (production).
 */
import { existsSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { ACCESS_WARNING_DAYS, accessStatus, formatAccessDate, isTrialPeriod } from '../src/lib/access-period'

if (existsSync('.env')) process.loadEnvFile('.env')
const prisma = new PrismaClient()

const ACTION = {
  expiring: 'pošaljite predračun',
  grace: 'rok za uplatu teče, podsetite',
  expired: 'samo pregled; čeka uplatu',
  active: '-',
  unlimited: '-',
} as const

async function main() {
  const all = process.argv.includes('--all')
  const profiles = await prisma.profile.findMany({
    where: { accessExpiresAt: { not: null } },
    orderBy: { accessExpiresAt: 'asc' },
    select: { id: true, companyName: true, pib: true, contactEmail: true, createdAt: true, accessExpiresAt: true },
  })

  const rows = profiles
    .map((profile) => ({ profile, status: accessStatus(profile.accessExpiresAt) }))
    .filter(({ status }) => all || status.state === 'expiring' || status.state === 'grace' || status.state === 'expired')

  if (rows.length === 0) {
    console.log(`Nikome ne ističe pristup u narednih ${ACCESS_WARNING_DAYS} dana.`)
    return
  }
  for (const { profile, status } of rows) {
    const kind = isTrialPeriod(profile.createdAt, profile.accessExpiresAt) ? 'probni' : 'pretplata'
    const until = status.untilYmd ? formatAccessDate(status.untilYmd) : '-'
    const grace = status.graceUntilYmd ? `, rok za uplatu ${formatAccessDate(status.graceUntilYmd)}` : ''
    console.log(
      [
        profile.companyName ?? '(bez naziva)',
        `PIB ${profile.pib ?? '-'}`,
        profile.contactEmail ?? 'bez mejla (pogledajte Clerk)',
        `${kind} do ${until}${grace}`,
        ACTION[status.state],
      ].join(' | ')
    )
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
