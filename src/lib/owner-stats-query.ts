import type { PrismaClient } from '@prisma/client'
import { hasCompanyDetails } from '@/lib/onboarding'
import { buildOwnerStats, type OwnerStats, type OwnerStatsCompany } from '@/lib/owner-stats'

/**
 * Reads what the owner statistics need (ROADMAP O2). Read-only. One slim row per company plus per-company
 * counts and latest dates that the database computes (`groupBy`); no product, invoice or stock movement row is
 * loaded. `excludeProfileIds` are the owner's own and demo profiles (`nonCustomerProfileIds`).
 */
export async function loadOwnerStats(
  db: PrismaClient,
  options: { excludeProfileIds?: string[]; now?: Date } = {}
): Promise<OwnerStats> {
  const excluded = options.excludeProfileIds ?? []
  const scope = excluded.length > 0 ? { profileId: { notIn: excluded } } : {}

  const [profiles, products, issuedDocuments, sharedCatalogs, payments, lastActivity] = await Promise.all([
    db.profile.findMany({
      where: excluded.length > 0 ? { id: { notIn: excluded } } : {},
      select: { id: true, createdAt: true, accessExpiresAt: true, companyName: true, pib: true },
    }),
    db.product.groupBy({ by: ['profileId'], where: scope, _count: { _all: true } }),
    db.invoice.groupBy({ by: ['profileId'], where: { ...scope, status: { not: 'DRAFT' } }, _count: { _all: true } }),
    db.catalog.groupBy({ by: ['profileId'], where: { ...scope, shareEnabled: true }, _count: { _all: true } }),
    db.accessExtension.groupBy({ by: ['profileId'], where: scope, _count: { _all: true } }),
    loadLastActivityByProfile(db, scope),
  ])

  const byProfile = <Row extends { profileId: string }>(rows: Row[]) => new Map(rows.map((row) => [row.profileId, row]))
  const productsBy = byProfile(products)
  const issuedBy = byProfile(issuedDocuments)
  const catalogsBy = byProfile(sharedCatalogs)
  const paymentsBy = byProfile(payments)

  const companies: OwnerStatsCompany[] = profiles.map((profile) => ({
    createdAt: profile.createdAt,
    accessExpiresAt: profile.accessExpiresAt,
    hasCompanyDetails: hasCompanyDetails(profile),
    productCount: productsBy.get(profile.id)?._count._all ?? 0,
    issuedDocumentCount: issuedBy.get(profile.id)?._count._all ?? 0,
    sharedCatalogCount: catalogsBy.get(profile.id)?._count._all ?? 0,
    lastActivityAt: lastActivity.get(profile.id) ?? null,
    paymentCount: paymentsBy.get(profile.id)?._count._all ?? 0,
  }))

  return buildOwnerStats(companies, options.now)
}

/**
 * "Last activity" of a company, the same everywhere in the owner panel: the latest write to products, invoices
 * (any document, drafts included) or stock movements. The database returns one date per company and table.
 */
export async function loadLastActivityByProfile(
  db: PrismaClient,
  scope: { profileId?: string | { notIn: string[] } } = {}
): Promise<Map<string, Date>> {
  const [products, documents, movements] = await Promise.all([
    db.product.groupBy({ by: ['profileId'], where: scope, _max: { updatedAt: true } }),
    db.invoice.groupBy({ by: ['profileId'], where: scope, _max: { createdAt: true } }),
    db.stockMovement.groupBy({ by: ['profileId'], where: scope, _max: { createdAt: true } }),
  ])
  const latest = new Map<string, Date>()
  const keep = (profileId: string, date: Date | null) => {
    const current = latest.get(profileId)
    if (date && (!current || date.getTime() > current.getTime())) latest.set(profileId, date)
  }
  for (const row of products) keep(row.profileId, row._max.updatedAt)
  for (const row of documents) keep(row.profileId, row._max.createdAt)
  for (const row of movements) keep(row.profileId, row._max.createdAt)
  return latest
}
