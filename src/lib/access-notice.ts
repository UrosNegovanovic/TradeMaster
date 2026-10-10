import { ACCESS_GRACE_DAYS, accessStatus, formatAccessDate, formatDaysLeft, isTrialPeriod, type AccessState } from '@/lib/access-period'
import { MONTHLY_PRICE } from '@/lib/landing-copy'

/** Text of the billing notice (banner on every page and Podešavanja → Pristup). Null when nothing to say. */
export type AccessNotice = {
  state: AccessState
  tone: 'warning' | 'danger'
  title: string
  detail: string
  action: string
}

export function accessNotice(
  expiresAt: Date | string | null | undefined,
  createdAt?: Date | string | null,
  now = new Date()
): AccessNotice | null {
  const status = accessStatus(expiresAt, now)
  const trial = isTrialPeriod(createdAt, expiresAt)
  const period = trial ? 'Probni period' : 'Pretplata'
  const expired = trial ? 'je istekao' : 'je istekla'
  const until = status.untilYmd ? formatAccessDate(status.untilYmd) : ''
  const graceUntil = status.graceUntilYmd ? formatAccessDate(status.graceUntilYmd) : ''

  if (status.state === 'expiring') {
    return {
      state: status.state,
      tone: 'warning',
      title: `${period} ističe ${formatDaysLeft(status.daysLeft ?? 0)} (${until}).`,
      detail: `Za nastavak rada uplatite ${MONTHLY_PRICE} za sledeći mesec. Predračun šaljemo na mejl firme. Uplata pre isteka se nastavlja na tekući period. Posle isteka imate još ${ACCESS_GRACE_DAYS} dana za uplatu.`,
      action: 'Uplata i produženje',
    }
  }
  if (status.state === 'grace') {
    const left = status.graceDaysLeft ?? 0
    return {
      state: status.state,
      tone: 'danger',
      title: `${period} ${expired} ${until} Uplatite do ${graceUntil} (rok ističe ${left === 0 ? 'danas' : left === 1 ? 'sutra' : `za ${left} dana`}).`,
      detail: `Do tada sve radi normalno. Posle roka aplikacija prelazi u režim samo za pregled dok ne proverimo uplatu. Iznos: ${MONTHLY_PRICE} za jedan mesec. Pristup produžavamo posle provere izvoda, najkasnije narednog radnog dana od dana kada uplata stigne.`,
      action: 'Kako da platim',
    }
  }
  if (status.state === 'expired') {
    return {
      state: status.state,
      tone: 'danger',
      title: `${period} ${expired} ${until} Rok za uplatu je prošao ${graceUntil} Aplikacija je u režimu samo za pregled.`,
      detail: 'Podaci su vidljivi i mogu da se izvezu, a linkovi kupcima i dalje rade. Dodavanje i izmene ponovo rade kada proverimo uplatu, najkasnije narednog radnog dana od dana kada uplata stigne.',
      action: 'Uplatite i nastavite',
    }
  }
  return null
}
