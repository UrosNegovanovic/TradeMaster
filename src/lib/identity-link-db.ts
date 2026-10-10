import { Prisma, type PrismaClient } from '@prisma/client'
import type { AccountClass } from '@/lib/identity-link'

/**
 * Clerk Development → Production cutover (ROADMAP A0.3): the only writes that may change Profile.clerkUserId.
 * Every swap is "only while it is still the old value" and happens in one transaction with its link row, so
 * a half-applied state cannot exist and every step can be repeated or undone:
 *   registerLinks → attachProductionUser → applyLink → (revertLink)
 */

export type IdentityLinkErrorCode =
  | 'not_registered'
  | 'changed'
  | 'no_production_user'
  | 'production_user_taken'
  | 'not_linked'

export class IdentityLinkError extends Error {
  constructor(
    message: string,
    readonly code: IdentityLinkErrorCode
  ) {
    super(message)
  }
}

export type LinkRegistration = { profileId: string; oldClerkUserId: string; accountClass: AccountClass }

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'

/**
 * Records the owner's approval: one PENDING row per profile. All or nothing. A profile that already has a
 * row is left as it is; a profile whose Clerk id is no longer the approved one stops the whole registration.
 */
export async function registerLinks(
  db: PrismaClient,
  registrations: LinkRegistration[],
  approvedBy: string
): Promise<{ created: number; existing: number }> {
  const approver = approvedBy.trim()
  if (!approver) throw new Error('Navedite ko je odobrio spisak (--approved-by).')

  return db.$transaction(async (tx) => {
    let created = 0
    let existing = 0
    for (const registration of registrations) {
      const link = await tx.clerkIdentityLink.findUnique({ where: { profileId: registration.profileId } })
      if (link) {
        if (link.oldClerkUserId !== registration.oldClerkUserId) {
          throw new IdentityLinkError(`Profil ${registration.profileId} je već registrovan sa drugim starim Clerk id-jem.`, 'changed')
        }
        existing += 1
        continue
      }
      const profile = await tx.profile.findUnique({ where: { id: registration.profileId }, select: { clerkUserId: true } })
      if (!profile || profile.clerkUserId !== registration.oldClerkUserId) {
        throw new IdentityLinkError(`Profil ${registration.profileId} ne postoji ili mu se Clerk id promenio posle popisa.`, 'changed')
      }
      await tx.clerkIdentityLink.create({
        data: {
          profileId: registration.profileId,
          oldClerkUserId: registration.oldClerkUserId,
          accountClass: registration.accountClass,
          approvedBy: approver,
        },
      })
      created += 1
    }
    return { created, existing }
  })
}

/**
 * Writes the production Clerk id next to an approved row. Refused when that production user already owns a
 * company (they signed up on production themselves: that case needs the owner's confirmation, not this script)
 * or is already attached to another profile.
 */
export async function attachProductionUser(db: PrismaClient, profileId: string, newClerkUserId: string): Promise<void> {
  const link = await db.clerkIdentityLink.findUnique({ where: { profileId } })
  if (!link) throw new IdentityLinkError(`Profil ${profileId} nije na odobrenom spisku.`, 'not_registered')
  if (link.newClerkUserId === newClerkUserId) return
  if (link.status === 'LINKED') {
    throw new IdentityLinkError(`Profil ${profileId} je već povezan; novi id se ne menja posle povezivanja.`, 'changed')
  }
  const owner = await db.profile.findUnique({ where: { clerkUserId: newClerkUserId }, select: { id: true } })
  if (owner) {
    throw new IdentityLinkError(
      `Production korisnik ${newClerkUserId} već ima firmu (${owner.id}); to rešava vlasnik ručno, uz potvrdu identiteta.`,
      'production_user_taken'
    )
  }
  try {
    await db.clerkIdentityLink.update({ where: { profileId }, data: { newClerkUserId } })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new IdentityLinkError(`Production korisnik ${newClerkUserId} je već vezan za drugi profil.`, 'production_user_taken')
    }
    throw error
  }
}

/**
 * Hands the profile to its production identity. Safe to repeat: an already linked profile is left alone.
 * Nothing but Profile.clerkUserId changes; every row of the company stays on the same profile id.
 */
export async function applyLink(db: PrismaClient, profileId: string): Promise<'linked' | 'already_linked'> {
  try {
    return await db.$transaction(async (tx) => {
      const link = await tx.clerkIdentityLink.findUnique({ where: { profileId } })
      if (!link) throw new IdentityLinkError(`Profil ${profileId} nije na odobrenom spisku.`, 'not_registered')
      if (!link.newClerkUserId) {
        throw new IdentityLinkError(`Profil ${profileId} još nema Production korisnika.`, 'no_production_user')
      }
      const profile = await tx.profile.findUnique({ where: { id: profileId }, select: { clerkUserId: true } })
      if (link.status === 'LINKED' && profile?.clerkUserId === link.newClerkUserId) return 'already_linked' as const

      // Only while the profile still has the id the owner approved (no parallel or manual change in between).
      const swapped = await tx.profile.updateMany({
        where: { id: profileId, clerkUserId: link.oldClerkUserId },
        data: { clerkUserId: link.newClerkUserId },
      })
      if (swapped.count !== 1) {
        throw new IdentityLinkError(`Clerk id profila ${profileId} više nije onaj sa odobrenog spiska; ništa nije promenjeno.`, 'changed')
      }
      await tx.clerkIdentityLink.update({
        where: { profileId },
        data: { status: 'LINKED', linkedAt: new Date(), revertedAt: null },
      })
      return 'linked' as const
    })
  } catch (error) {
    // Profile.clerkUserId is unique: the production user got a company of their own in the meantime.
    if (isUniqueViolation(error)) {
      throw new IdentityLinkError(`Production korisnik za profil ${profileId} već ima drugu firmu; ništa nije promenjeno.`, 'production_user_taken')
    }
    throw error
  }
}

/** Puts the Development id back (rollback, A0.10). Only for a linked profile that still has the production id. */
export async function revertLink(db: PrismaClient, profileId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const link = await tx.clerkIdentityLink.findUnique({ where: { profileId } })
    if (!link) throw new IdentityLinkError(`Profil ${profileId} nije na odobrenom spisku.`, 'not_registered')
    if (link.status !== 'LINKED' || !link.newClerkUserId) {
      throw new IdentityLinkError(`Profil ${profileId} nije povezan, nema šta da se vrati.`, 'not_linked')
    }
    const swapped = await tx.profile.updateMany({
      where: { id: profileId, clerkUserId: link.newClerkUserId },
      data: { clerkUserId: link.oldClerkUserId },
    })
    if (swapped.count !== 1) {
      throw new IdentityLinkError(`Clerk id profila ${profileId} nije onaj koji je veza upisala; ništa nije promenjeno.`, 'changed')
    }
    await tx.clerkIdentityLink.update({ where: { profileId }, data: { status: 'REVERTED', revertedAt: new Date() } })
  })
}
