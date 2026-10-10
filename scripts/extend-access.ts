/**
 * Owner tool for manual billing: after a payment shows on the bank statement, extend that company's access by
 * one calendar month (ROADMAP B9 until in-app payment exists). Rules in src/lib/access-period.ts
 * (planAccessExtension); the write and its trace in src/lib/access-extension.ts. Each payment is recorded in
 * access_extensions under its reference (predračun/faktura number), so the same payment never extends twice.
 *
 *   npm run access:extend -- <PIB | naziv | id> --ref <broj predračuna> --paid <GGGG-MM-DD>          # preview
 *   npm run access:extend -- <PIB | naziv | id> --ref <broj predračuna> --paid <GGGG-MM-DD> --yes    # apply
 *   npm run access:extend -- --list                                                                   # all companies
 *
 * --paid is the payment date from the bank statement, not the day "Plaćeno" was clicked in TradeMaster.
 * Uses DATABASE_URL from .env (production). Never run it for anyone who has not paid.
 */
import { existsSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { AccessExtensionError, applyAccessExtension, previewAccessExtension } from '../src/lib/access-extension'
import { accessStatus, formatAccessDate, isTrialPeriod } from '../src/lib/access-period'

if (existsSync('.env')) process.loadEnvFile('.env')
const prisma = new PrismaClient()

const USAGE = 'Upotreba: npm run access:extend -- <PIB | naziv | id> --ref <broj predračuna> --paid <GGGG-MM-DD> [--yes]'

const describe = (profile: { companyName: string | null; pib: string | null; createdAt: Date; accessExpiresAt: Date | null }) => {
  const status = accessStatus(profile.accessExpiresAt)
  const until = status.untilYmd ? formatAccessDate(status.untilYmd) : 'bez ograničenja'
  const kind = isTrialPeriod(profile.createdAt, profile.accessExpiresAt) ? 'probni' : 'pretplata'
  return `${profile.companyName ?? '(bez naziva)'} | PIB ${profile.pib ?? '-'} | ${kind} | do ${until} | stanje: ${status.state}`
}

const option = (args: string[], name: string) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

async function main() {
  const args = process.argv.slice(2)
  if (args[0] === '--list') {
    const profiles = await prisma.profile.findMany({
      orderBy: { createdAt: 'asc' },
      include: { accessExtensions: { orderBy: { createdAt: 'desc' }, take: 1, select: { reference: true, paidOn: true } } },
    })
    for (const profile of profiles) {
      const last = profile.accessExtensions[0]
      const paid = last ? ` | poslednja uplata ${last.reference} (${formatAccessDate(last.paidOn.toISOString().slice(0, 10))})` : ''
      console.log(`${profile.id} | ${describe(profile)}${paid}`)
    }
    return
  }

  const reference = option(args, '--ref')
  const paidOn = option(args, '--paid')
  const query = args.find((arg, index) => !arg.startsWith('--') && !['--ref', '--paid'].includes(args[index - 1]))
  if (!query || !reference || !paidOn) throw new Error(USAGE)
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
  const input = { profileId: profile.id, reference, paidOn }
  const preview = await previewAccessExtension(prisma, input)
  const { plan } = preview
  const how =
    plan.basis === 'continue'
      ? 'uplaćeno na vreme: mesec se nastavlja na stari datum isteka'
      : 'uplaćeno posle zaključavanja: mesec počinje danas'
  console.log(`Sada:   ${describe(profile)}`)
  console.log(`Uplata: ${preview.reference}, uplaćeno ${formatAccessDate(paidOn)} (po izvodu)`)
  console.log(`Posle:  pristup od ${formatAccessDate(plan.fromYmd)} do ${formatAccessDate(plan.untilYmd)} (jedan kalendarski mesec; ${how})`)
  if (!apply) {
    console.log('Ništa nije promenjeno. Dodajte --yes da primenite.')
    return
  }
  await applyAccessExtension(prisma, input)
  console.log(`Pristup je produžen do ${formatAccessDate(plan.untilYmd)} Uplata ${preview.reference} je zapisana i ne može se iskoristiti ponovo.`)
}

main()
  .catch((error) => {
    console.error(error instanceof AccessExtensionError || error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
