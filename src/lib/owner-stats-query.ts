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

  const [profiles, products, documents, issuedDocuments, sharedCatalogs, movements, payments] = await Promise.all([
    db.profile.findMany({
      where: excluded.length > 0 ? { id: { notIn: excluded } } : {},
      select: { id: true, createdAt: true, accessExpiresAt: true, companyName: true, pib: true },
    }),
    db.product.groupBy({ by: ['profileId'], where: scope, _count: { _all: true }, _max: { updatedAt: true } }),
    db.invoice.groupBy({ by: ['profileId'], where: scope, _max: { createdAt: true } }),
    db.invoice.groupBy({ by: ['profileId'], where: { ...scope, status: { not: 'DRAFT' } }, _count: { _all: true } }),
    db.catalog.groupBy({ by: ['profileId'], where: { ...scope, shareEnabled: true }, _count: { _all: true } }),
    db.stockMovement.groupBy({ by: ['profileId'], where: scope, _max: { createdAt: true } }),
    db.accessExtension.groupBy({ by: ['profileId'], where: scope, _count: { _all: true } }),
  ])

  const byProfile = <Row extends { profileId: string }>(rows: Row[]) => new Map(rows.map((row) => [row.profileId, row]))
  const productsBy = byProfile(products)
  const documentsBy = byProfile(documents)
  const issuedBy = byProfile(issuedDocuments)
  const catalogsBy = byProfile(sharedCatalogs)
  const movementsBy = byProfile(movements)
  const paymentsBy = byProfile(payments)

  const companies: OwnerStatsCompany[] = profiles.map((profile) => {
    const activity = [
      productsBy.get(profile.id)?._max.updatedAt,
      documentsBy.get(profile.id)?._max.createdAt,
      movementsBy.get(profile.id)?._max.createdAt,
    ].filter((date): date is Date => date instanceof Date)
    return {
      createdAt: profile.createdAt,
      accessExpiresAt: profile.accessExpiresAt,
      hasCompanyDetails: hasCompanyDetails(profile),
      productCount: productsBy.get(profile.id)?._count._all ?? 0,
      issuedDocumentCount: issuedBy.get(profile.id)?._count._all ?? 0,
      sharedCatalogCount: catalogsBy.get(profile.id)?._count._all ?? 0,
      lastActivityAt: activity.length > 0 ? new Date(Math.max(...activity.map((date) => date.getTime()))) : null,
      paymentCount: paymentsBy.get(profile.id)?._count._all ?? 0,
    }
  })

  return buildOwnerStats(companies, options.now)
}
