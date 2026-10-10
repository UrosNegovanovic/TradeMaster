/**
 * Clerk Development → Production cutover (ROADMAP A0.3): pure rules. No database, no network.
 *
 * A production identity is attached to an existing profile only through a row the owner approved in the account
 * inventory (A0.1), never because somebody typed the same e-mail at sign-up. This module reads that list,
 * checks it against the profiles as they are now, and says what may be registered.
 */

export const ACCOUNT_CLASSES = ['REAL', 'OWNER', 'DEMO', 'TEST'] as const
export type AccountClass = (typeof ACCOUNT_CLASSES)[number]

/** The words the owner picks in the inventory workbook. */
const CLASS_BY_WORD: Record<string, AccountClass> = {
  stvarni: 'REAL',
  vlasnički: 'OWNER',
  vlasnicki: 'OWNER',
  demo: 'DEMO',
  testni: 'TEST',
}

/** Column headers of the "Nalozi" sheet (A0.1). */
export const LIST_COLUMNS = {
  profileId: 'Profile ID',
  oldClerkUserId: 'Clerk user ID (stari)',
  accountClass: 'KLASA',
  transfer: 'PRENOSI SE',
} as const

export type ApprovedRow = {
  /** Row number in the workbook (header is 1), for messages. */
  line: number
  profileId: string
  oldClerkUserId: string
  /** Null when the cell is empty or not one of the four words. */
  accountClass: AccountClass | null
  /** Null when the cell is empty or not "da" / "ne". */
  transfer: boolean | null
}

const text = (value: unknown) => (value === null || value === undefined ? '' : String(value).trim())

/** Reads the rows of the inventory sheet; rows without a profile id (empty lines) are ignored. */
export function parseApprovedList(rows: Array<Record<string, unknown>>): ApprovedRow[] {
  return rows
    .map((row, index) => {
      const transfer = text(row[LIST_COLUMNS.transfer]).toLowerCase()
      return {
        line: index + 2,
        profileId: text(row[LIST_COLUMNS.profileId]),
        oldClerkUserId: text(row[LIST_COLUMNS.oldClerkUserId]),
        accountClass: CLASS_BY_WORD[text(row[LIST_COLUMNS.accountClass]).toLowerCase()] ?? null,
        transfer: transfer === 'da' ? true : transfer === 'ne' ? false : null,
      }
    })
    .filter((row) => row.profileId !== '')
}

export type ProfileIdentity = { id: string; clerkUserId: string }
export type ExistingLink = {
  profileId: string
  oldClerkUserId: string
  newClerkUserId: string | null
  status: string
}

export type PlanAction =
  /** Approved to carry over, not registered yet. */
  | 'register'
  /** Already has a link row. */
  | 'registered'
  /** The owner decided it is not carried over: it gets no link and nothing else happens to it. */
  | 'not_transferred'
  /** Class or decision is missing: nothing is done until the owner fills it in. */
  | 'undecided'
  /** The row does not match the database; see `reason`. */
  | 'refused'

export type PlanItem = {
  line: number
  profileId: string
  oldClerkUserId: string
  accountClass: AccountClass | null
  action: PlanAction
  reason?: string
}

export type RegistrationPlan = {
  items: PlanItem[]
  /** Profiles in the database that the list does not mention (opened after the inventory). */
  profilesNotOnList: string[]
}

const CLERK_USER_ID = /^user_[A-Za-z0-9]+$/

/**
 * What each row of the approved list means against the profiles as they are now. Changes nothing.
 * A row is refused when the profile is gone, appears twice, or no longer has the Clerk id it had at the
 * inventory (somebody changed it since, so the approval no longer describes this profile).
 */
export function planRegistration(
  list: ApprovedRow[],
  profiles: ProfileIdentity[],
  links: ExistingLink[] = []
): RegistrationPlan {
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const linkByProfile = new Map(links.map((link) => [link.profileId, link]))
  const times = (values: string[]) => values.reduce((count, value) => count.set(value, (count.get(value) ?? 0) + 1), new Map<string, number>())
  const profileTimes = times(list.map((row) => row.profileId))
  const oldIdTimes = times(list.map((row) => row.oldClerkUserId))

  const items = list.map((row): PlanItem => {
    const base = { line: row.line, profileId: row.profileId, oldClerkUserId: row.oldClerkUserId, accountClass: row.accountClass }
    const refuse = (reason: string): PlanItem => ({ ...base, action: 'refused', reason })

    if ((profileTimes.get(row.profileId) ?? 0) > 1) return refuse('Isti profil je na spisku više puta.')
    if ((oldIdTimes.get(row.oldClerkUserId) ?? 0) > 1) return refuse('Isti Clerk id je na spisku više puta.')
    const profile = profileById.get(row.profileId)
    if (!profile) return refuse('Profil sa ovim id-jem ne postoji u bazi.')
    if (!CLERK_USER_ID.test(row.oldClerkUserId)) return refuse('Clerk id na spisku nije ispravan.')

    const link = linkByProfile.get(row.profileId)
    if (link) {
      if (link.oldClerkUserId !== row.oldClerkUserId) return refuse('Profil je već registrovan sa drugim starim Clerk id-jem.')
      return { ...base, action: 'registered', reason: `stanje veze: ${link.status}` }
    }
    if (profile.clerkUserId !== row.oldClerkUserId) {
      return refuse('Clerk id profila se promenio posle popisa; popis za ovaj red treba ponoviti.')
    }
    if (row.accountClass === null || row.transfer === null) {
      return { ...base, action: 'undecided', reason: row.accountClass === null ? 'Nije upisana klasa.' : 'Nije odlučeno da li se prenosi.' }
    }
    return { ...base, action: row.transfer ? 'register' : 'not_transferred' }
  })

  const listed = new Set(list.map((row) => row.profileId))
  return { items, profilesNotOnList: profiles.filter((profile) => !listed.has(profile.id)).map((profile) => profile.id) }
}

/**
 * Profiles that are not customers by the owner's classification (owner's own, demo, test): the ids for
 * BILLING_EXCLUDE_PROFILE_IDS and PLATFORM_DEMO_PROFILE_IDS. Undecided rows are not included.
 */
export function nonCustomerProfileIds(list: ApprovedRow[]): string[] {
  return list.filter((row) => row.accountClass !== null && row.accountClass !== 'REAL').map((row) => row.profileId)
}

/** Addresses that only work in a Clerk Development instance or cannot receive mail at all. */
export function isTestAddress(email: string): boolean {
  return /(\+clerk_test@|@example\.(com|org|net)$|\.test$|\.invalid$|\.example$)/i.test(email.trim())
}

export type ProductionEmailResult = { ok: true; email: string } | { ok: false; reason: string }

/**
 * Which e-mail the production user is created with.
 * - A real customer: always the verified e-mail of the Development account; an override is refused, so a
 *   customer's company can never be handed to an address somebody typed.
 * - The owner's own, demo and test accounts: the owner may give another address (their Development address
 *   is often a +clerk_test one, which a Production instance cannot verify).
 */
export function productionEmailFor(input: {
  accountClass: AccountClass
  developmentEmail: string | null
  developmentEmailVerified: boolean
  override?: string | null
}): ProductionEmailResult {
  const override = input.override?.trim() || null
  if (override) {
    if (input.accountClass === 'REAL') {
      return { ok: false, reason: 'Stvarnom nalogu se mejl ne zadaje ručno: koristi se verifikovani mejl starog naloga.' }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(override) || isTestAddress(override)) {
      return { ok: false, reason: 'Zadati mejl nije ispravna adresa koja prima poštu.' }
    }
    return { ok: true, email: override.toLowerCase() }
  }
  const email = input.developmentEmail?.trim() || null
  if (!email) return { ok: false, reason: 'Stari nalog nema mejl u Clerk Development instanci.' }
  if (!input.developmentEmailVerified) return { ok: false, reason: 'Mejl starog naloga nije verifikovan.' }
  if (isTestAddress(email)) {
    return { ok: false, reason: 'Stari nalog ima probnu adresu, koja ne radi u Production instanci; zadajte adresu sa --email.' }
  }
  return { ok: true, email: email.toLowerCase() }
}
