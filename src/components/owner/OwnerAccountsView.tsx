import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  OWNER_ACCOUNT_FILTERS,
  OWNER_ACCOUNT_FILTER_LABELS,
  noticeStatusLabel,
  shownDateOnly,
  shownDay,
  type OwnerAccount,
  type OwnerAccountFilter,
} from '@/lib/owner-accounts'
import { countSr } from '@/lib/sr-format'
import { cn } from '@/lib/utils'
import { AccountAccess, AccountDaysLeft, AccountName } from './OwnerAccountBits'

export const OWNER_ACCOUNTS_PATH = '/owner/accounts'

function listHref(filter: OwnerAccountFilter, query: string): string {
  const params = new URLSearchParams()
  if (filter !== 'all') params.set('filter', filter)
  if (query) params.set('q', query)
  const search = params.toString()
  return search ? `${OWNER_ACCOUNTS_PATH}?${search}` : OWNER_ACCOUNTS_PATH
}

const accountHref = (account: OwnerAccount) => `${OWNER_ACCOUNTS_PATH}/${account.id}`

function Identity({ account }: { account: OwnerAccount }) {
  if (!account.pib && !account.signInEmail) return null
  return (
    <p className="mt-0.5 text-xs text-muted-foreground">
      {account.pib ? <span className="block">PIB {account.pib}</span> : null}
      {account.signInEmail ? <span className="block break-all">{account.signInEmail}</span> : null}
    </p>
  )
}

function LastPayment({ account }: { account: OwnerAccount }) {
  if (!account.lastPayment) return <>-</>
  return (
    <>
      {shownDateOnly(account.lastPayment.paidOn)}
      <span className="block text-xs text-muted-foreground">{account.lastPayment.reference}</span>
    </>
  )
}

function LastNotice({ account }: { account: OwnerAccount }) {
  const notice = account.lastNotice
  if (!notice) return <>-</>
  return (
    <>
      {notice.invoiceNumber ?? 'bez broja'}
      <span className={cn('block text-xs', notice.status === 'failed' ? 'font-semibold text-destructive' : 'text-muted-foreground')}>
        {noticeStatusLabel(notice)}
        {notice.sentAt ? ` ${shownDay(notice.sentAt)}` : ''}
      </span>
    </>
  )
}

export function OwnerAccountsView({
  accounts,
  counts,
  filter,
  query,
  emailsAvailable,
}: {
  accounts: OwnerAccount[]
  counts: Record<OwnerAccountFilter, number>
  filter: OwnerAccountFilter
  query: string
  emailsAvailable: boolean
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Nalozi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {countSr(counts.all, 'firma', 'firme', 'firmi')}. Vide se podaci o nalogu i brojevi, ne sadržaj firme.
        </p>
        {emailsAvailable ? null : (
          <p className="mt-2 text-sm text-destructive">
            Mejlovi za prijavu trenutno nisu učitani iz Clerk-a; pretraga radi po nazivu i PIB-u.
          </p>
        )}
      </div>

      <form action={OWNER_ACCOUNTS_PATH} method="get" className="flex flex-wrap gap-2" role="search">
        {filter !== 'all' ? <input type="hidden" name="filter" value={filter} /> : null}
        <label htmlFor="owner-accounts-q" className="sr-only">
          Pretraga po nazivu, PIB-u ili mejlu
        </label>
        <Input
          id="owner-accounts-q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Naziv, PIB ili mejl"
          className="h-11 min-w-0 flex-1 bg-card sm:max-w-sm"
        />
        <Button type="submit" className="min-h-11">
          Traži
        </Button>
        {query ? (
          <Button variant="ghost" className="min-h-11" asChild>
            <Link href={listHref(filter, '')}>Poništi</Link>
          </Button>
        ) : null}
      </form>

      <nav aria-label="Filteri" className="flex flex-wrap gap-2">
        {OWNER_ACCOUNT_FILTERS.map((item) => (
          <Link
            key={item}
            href={listHref(item, query)}
            aria-current={item === filter ? 'true' : undefined}
            className={cn(
              'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors',
              item === filter ? 'border-brand bg-brand text-white' : 'bg-card text-foreground hover:bg-brand-tint'
            )}
          >
            {OWNER_ACCOUNT_FILTER_LABELS[item]}
            <span className={cn('tabular-nums', item === filter ? 'text-white/80' : 'text-muted-foreground')}>{counts[item]}</span>
          </Link>
        ))}
      </nav>

      {accounts.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          {query ? `Nijedan nalog ne odgovara pretrazi „${query}” u ovom filteru.` : 'Nema naloga u ovom filteru.'}
        </p>
      ) : (
        <>
          {/* Phones: one card per company. */}
          <ul className="grid gap-3 md:grid-cols-2 lg:hidden">
            {accounts.map((account) => (
              <li key={account.id}>
                <Link href={accountHref(account)} className="block h-full rounded-xl border bg-card p-4 hover:border-brand">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        <AccountName account={account} />
                      </p>
                      <Identity account={account} />
                    </div>
                    <AccountDaysLeft account={account} className="text-sm" />
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <AccountAccess account={account} />
                    <p className="text-right text-xs text-muted-foreground">
                      {account.productCount} proizv. · {account.invoiceCount} fakt.
                      <span className="block">aktivnost: {account.lastActivityAt ? shownDay(account.lastActivityAt) : '-'}</span>
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden rounded-xl border bg-card lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Firma</TableHead>
                  <TableHead>Otvoren</TableHead>
                  <TableHead>Pristup</TableHead>
                  <TableHead>Dana ostalo</TableHead>
                  <TableHead>Poslednja uplata</TableHead>
                  <TableHead>Predračun</TableHead>
                  <TableHead className="text-right">Proizvodi / fakture</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="min-w-[13rem]">
                      <Link href={accountHref(account)} className="font-semibold hover:underline">
                        <AccountName account={account} />
                      </Link>
                      <Identity account={account} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{shownDay(account.createdAt)}</TableCell>
                    <TableCell>
                      <AccountAccess account={account} />
                    </TableCell>
                    <TableCell>
                      <AccountDaysLeft account={account} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <LastPayment account={account} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <LastNotice account={account} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {account.productCount} / {account.invoiceCount}
                      <span className="block text-xs text-muted-foreground">
                        aktivnost: {account.lastActivityAt ? shownDay(account.lastActivityAt) : '-'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
