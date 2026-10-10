/**
 * Owner tool for manual billing: after a customer paid, extend their access by 30 days (ROADMAP B9 until
 * in-app payment exists). Rules in src/lib/access-period.ts (extendAccessAfterPayment): paid before
 * read-only → the month continues from the old expiry day; paid after → the month starts today.
 *
 *   npx tsx scripts/extend-access.ts <PIB | company name | profile id>            # shows what would change
 *   npx tsx scripts/extend-access.ts <PIB | company name | profile id> --yes      # applies it
 *   npx tsx scripts/extend-access.ts --list                                       # companies and their access
 *
 * Uses DATABASE_URL from .env (production). Never run it for anyone who has not paid.
 */
import { existsSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { accessStatus, extendAccessAfterPayment, formatAccessDate, isTrialPeriod } from '../src/lib/access-period'
import { formatLocalYmd } from '../src/lib/local-date'

if (existsSync('.env')) process.loadEnvFile('.env')
const prisma = new PrismaClient()

const describe = (profile: { companyName: string | null; pib: string | null; createdAt: Date; accessExpiresAt: Date | null }) => {
  const status = accessStatus(profile.accessExpiresAt)
  const until = status.untilYmd ? formatAccessDate(status.untilYmd) : 'bez ograničenja'
  const kind = isTrialPeriod(profile.createdAt, profile.accessExpiresAt) ? 'probni' : 'pretplata'
  return `${profile.companyName ?? '(bez naziva)'} | PIB ${profile.pib ?? '-'} | ${kind} | do ${until} | stanje: ${status.state}`
}

async function main() {
  const args = process.argv.slice(2)
  if (args[0] === '--list') {
    const profiles = await prisma.profile.findMany({ orderBy: { createdAt: 'asc' } })
    for (const profile of profiles) console.log(`${profile.id} | ${describe(profile)}`)
    return
  }

  const query = args.find((arg) => !arg.startsWith('--'))
  if (!query) throw new Error('Navedite PIB, naziv firme ili id profila (ili --list).')
  const apply = args.includes('--yes')

  const matches = await prisma.profile.findMany({
    where: { OR: [{ id: query }, { pib: query }, { companyName: { contains: query, mode: 'insensitive' } }] },
  })
  if (matches.length !== 1) {
    console.log(matches.length === 0 ? 'Nijedna firma ne odgovara.' : 'Više firmi odgovara, navedite PIB ili id:')
    for (const profile of matches) console.log(`  ${profile.id} | ${describe(profile)}`)
    process.exitCode = 1
    return
  }

  const profile = matches[0]
  const next = extendAccessAfterPayment(profile.accessExpiresAt)
  console.log(`Sada:  ${describe(profile)}`)
  console.log(`Posle: pristup do ${formatAccessDate(formatLocalYmd(next))} (30 dana)`)
  if (!apply) {
    console.log('Ništa nije promenjeno. Dodajte --yes da primenite.')
    return
  }
  await prisma.profile.update({ where: { id: profile.id }, data: { accessExpiresAt: next } })
  console.log('Pristup je produžen.')
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
