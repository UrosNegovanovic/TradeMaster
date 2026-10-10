import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BackLink } from '@/components/layout/BackLink'
import { noticeStatusLabel, shownDateOnly, shownDay } from '@/lib/owner-accounts'
import type { OwnerAccountDetail } from '@/lib/owner-accounts-query'
import { cn } from '@/lib/utils'
import { AccountAccess, AccountDaysLeft, AccountName } from './OwnerAccountBits'
import { OWNER_ACCOUNTS_PATH } from './OwnerAccountsView'

const BASIS_LABELS: Record<string, string> = {
  continue: 'nastavak (plaćeno na vreme)',
  reactivate: 'ponovna aktivacija',
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{children}</dd>
    </div>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card">
      <div className="p-5 pb-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="px-5 pb-5 text-sm text-muted-foreground">{children}</p>

export function OwnerAccountDetailView({ detail }: { detail: OwnerAccountDetail }) {
  const { account, extensions, notices } = detail
  const noEmail = detail.emailsAvailable ? '-' : 'nije učitan iz Clerk-a'

  return (
    <div className="space-y-5">
      <div>
        <BackLink href={OWNER_ACCOUNTS_PATH}>Nalozi</BackLink>
        <h1 className="text-2xl font-bold">
          <AccountName account={account} />
        </h1>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
          <Fact label="PIB">{account.pib ?? '-'}</Fact>
          <Fact label="Mejl za prijavu">{account.signInEmail ?? noEmail}</Fact>
          <Fact label="Mejl firme">{detail.contactEmail ?? '-'}</Fact>
          <Fact label="Nalog otvoren">{shownDay(account.createdAt)}</Fact>
          <Fact label="Pristup">
            <AccountAccess account={account} />
          </Fact>
          <Fact label="Dana ostalo">
            <AccountDaysLeft account={account} />
          </Fact>
          <Fact label="Proizvodi / izdate fakture">
            <span className="tabular-nums">
              {account.productCount} / {account.invoiceCount}
            </span>
          </Fact>
          <Fact label="Poslednja aktivnost">{account.lastActivityAt ? shownDay(account.lastActivityAt) : '-'}</Fact>
        </dl>
        <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
          ID naloga: <span className="select-all font-mono">{account.id}</span>
        </p>
      </section>

      <Section title="Uplate i produženja" description="Svaka potvrđena uplata produžava pristup za jedan kalendarski mesec.">
        {extensions.length === 0 ? (
          <Empty>Još nema evidentiranih uplata.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evidentirano</TableHead>
                <TableHead>Uplaćeno</TableHead>
                <TableHead>Broj predračuna</TableHead>
                <TableHead>Plaćeni period</TableHead>
                <TableHead>Osnov</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extensions.map((extension) => (
                <TableRow key={extension.id}>
                  <TableCell className="whitespace-nowrap">{shownDay(extension.createdAt)}</TableCell>
                  <TableCell className="whitespace-nowrap">{shownDateOnly(extension.paidOn)}</TableCell>
                  <TableCell className="whitespace-nowrap">{extension.reference}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {shownDateOnly(extension.periodFrom)} - {shownDateOnly(extension.periodUntil)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{BASIS_LABELS[extension.basis] ?? extension.basis}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title="Automatski predračuni" description="Predračuni za pretplatu koje je sistem napravio za ovu firmu.">
        {notices.length === 0 ? (
          <Empty>Još nije napravljen nijedan predračun.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Napravljen</TableHead>
                <TableHead>Broj</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Primalac</TableHead>
                <TableHead className="text-right">Pokušaja</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notices.map((notice) => (
                <TableRow key={notice.id}>
                  <TableCell className="whitespace-nowrap">{shownDay(notice.createdAt)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {notice.invoiceNumber ?? '-'}
                    {notice.isTest ? (
                      <Badge variant="secondary" className="ml-2 font-normal">
                        test
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {shownDateOnly(notice.periodFrom)} - {shownDateOnly(notice.periodUntil)}
                  </TableCell>
                  <TableCell className="min-w-[14rem]">
                    <span className={cn('whitespace-nowrap', notice.status === 'failed' && 'font-semibold text-destructive')}>
                      {noticeStatusLabel(notice)}
                      {notice.sentAt ? ` ${shownDay(notice.sentAt)}` : ''}
                    </span>
                    {notice.error ? <span className="block max-w-xs text-xs text-muted-foreground">{notice.error}</span> : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{notice.recipient ?? '-'}</TableCell>
                  <TableCell className="text-right tabular-nums">{notice.attempts}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  )
}
