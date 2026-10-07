import { formatDashboardDate, formatDashboardTime } from '@/lib/dashboard-activity'

/** "Link još niko nije otvorio." / "Link je otvoren 3 puta, poslednji put 07.10.2026. u 14:05." */
export function formatCatalogViews(count: number, lastViewedAt: Date | string | null | undefined): string {
  if (!count || count < 1) return 'Link još niko nije otvorio.'
  const times = count % 10 === 1 && count % 100 !== 11 ? 'put' : 'puta'
  const last = lastViewedAt
    ? `, poslednji put ${formatDashboardDate(lastViewedAt)} u ${formatDashboardTime(lastViewedAt)}`
    : ''
  return `Link je otvoren ${count} ${times}${last}.`
}
