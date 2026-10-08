import { Badge } from '@/components/ui/badge'
import { SEF_STATUS_VIEW, SEF_TONE_BADGE_VARIANT, isSefStatus } from '@/lib/sef-status'

/** "SEF: Poslato / Prihvaćeno / Odbijeno / Stornirano" on the invoice and in the list (ROADMAP A3). */
export function SefStatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  if (!isSefStatus(status)) return null
  const view = SEF_STATUS_VIEW[status]
  return (
    <Badge variant={SEF_TONE_BADGE_VARIANT[view.tone]} className={className}>
      {view.label}
    </Badge>
  )
}
