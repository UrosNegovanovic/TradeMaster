/**
 * Owner's billing checklist (docs/billing-runbook.md), run every working day: companies whose access ends within
 * PREDRACUN_LEAD_DAYS (so the predračun goes out at least ACCESS_WARNING_DAYS before expiry, even after a
 * weekend or a holiday), companies in the 2 grace days and read-only ones, with the e-mail for the predračun and
 * the month the predračun should name, and whether the automatic predračun (billing:send / daily cron) went out.
 * Read-only, changes nothing.
 *
 *   npm run billing:due              # who needs a predračun / a reminder now
 *   npm run billing:due -- --all     # every company with an access date
 *
 * Uses DATABASE_URL from .env (production).
 */
import { existsSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { ACCESS_WARNING_DAYS, accessStatus, formatAccessDate, isTrialPeriod, planAccessExtension } from '../src/lib/access-period'
import { addLocalDays, formatLocalYmd } from '../src/lib/local-date'

if (existsSync('.env')) process.loadEnvFile('.env')
const prisma = new PrismaClient()

/** Listed this many days ahead: 7 days of notice + up to 3 days of weekend/holiday before the next run. */
const PREDRACUN_LEAD_DAYS = ACCESS_WARNING_DAYS + 3

async function main() {
  const all = process.argv.includes('--all')
  const profiles = await prisma.profile.findMany({
    where: { accessExpiresAt: { not: null } },
    orderBy: { accessExpiresAt: 'asc' },
    select: {
      id: true,
      companyName: true,
      pib: true,
      contactEmail: true,
      createdAt: true,
      accessExpiresAt: true,
      accessExtensions: { orderBy: { createdAt: 'desc' }, take: 1, select: { anchorDay: true, newExpiresAt: true } },
      billingNotices: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { periodFrom: true, status: true, invoiceNumber: true, recipient: true, sentAt: true, error: true },
      },
    },
  })

  const today = formatLocalYmd(new Date())
  const rows = profiles
    .map((profile) => ({ profile, status: accessStatus(profile.accessExpiresAt) }))
    .filter(({ status }) => all || status.state !== 'active' || (status.daysLeft ?? Infinity) <= PREDRACUN_LEAD_DAYS)
    .filter(({ status }) => status.state !== 'unlimited')

  if (rows.length === 0) {
    console.log(`Nikome ne ističe pristup u narednih ${PREDRACUN_LEAD_DAYS} dana.`)
    return
  }
  for (const { profile, status } of rows) {
    const kind = isTrialPeriod(profile.createdAt, profile.accessExpiresAt) ? 'probni' : 'pretplata'
    const until = status.untilYmd ? formatAccessDate(status.untilYmd) : '-'
    const grace = status.graceUntilYmd ? `, rok za uplatu ${formatAccessDate(status.graceUntilYmd)}` : ''
    let action = '-'
    if (status.state === 'active' || status.state === 'expiring') {
      const sendBy = formatLocalYmd(addLocalDays(profile.accessExpiresAt!, -ACCESS_WARNING_DAYS))
      const last = profile.accessExtensions[0]
      const anchorDay = last && last.newExpiresAt.getTime() === profile.accessExpiresAt!.getTime() ? last.anchorDay : null
      const next = planAccessExtension({ expiresAt: profile.accessExpiresAt, paidOn: today, anchorDay })
      const period = `period na predračunu: ${formatAccessDate(next.fromYmd)} - ${formatAccessDate(next.untilYmd)}`
      const notice = profile.billingNotices[0]
      const forThisMonth = notice && notice.periodFrom.toISOString().slice(0, 10) === next.fromYmd ? notice : null
      if (forThisMonth?.status === 'sent') {
        const sentOn = forThisMonth.sentAt ? formatAccessDate(formatLocalYmd(forThisMonth.sentAt)) : '-'
        action = `predračun ${forThisMonth.invoiceNumber} poslat ${sentOn} na ${forThisMonth.recipient}`
      } else if (forThisMonth) {
        action = `SLANJE NIJE USPELO (${forThisMonth.invoiceNumber ?? 'bez predračuna'}): ${forThisMonth.error ?? forThisMonth.status}`
      } else {
        action = `${sendBy < today ? 'predračun kasni, pošaljite odmah' : `predračun najkasnije ${formatAccessDate(sendBy)} (automatski)`} (${period})`
      }
    } else if (status.state === 'grace') {
      action = 'rok za uplatu teče, podsetite'
    } else if (status.state === 'expired') {
      action = 'samo pregled; čeka uplatu'
    }
    console.log(
      [
        profile.companyName ?? '(bez naziva)',
        `PIB ${profile.pib ?? '-'}`,
        profile.contactEmail ?? 'bez mejla (pogledajte Clerk)',
        `${kind} do ${until}${grace}`,
        action,
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
