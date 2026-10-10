import { formatAccessDate } from '@/lib/access-period'
import { formatLocalYmd } from '@/lib/local-date'
import type { AccessKindCounts, OwnerStats } from '@/lib/owner-stats'
import { countSr, formatPercent } from '@/lib/sr-format'
import { cn } from '@/lib/utils'

const firms = (count: number) => countSr(count, 'firma', 'firme', 'firmi')
const sumKinds = (kinds: AccessKindCounts) => kinds.trial + kinds.paid + kinds.manual
/** "12.10." for the chart axis; the full date is in the tooltip and the table. */
const shortDate = (ymd: string) => formatAccessDate(ymd).slice(0, 6)

function kindsNote(kinds: AccessKindCounts): string | undefined {
  if (sumKinds(kinds) === 0) return undefined
  const parts = [`probni: ${kinds.trial}`, `pretplata: ${kinds.paid}`]
  if (kinds.manual > 0) parts.push(`ručno produženo: ${kinds.manual}`)
  return parts.join(', ')
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function StatTile({ label, value, note, hero = false }: { label: string; value: string; note?: string; hero?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('mt-1 font-semibold text-foreground', hero ? 'text-5xl' : 'text-3xl')}>{value}</p>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  )
}

/** One row of a bar list: the label and value are text, the bar only shows the share of `total`. */
function BarRow({ label, value, total, note }: { label: string; value: number; total: number; note?: string }) {
  const share = total > 0 ? (value / total) * 100 : 0
  return (
    <li className="group">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-foreground">{label}</span>
        <span className="whitespace-nowrap text-sm tabular-nums text-foreground">
          <span className="font-semibold">{value}</span>
          {total > 0 ? <span className="ml-2 text-muted-foreground">{formatPercent(Math.round(share))}</span> : null}
        </span>
      </div>
      <div className="mt-1.5 h-2 rounded-r bg-brand-tint" aria-hidden>
        <div className="h-2 rounded-r bg-brand-mid transition-colors group-hover:bg-brand" style={{ width: `${share}%` }} />
      </div>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
    </li>
  )
}

function NewCompaniesChart({ weeks }: { weeks: OwnerStats['newByWeek'] }) {
  const max = Math.max(...weeks.map((week) => week.count))
  if (max === 0) {
    return <p className="text-sm text-muted-foreground">U poslednjih 12 nedelja nije otvorena nijedna firma.</p>
  }
  const last = weeks.length - 1

  return (
    <>
      <ul className="flex h-44 items-stretch gap-0.5 border-b border-border pt-6" aria-label="Nove firme po nedelji">
        {weeks.map((week, index) => {
          const height = (week.count / max) * 100
          // Only the peak and the current week carry a number; the rest is in the tooltip and the table.
          const labeled = week.count > 0 && (week.count === max || index === last)
          return (
            <li
              key={week.weekStartYmd}
              tabIndex={0}
              aria-label={`Nedelja od ${formatAccessDate(week.weekStartYmd)}: ${firms(week.count)}`}
              className="group relative flex min-w-0 flex-1 items-end justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                role="tooltip"
                className={cn(
                  'pointer-events-none absolute -top-6 z-10 hidden whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background group-hover:block group-focus-visible:block',
                  index < 3 ? 'left-0' : index > last - 3 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                )}
              >
                <span className="font-semibold">{week.count}</span>
                <span className="ml-1.5 opacity-80">od {formatAccessDate(week.weekStartYmd)}</span>
              </span>
              {labeled ? (
                <span
                  className="absolute left-0 right-0 mb-1 text-center text-xs tabular-nums text-foreground"
                  style={{ bottom: `${height}%` }}
                >
                  {week.count}
                </span>
              ) : null}
              <span
                className="w-2/3 max-w-6 rounded-t bg-brand-mid transition-colors group-hover:bg-brand group-focus-visible:bg-brand"
                style={{ height: `${height}%` }}
              />
            </li>
          )
        })}
      </ul>
      <ul className="mt-1.5 flex gap-0.5" aria-hidden>
        {weeks.map((week, index) => (
          <li
            key={week.weekStartYmd}
            className={cn(
              'min-w-0 flex-1 text-center text-[10px] tabular-nums text-muted-foreground',
              // Every second label on phones, so they never collide.
              (last - index) % 2 === 1 && 'invisible sm:visible'
            )}
          >
            {shortDate(week.weekStartYmd)}
          </li>
        ))}
      </ul>
      <details className="mt-4">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm text-muted-foreground hover:text-foreground">
          Prikaži kao tabelu
        </summary>
        <table className="mt-2 w-full max-w-xs text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-1.5 font-normal">Nedelja od</th>
              <th className="py-1.5 text-right font-normal">Nove firme</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week.weekStartYmd} className="border-b last:border-0">
                <td className="py-1.5">{formatAccessDate(week.weekStartYmd)}</td>
                <td className="py-1.5 text-right tabular-nums">{week.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  )
}

export function OwnerStatsView({ stats, now = new Date() }: { stats: OwnerStats; now?: Date }) {
  const { access, activation, conversion, revenue, totalCompanies } = stats
  const expired = sumKinds(access.expired)
  const expiredNote =
    expired > 0
      ? [
          `otkazi (platili, pa prestali): ${stats.churned}`,
          `probni bez uplate: ${access.expired.trial}`,
          ...(access.expired.manual > 0 ? [`ručno produženo: ${access.expired.manual}`] : []),
        ].join(', ')
      : undefined

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Statistika</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stanje na dan {formatAccessDate(formatLocalYmd(now))} Firme vlasnika i demo nalozi se ne broje.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile hero label="Firme" value={String(totalCompanies)} note="Svi otvoreni nalozi" />
        <StatTile
          label="Mesečni prihod"
          value={`${revenue.monthlyEur} €`}
          note={`${firms(revenue.payingCompanies)} sa plaćenim periodom × ${revenue.monthlyPriceEur} €`}
        />
        <StatTile
          label="Aktivne u 7 dana"
          value={String(stats.activeCompanies.last7Days)}
          note={`U 30 dana: ${stats.activeCompanies.last30Days}`}
        />
        <StatTile
          label="Probni → plaćen"
          value={conversion.rate === null ? '-' : formatPercent(Math.round(conversion.rate * 100))}
          note={
            conversion.rate === null
              ? 'Još nijedan probni period nije završen'
              : `Platilo: ${conversion.paid}, isteklo bez uplate: ${conversion.trialLapsed}`
          }
        />
      </div>

      <Section title="Nove firme po nedelji" description="Poslednjih 12 nedelja, od ponedeljka do nedelje.">
        <NewCompaniesChart weeks={stats.newByWeek} />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Stanje pristupa" description="Svaka firma je u tačno jednom redu.">
          <ul className="space-y-4">
            <BarRow label="Probni period" value={access.active.trial} total={totalCompanies} />
            <BarRow label="Plaća" value={access.active.paid} total={totalCompanies} />
            {access.active.manual > 0 ? (
              <BarRow
                label="Ručno produženo"
                value={access.active.manual}
                total={totalCompanies}
                note="Datum pristupa promenjen bez evidentirane uplate"
              />
            ) : null}
            <BarRow
              label="Ističe za 7 dana"
              value={sumKinds(access.expiring)}
              total={totalCompanies}
              note={kindsNote(access.expiring)}
            />
            <BarRow
              label="Rok za uplatu (2 dana)"
              value={sumKinds(access.grace)}
              total={totalCompanies}
              note={kindsNote(access.grace)}
            />
            <BarRow label="Samo pregled" value={expired} total={totalCompanies} note={expiredNote} />
            <BarRow label="Bez ograničenja" value={access.unlimited} total={totalCompanies} />
          </ul>
        </Section>

        <Section title="Aktivacija" description="Koliko firmi je stiglo do kog koraka.">
          <ul className="space-y-4">
            <BarRow label="Popunjeni podaci firme (naziv i PIB)" value={activation.companyDetails} total={totalCompanies} />
            <BarRow label="Bar jedan proizvod" value={activation.product} total={totalCompanies} />
            <BarRow label="Izdata faktura ili predračun" value={activation.issuedDocument} total={totalCompanies} />
            <BarRow label="Podeljen katalog" value={activation.sharedCatalog} total={totalCompanies} />
          </ul>
        </Section>
      </div>
    </div>
  )
}
