import { Badge } from '@/components/ui/badge'
import { formatAccessDate, type AccessState } from '@/lib/access-period'
import {
  ACCESS_KIND_LABELS,
  ACCESS_STATE_LABELS,
  OWNER_ACCOUNT_TAG_LABELS,
  daysLeftLabel,
  type OwnerAccount,
} from '@/lib/owner-accounts'
import { cn } from '@/lib/utils'

const STATE_BADGE: Record<AccessState, 'outline' | 'warning' | 'destructive' | 'secondary'> = {
  unlimited: 'outline',
  active: 'outline',
  expiring: 'warning',
  grace: 'destructive',
  expired: 'secondary',
}

export function AccountName({ account }: { account: OwnerAccount }) {
  return (
    <>
      {account.companyName?.trim() || '(bez naziva)'}
      {account.tag ? (
        <Badge variant="secondary" className="ml-2 align-middle font-normal">
          {OWNER_ACCOUNT_TAG_LABELS[account.tag]}
        </Badge>
      ) : null}
    </>
  )
}

/** State badge, with "probni / pretplata" and the expiry day underneath. */
export function AccountAccess({ account }: { account: OwnerAccount }) {
  const { access, kind } = account
  return (
    <div>
      <Badge variant={STATE_BADGE[access.state]} className="whitespace-nowrap">
        {ACCESS_STATE_LABELS[access.state]}
      </Badge>
      {kind && access.untilYmd ? (
        <p className="mt-1 whitespace-nowrap text-xs text-muted-foreground">
          {ACCESS_KIND_LABELS[kind]} do {formatAccessDate(access.untilYmd)}
        </p>
      ) : null}
    </div>
  )
}

export function AccountDaysLeft({ account, className }: { account: OwnerAccount; className?: string }) {
  return (
    <span className={cn('whitespace-nowrap tabular-nums', account.urgent && 'font-semibold text-destructive', className)}>
      {daysLeftLabel(account.access)}
    </span>
  )
}
