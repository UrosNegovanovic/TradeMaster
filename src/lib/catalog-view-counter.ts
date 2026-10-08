import { prisma } from '@/lib/prisma'

/**
 * Shared-catalog open counter (ROADMAP A8). The public page loads its data from the API in the
 * browser, so link previews (WhatsApp, Viber) that only fetch HTML are not counted.
 * Best-effort: a failed count never breaks the catalog for the buyer.
 */
export async function recordCatalogView(where: { shareToken: string } | { id: string }): Promise<void> {
  try {
    await prisma.catalog.updateMany({
      where: { ...where, shareEnabled: true },
      data: { shareViewCount: { increment: 1 }, shareLastViewedAt: new Date() },
    })
  } catch (error) {
    console.error('Catalog view not counted:', error instanceof Error ? error.message : 'unknown error')
  }
}
