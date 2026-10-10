import { accessStatus, formatAccessDate, planAccessExtension, type AccessExtensionPlan } from '@/lib/access-period'
import type { EurRate } from '@/lib/nbs-rate'

/**
 * Automatic predračun for the TradeMaster subscription (manual billing, docs/billing-runbook.md): pure rules.
 * The owner's company (BILLING_ISSUER_PROFILE_ID) issues it from its own TradeMaster account; the daily job
 * (src/lib/billing-run.ts) sends it by e-mail. Price: 20 € per calendar month, in dinars at the NBS middle rate of
 * the day the predračun is issued. PDV depends only on the ISSUER's Profile.inVatSystem (now false: paušalac),
 * never on the paying company's own PDV setting: that belongs to the company's own invoices (A), not to this (B).
 */

/** First words of the note and the e-mail on a `billing:send --test` predračun. */
export const TEST_MARK = 'TEST, ne plaćati.'
export const NOT_IN_VAT_NOTE = 'Obveznik nije u sistemu PDV-a.'

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

export type BillingIssuer = { companyName: string; pib: string | null; giroAccount: string | null; inVatSystem: boolean }

/** Who issues it and that it is not a document of the buyer's own business (owner requirement, A vs B). */
export function subscriptionDisclaimer(issuerName: string): string {
  return `Predračun za korišćenje aplikacije TradeMaster, izdavalac ${issuerName}. Nije dokument iz vašeg poslovanja.`
}

export function predracunNote(rate: EurRate, issuer: Pick<BillingIssuer, 'companyName' | 'inVatSystem'>, test = false): string {
  const list = rate.listNumber ? `, kursna lista br. ${rate.listNumber}` : ''
  return [
    test ? TEST_MARK : null,
    subscriptionDisclaimer(issuer.companyName),
    `Cena: ${MONTHLY_PRICE_EUR} €${issuer.inVatSystem ? ' + PDV' : ''} mesečno, preračunato po srednjem kursu NBS ${rateText(rate)} RSD za 1 EUR na dan ${formatAccessDate(rate.date)}${list}.`,
    issuer.inVatSystem ? null : NOT_IN_VAT_NOTE,
    'Poziv na broj: broj ovog predračuna.',
    'Pristup se produžava posle provere uplate, najkasnije narednog radnog dana od dana kada uplata stigne.',
  ]
    .filter(Boolean)
    .join(' ')
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
  issuer: BillingIssuer
  /** Public predračun page with the IPS QR code and PDF. */
  link: string
  /** `billing:send --test`: marked "TEST, ne plaćati" in the subject and the first line. */
  test?: boolean
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Subject, plain text and HTML of the predračun e-mail (Serbian, "vi"). The same facts in both bodies. */
export function predracunEmail(input: PredracunEmailInput): { subject: string; text: string; html: string } {
  const until = formatAccessDate(input.expiryYmd)
  const amount = input.issuer.inVatSystem
    ? `${rsd(input.totalAmount)} (${MONTHLY_PRICE_EUR} € + PDV ${rsd(input.vatAmount)}, srednji kurs NBS ${rateText(input.rate)} na dan ${formatAccessDate(input.rate.date)})`
    : `${rsd(input.totalAmount)} (${MONTHLY_PRICE_EUR} €, srednji kurs NBS ${rateText(input.rate)} na dan ${formatAccessDate(input.rate.date)}; obveznik nije u sistemu PDV-a)`
  const lines = [
    input.test ? `${TEST_MARK} Ovaj mejl je probni i ide samo vlasniku.` : null,
    input.test ? '' : null,
    'Poštovani,',
    '',
    `pristup TradeMaster-u za ${input.buyerName} važi do ${until} Za sledeći mesec (${formatAccessDate(input.period.fromYmd)} - ${formatAccessDate(input.period.untilYmd)}) šaljemo predračun ${input.invoiceNumber}.`,
    '',
    subscriptionDisclaimer(input.issuer.companyName),
    '',
    `Iznos za uplatu: ${amount}`,
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
    subject: `${input.test ? '[TEST, ne plaćati] ' : ''}TradeMaster: predračun ${input.invoiceNumber} za korišćenje aplikacije (pristup do ${until.slice(0, -1)})`,
    text,
    html,
  }
}

/**
 * Where e-mails go:
 * - dry: nothing is written or sent (preview);
 * - customer: the company's e-mail (BILLING_AUTO_SEND=on), with the owner's copy;
 * - owner: only the owner (BILLING_AUTO_SEND off), who forwards it; the customer gets nothing;
 * - test: `billing:send --test`, one company, only the given address, marked "TEST, ne plaćati", never counted as
 *   the real predračun for that month.
 */
export type BillingDelivery =
  | { kind: 'dry' }
  | { kind: 'customer' }
  | { kind: 'owner'; to: string }
  | { kind: 'test'; to: string }

/** The switch: customers get e-mail only with BILLING_AUTO_SEND=on; otherwise only the owner, or nobody. */
export function chooseDelivery(input: {
  autoSend: string | undefined
  ownerAddresses: string[]
  test?: { only?: string; to?: string }
}): BillingDelivery {
  if (input.test) {
    if (!input.test.only || !isDeliverableRecipient(input.test.to)) {
      throw new Error('--test radi samo uz --only <PIB> i --to <mejl>.')
    }
    return { kind: 'test', to: input.test.to.trim() }
  }
  if (input.autoSend === 'on') return { kind: 'customer' }
  const owner = input.ownerAddresses.find((address) => isDeliverableRecipient(address))
  return owner ? { kind: 'owner', to: owner } : { kind: 'dry' }
}
