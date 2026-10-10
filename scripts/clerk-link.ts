/**
 * Owner tool for the Clerk Development → Production cutover (ROADMAP A0.3, docs/identity-cutover-runbook.md).
 * A production identity is attached to an existing company only through a row the owner approved in the
 * account inventory (A0.1). Rules in src/lib/identity-link.ts, writes in src/lib/identity-link-db.ts,
 * Clerk calls in src/lib/identity-link-clerk.ts.
 *
 * Every step shows what it would do; it writes only with --yes.
 *
 *   npm run clerk:link -- --list <popis.xlsx>                                   # 1. plan (reads only)
 *   npm run clerk:link -- --list <popis.xlsx> --register --approved-by "<ime>"  # 2. record the approval
 *   npm run clerk:link -- --create-users [--email <profileId>=<mejl>]           # 3. users in Clerk Production
 *   npm run clerk:link -- --apply [--only <profileId>]                          # 4. hand the companies over
 *   npm run clerk:link -- --revert [--only <profileId>]                         #    rollback (A0.10)
 *   npm run clerk:link -- --status                                              #    where every row stands
 *
 * Add --names to print company names next to the ids.
 *
 * Database: DATABASE_URL from .env (production) unless IDENTITY_LINK_DATABASE_URL is set (the rehearsal copy);
 * the host is printed before anything else. Clerk keys: CLERK_SECRET_KEY must be the Development key
 * (sk_test_) and is only read; CLERK_PRODUCTION_SECRET_KEY (sk_live_) is needed only for --create-users.
 */
import { existsSync } from 'node:fs'
import { Prisma, PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'
import {
  nonCustomerProfileIds,
  parseApprovedList,
  planRegistration,
  productionEmailFor,
  type AccountClass,
  type PlanAction,
} from '../src/lib/identity-link'
import { developmentAccount, ensureProductionUser } from '../src/lib/identity-link-clerk'
import { IdentityLinkError, applyLink, attachProductionUser, registerLinks, revertLink } from '../src/lib/identity-link-db'

if (existsSync('.env')) process.loadEnvFile('.env')
const databaseUrl = process.env.IDENTITY_LINK_DATABASE_URL?.trim() || process.env.DATABASE_URL
const prisma = new PrismaClient(databaseUrl ? { datasourceUrl: databaseUrl } : undefined)

const USAGE = 'Upotreba: npm run clerk:link -- --list <popis.xlsx> | --create-users | --apply | --revert | --status  (vidi vrh skripte)'
const SHEET = 'Nalozi'

const args = process.argv.slice(2)
const has = (name: string) => args.includes(name)
const option = (name: string) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
const options = (name: string) => args.flatMap((arg, index) => (arg === name && args[index + 1] ? [args[index + 1]] : []))
const yes = has('--yes')

const ACTION_TEXT: Record<PlanAction, string> = {
  register: 'registrovati (prenosi se)',
  registered: 'već registrovan',
  not_transferred: 'ne prenosi se',
  undecided: 'NIJE ODLUČENO',
  refused: 'ODBIJENO',
}
const CLASS_TEXT: Record<AccountClass, string> = { REAL: 'stvarni', OWNER: 'vlasnički', DEMO: 'demo', TEST: 'testni' }

function databaseHost(): string {
  try {
    return new URL((databaseUrl ?? '').replace(/^postgres(ql)?:/, 'http:')).host || '(nepoznat)'
  } catch {
    return '(nepoznat)'
  }
}

async function companyNames(profileIds: string[]): Promise<Map<string, string>> {
  if (!has('--names') || profileIds.length === 0) return new Map()
  const profiles = await prisma.profile.findMany({ where: { id: { in: profileIds } }, select: { id: true, companyName: true } })
  return new Map(profiles.map((profile) => [profile.id, profile.companyName?.trim() || '(bez naziva)']))
}
const label = (names: Map<string, string>, profileId: string) => (names.has(profileId) ? `${profileId} ${names.get(profileId)}` : profileId)

function readList(path: string) {
  if (!existsSync(path)) throw new Error(`Fajl ne postoji: ${path}`)
  const workbook = XLSX.readFile(path)
  const sheet = workbook.Sheets[SHEET]
  if (!sheet) throw new Error(`U fajlu nema lista "${SHEET}".`)
  return parseApprovedList(XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null }))
}

/** The plan must be readable before the migration is approved: a missing table means "no links yet". */
async function existingLinks() {
  try {
    return await prisma.clerkIdentityLink.findMany({ select: { profileId: true, oldClerkUserId: true, newClerkUserId: true, status: true } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      console.log('Tabela veza još ne postoji u ovoj bazi (migracija nije primenjena): plan se prikazuje, registracija nije moguća.')
      return []
    }
    throw error
  }
}

async function planAndRegister(path: string) {
  const list = readList(path)
  const [profiles, links] = await Promise.all([
    prisma.profile.findMany({ select: { id: true, clerkUserId: true } }),
    existingLinks(),
  ])
  const plan = planRegistration(list, profiles, links)
  const names = await companyNames(plan.items.map((item) => item.profileId))

  const count = (action: PlanAction) => plan.items.filter((item) => item.action === action).length
  console.log(`Spisak: ${list.length} redova. Profila u bazi: ${profiles.length}.`)
  for (const action of Object.keys(ACTION_TEXT) as PlanAction[]) console.log(`  ${ACTION_TEXT[action]}: ${count(action)}`)

  for (const item of plan.items.filter((entry) => entry.action !== 'not_transferred')) {
    const klasa = item.accountClass ? CLASS_TEXT[item.accountClass] : '-'
    console.log(`  red ${item.line} | ${label(names, item.profileId)} | ${klasa} | ${ACTION_TEXT[item.action]}${item.reason ? ` (${item.reason})` : ''}`)
  }
  if (plan.profilesNotOnList.length > 0) {
    console.log(`Profili u bazi kojih nema na spisku (otvoreni posle popisa): ${plan.profilesNotOnList.length}`)
    for (const id of plan.profilesNotOnList) console.log(`  ${id}`)
  }
  const nonCustomers = nonCustomerProfileIds(list)
  console.log(`Profili koji nisu kupci (vlasnički, demo, testni): ${nonCustomers.length}`)
  console.log(`  za BILLING_EXCLUDE_PROFILE_IDS i PLATFORM_DEMO_PROFILE_IDS:\n  ${nonCustomers.join(',')}`)

  if (!has('--register')) return
  const blocking = count('undecided') + count('refused') + plan.profilesNotOnList.length
  if (blocking > 0) {
    throw new Error(`Registracija nije moguća: ${blocking} redova nije odlučeno, odbijeno je ili nije na spisku. Prvo dopunite popis.`)
  }
  const approvedBy = option('--approved-by')
  if (!approvedBy) throw new Error('Navedite ko je odobrio spisak: --approved-by "<ime>".')
  const registrations = plan.items
    .filter((item) => item.action === 'register')
    .map((item) => ({ profileId: item.profileId, oldClerkUserId: item.oldClerkUserId, accountClass: item.accountClass! }))
  if (!yes) {
    console.log(`\nBilo bi registrovano ${registrations.length} redova (odobrio: ${approvedBy}). Ništa nije upisano; dodajte --yes.`)
    return
  }
  const result = await registerLinks(prisma, registrations, approvedBy)
  console.log(`\nRegistrovano: ${result.created} novih, ${result.existing} već postojalo.`)
}

async function createUsers() {
  const overrides = new Map(
    options('--email').map((pair) => {
      const [profileId, email] = pair.split('=')
      if (!profileId || !email) throw new Error('--email se zadaje kao <profileId>=<mejl>.')
      return [profileId, email] as const
    })
  )
  const links = await prisma.clerkIdentityLink.findMany({ where: { newClerkUserId: null }, orderBy: { createdAt: 'asc' } })
  const names = await companyNames(links.map((link) => link.profileId))
  console.log(`Redova bez Production korisnika: ${links.length}.`)
  let failed = 0
  for (const link of links) {
    try {
      const old = await developmentAccount(process.env.CLERK_SECRET_KEY, link.oldClerkUserId)
      const email = productionEmailFor({
        accountClass: link.accountClass as AccountClass,
        developmentEmail: old.email,
        developmentEmailVerified: old.verified,
        override: overrides.get(link.profileId),
      })
      if (!email.ok) throw new Error(email.reason)
      if (!yes) {
        console.log(`  ${label(names, link.profileId)} | bio bi napravljen Production korisnik (${overrides.has(link.profileId) ? 'zadat mejl' : 'mejl starog naloga'})`)
        continue
      }
      const user = await ensureProductionUser(process.env.CLERK_PRODUCTION_SECRET_KEY, { email: email.email, externalId: link.oldClerkUserId })
      await attachProductionUser(prisma, link.profileId, user.id)
      console.log(`  ${label(names, link.profileId)} | ${user.created ? 'napravljen' : 'već postojao'} | ${user.id}`)
    } catch (error) {
      failed += 1
      console.log(`  ${label(names, link.profileId)} | NIJE URAĐENO: ${error instanceof Error ? error.message : error}`)
    }
  }
  if (!yes && links.length > 0) console.log('Ništa nije napravljeno; dodajte --yes.')
  if (failed > 0) process.exitCode = 1
}

async function applyOrRevert(mode: 'apply' | 'revert') {
  const only = option('--only')
  const links = await prisma.clerkIdentityLink.findMany({
    where: { ...(only ? { profileId: only } : {}), status: mode === 'apply' ? { in: ['PENDING', 'REVERTED'] } : 'LINKED' },
    orderBy: { createdAt: 'asc' },
  })
  const names = await companyNames(links.map((link) => link.profileId))
  console.log(`${mode === 'apply' ? 'Za povezivanje' : 'Za vraćanje'}: ${links.length} redova.`)
  const missing = mode === 'apply' ? links.filter((link) => !link.newClerkUserId) : []
  if (missing.length > 0) {
    throw new Error(`${missing.length} redova još nema Production korisnika; prvo --create-users. Ništa nije promenjeno.`)
  }
  if (!yes) {
    for (const link of links) console.log(`  ${label(names, link.profileId)} | ${mode === 'apply' ? `${link.oldClerkUserId} → ${link.newClerkUserId}` : `${link.newClerkUserId} → ${link.oldClerkUserId}`}`)
    if (links.length > 0) console.log('Ništa nije promenjeno; dodajte --yes.')
    return
  }
  let failed = 0
  for (const link of links) {
    try {
      const outcome = mode === 'apply' ? await applyLink(prisma, link.profileId) : (await revertLink(prisma, link.profileId), 'reverted')
      console.log(`  ${label(names, link.profileId)} | ${outcome}`)
    } catch (error) {
      failed += 1
      console.log(`  ${label(names, link.profileId)} | NIJE URAĐENO: ${error instanceof Error ? error.message : error}`)
    }
  }
  console.log(`Gotovo: ${links.length - failed} urađeno, ${failed} odbijeno.`)
  if (failed > 0) process.exitCode = 1
}

async function status() {
  const links = await prisma.clerkIdentityLink.findMany({ orderBy: { createdAt: 'asc' }, include: { profile: { select: { clerkUserId: true } } } })
  const names = await companyNames(links.map((link) => link.profileId))
  console.log(`Redova u tabeli veza: ${links.length}.`)
  for (const link of links) {
    const holds = link.profile.clerkUserId === link.newClerkUserId ? 'novi id' : link.profile.clerkUserId === link.oldClerkUserId ? 'stari id' : 'NEKI TREĆI ID'
    console.log(`  ${label(names, link.profileId)} | ${CLASS_TEXT[link.accountClass as AccountClass] ?? link.accountClass} | ${link.status} | profil ima: ${holds} | Production korisnik: ${link.newClerkUserId ?? 'još nema'}`)
  }
}

async function main() {
  console.log(`Baza: ${databaseHost()}${process.env.IDENTITY_LINK_DATABASE_URL ? ' (IDENTITY_LINK_DATABASE_URL)' : ' (DATABASE_URL)'}`)
  const listPath = option('--list')
  if (listPath) return planAndRegister(listPath)
  if (has('--create-users')) return createUsers()
  if (has('--apply')) return applyOrRevert('apply')
  if (has('--revert')) return applyOrRevert('revert')
  if (has('--status')) return status()
  console.log(USAGE)
  process.exitCode = 1
}

main()
  .catch((error) => {
    console.error(error instanceof IdentityLinkError || error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
