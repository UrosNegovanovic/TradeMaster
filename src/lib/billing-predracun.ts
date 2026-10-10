import { accessStatus, formatAccessDate, planAccessExtension, type AccessExtensionPlan } from '@/lib/access-period'
import type { EurRate } from '@/lib/nbs-rate'

/**
 * Automatic predračun for the TradeMaster subscription (manual billing, docs/billing-runbook.md): pure rules.
 * The owner's company (BILLING_ISSUER_PROFILE_ID) issues it from its own TradeMaster account; the daily job
 * (src/lib/billing-run.ts) sends it by e-mail. Price: 20 € + PDV per calendar month, in dinars at the NBS
 * middle rate of the day the predračun is issued.
 */

export const MONTHLY_PRICE_EUR = 20
/** Predračun goes out this many days before the expiry day (same as the in-app warning). */
export const PREDRACUN_DAYS_BEFORE = 7

/** Test and placeholder addresses never get a real e-mail (they bounce and hurt the sender reputation). */
export function isDeliverableRecipient(email: string | null | undefined): email is string {
  if (!email) return false
  const value = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false
  return !/(\+clerk_test@|@example\.(com|org|net)$|\.test$|\.invalid$|\.example$)/.test(value)
}

/**
 * Is a predračun due today? From PREDRACUN_DAYS_BEFORE days before expiry through the grace days (a missed run
 * still sends late rather than never). Not for read-only accounts: their month starts on reactivation, the owner
 * handles those by hand.
 */
export function isPredracunDue(expiresAt: Date | null | undefined, now = new Date()): boolean {
  const status = accessStatus(expiresAt, now)
  if (status.state === 'grace') return true
  return status.state === 'expiring' && (status.daysLeft ?? Infinity) <= PREDRACUN_DAYS_BEFORE
}

/** The month the predračun is for: continues the current period (as if paid today, on time). */
export function predracunPeriod(expiresAt: Date, anchorDay: number | null, now = new Date()): AccessExtensionPlan {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade' }).format(now)
  return planAccessExtension({ expiresAt, paidOn: today, anchorDay, now })
}

/** Unit price in dinars, 2 decimals (osnovica; PDV is added by the invoice like on any other line). */
export function monthlyPriceRsd(rate: EurRate): string {
  return (Math.round(MONTHLY_PRICE_EUR * rate.middle * 100) / 100).toFixed(2)
}

const rateText = (rate: EurRate) =>
  `${rate.middle.toLocaleString('sr-RS', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`

export function predracunLineName(period: Pick<AccessExtensionPlan, 'fromYmd' | 'untilYmd'>): string {
  return `TradeMaster pretplata, 1 mesec (od ${formatAccessDate(period.fromYmd)} do ${formatAccessDate(period.untilYmd)})`
}

export function predracunNote(rate: EurRate): string {
  const list = rate.listNumber ? `, kursna lista br. ${rate.listNumber}` : ''
  return [
    `Cena: ${MONTHLY_PRICE_EUR} € + PDV mesečno, preračunato po srednjem kursu NBS ${rateText(rate)} RSD za 1 EUR na dan ${formatAccessDate(rate.date)}${list}.`,
    'Poziv na broj: broj ovog predračuna.',
    'Pristup se produžava posle provere uplate, najkasnije narednog radnog dana od dana kada uplata stigne.',
  ].join(' ')
}

const rsd = (value: string | number) =>
  `${Number(value).toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RSD`

export type PredracunEmailInput = {
  buyerName: string
  invoiceNumber: string
  /** Current expiry day (YYYY-MM-DD): also the payment deadline. */
  expiryYmd: string
  period: Pick<AccessExtensionPlan, 'fromYmd' | 'untilYmd'>
  totalAmount: string | number
  vatAmount: string | number
  rate: EurRate
  issuer: { companyName: string; pib: string | null; giroAccount: string | null }
  /** Public predračun page with the IPS QR code and PDF. */
  link: string
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Subject, plain text and HTML of the predračun e-mail (Serbian, "vi"). The same facts in both bodies. */
export function predracunEmail(input: PredracunEmailInput): { subject: string; text: string; html: string } {
  const until = formatAccessDate(input.expiryYmd)
  const lines = [
    'Poštovani,',
    '',
    `pristup TradeMaster-u za ${input.buyerName} važi do ${until} Za sledeći mesec (${formatAccessDate(input.period.fromYmd)} - ${formatAccessDate(input.period.untilYmd)}) šaljemo predračun ${input.invoiceNumber}.`,
    '',
    `Iznos za uplatu: ${rsd(input.totalAmount)} (${MONTHLY_PRICE_EUR} € + PDV ${rsd(input.vatAmount)}, srednji kurs NBS ${rateText(input.rate)} na dan ${formatAccessDate(input.rate.date)})`,
    `Primalac: ${input.issuer.companyName}${input.issuer.pib ? `, PIB ${input.issuer.pib}` : ''}`,
    input.issuer.giroAccount ? `Žiro-račun: ${input.issuer.giroAccount}` : null,
    `Poziv na broj: ${input.invoiceNumber}`,
    `Rok za uplatu: ${until}`,
    '',
    `Predračun sa IPS QR kodom za uplatu iz mobilnog bankarstva: ${input.link}`,
    '',
    'Pristup produžavamo kada proverimo uplatu na izvodu banke, najkasnije narednog radnog dana od dana kada uplata stigne. Posle uplate šaljemo fakturu.',
    'Ako ne želite da nastavite, ne morate ništa da radite: posle isteka podaci ostaju dostupni za pregled i izvoz.',
    '',
    'Za pitanja samo odgovorite na ovaj mejl.',
    '',
    `${input.issuer.companyName} · TradeMaster`,
  ].filter((line): line is string => line !== null)

  const text = lines.join('\n')
  const html = `<!doctype html><html lang="sr"><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#111;max-width:560px">${lines
    .map((line) => {
      if (line === '') return ''
      if (line.startsWith('Predračun sa IPS QR')) {
        return `<p><a href="${escapeHtml(input.link)}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Otvorite predračun ${escapeHtml(input.invoiceNumber)} (IPS QR)</a></p>`
      }
      return `<p style="margin:0 0 8px">${escapeHtml(line)}</p>`
    })
    .join('')}</body></html>`

  return {
    subject: `TradeMaster: predračun ${input.invoiceNumber} za pretplatu (pristup do ${until.slice(0, -1)})`,
    text,
    html,
  }
}
