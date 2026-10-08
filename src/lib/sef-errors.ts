import type { SefCallResult } from '@/lib/sef-client'

/**
 * SEF answers → one Serbian sentence saying what to do, with a link to the field to fix (ROADMAP A3).
 * Codes come from the ErrorCodes enum of the official Swagger (public_v1). How SEF wraps a code in
 * its error body is not documented there, so the parser accepts the usual shapes (ProblemDetails
 * `code`, `ErrorCode`, `errorCode`, ASP.NET `errors`) and falls back to the raw text.
 */
export type SefFix = { href: string; label: string }

export type SefErrorView = {
  code: string | null
  /** One sentence for the user. */
  message: string
  fix: SefFix | null
  /** SEF's own words, shown for unknown errors so support can help. */
  detail: string | null
  /**
   * Whether SEF may have stored the invoice anyway (no answer, server error):
   * the send keeps its requestId and a retry cannot create a second invoice.
   */
  outcomeUnknown: boolean
  /** SEF already has this requestId: the invoice was sent before. */
  alreadySent: boolean
}

export type SefErrorContext = {
  invoiceId: string
  supportEmail: string
}

const SETTINGS: SefFix = { href: '/settings', label: 'Otvori Podešavanja' }

type Rule = { codes: string[]; message: string; fix: (ctx: SefErrorContext) => SefFix | null }

// Buyers are edited on Kupci; the invoice keeps its own snapshot, so the fix is the saved buyer.
const buyerFix = (): SefFix => ({ href: '/clients', label: 'Otvori Kupce' })
const invoiceFix = (ctx: SefErrorContext): SefFix => ({ href: `/invoices/${ctx.invoiceId}/edit`, label: 'Ispravi fakturu' })

const RULES: Rule[] = [
  {
    codes: [
      'ReceiverCompanyNotFound',
      'CompanyWithVATRegistrationCodeNotFound',
      'CompanyNotFound',
      'UBLReceiverCompanyIdentifierMissing',
      'ReceiverCompanyEndpointIdentifierMissing',
      'InvoiceReceiverMissing',
    ],
    message: 'Kupac nije registrovan u SEF-u ili je PIB kupca na fakturi pogrešan. Proverite PIB na fakturi; ako je tačan, kupac treba da se registruje na SEF-u.',
    fix: invoiceFix,
  },
  {
    codes: ['VATNumberNotActive', 'InvalidVatNumber', 'UBLVatRegistrationCodeDoesNotHaveGoodLength', 'VATRegistrationCodeLengthInvalid'],
    message: 'PIB kupca nije ispravan ili nije aktivan. Ispravite PIB kupca na fakturi, pa pošaljite ponovo.',
    fix: invoiceFix,
  },
  {
    codes: [
      'CompanyWithRegistrationCodeNotFound',
      'UBLRegistrationCodeDoesNotHaveGoodLength',
      'UBLRegistrationCodeNotInCorrectFormat',
      'EInvoiceBuyerRegNumberMissing',
      'UBLVatRegistrationCodesDoesNotMatch',
    ],
    message: 'Matični broj kupca ne odgovara njegovom PIB-u. Ispravite matični broj kod kupca.',
    fix: buyerFix,
  },
  {
    codes: [
      'SenderCompanyNotFound',
      'InvalidSenderCompany',
      'UBLSenderCompanyAndSenderCompanyIdentiferDoNotMatch',
      'EInvoiceSellerRegNumberNotTheSame',
      'EInvoiceSellerNameNotTheSame',
      'EInvoiceSellerRegNumberMissing',
    ],
    message: 'PIB ili matični broj vaše firme ne odgovara SEF nalogu kome pripada API ključ. Proverite ih u Podešavanjima.',
    fix: () => SETTINGS,
  },
  {
    codes: ['MissingIban', 'BankAccountIncorrect', 'IbanInvalid', 'UBLPayeeFinancialAccountIdNotDefined', 'UBLPaymentMeansNotDefined'],
    message: 'Žiro-račun firme nije ispravan. Ispravite ga u Podešavanjima.',
    fix: () => SETTINGS,
  },
  {
    codes: ['InvoiceNumberNotUnique', 'EInvoiceNumberDublicate', 'EInvoiceGlobalIdDublicate', 'InvoiceAlreadySent'],
    message: 'Faktura sa ovim brojem već postoji u SEF-u. Proverite na SEF portalu da li je već poslata, pre nego što pošaljete novu.',
    fix: invoiceFix,
  },
  {
    codes: ['IssueDateCannotBeDifferentFromTodays', 'InvoiceDateLaterThanToday'],
    message: 'SEF prima ovu fakturu samo sa današnjim datumom izdavanja. Pošaljite je u SEF istog dana kada je izdate.',
    fix: invoiceFix,
  },
  {
    codes: ['InvoiceDueDateMissing', 'UBLDueDateIsMissing', 'PaymentDateMoreThan90DaysInFuture'],
    message: 'Rok plaćanja nije prihvaćen (SEF traži rok do 90 dana). Ispravite rok na fakturi.',
    fix: invoiceFix,
  },
  {
    codes: ['UBLIncorrectVatRateForStandardVatRate', 'InvoiceRowVatRateNotAllowedForVatCategory', 'UBLTaxCategoryPercentNotAllowed', 'VATCategoryNotAllowed'],
    message: 'Stopa PDV-a na nekoj stavci ne odgovara kategoriji PDV-a. Proverite stope na stavkama i PDV status firme u Podešavanjima.',
    fix: invoiceFix,
  },
]

const KNOWN = new Map<string, Rule>(RULES.flatMap((rule) => rule.codes.map((code) => [code, rule] as const)))

/** Pulls an error code and SEF's message out of an error body, whatever its shape. */
export function parseSefErrorBody(body: string): { code: string | null; detail: string | null } {
  const trimmed = body.trim()
  if (!trimmed) return { code: null, detail: null }
  try {
    const data = JSON.parse(trimmed) as Record<string, unknown>
    const pick = (...keys: string[]) => {
      for (const key of keys) {
        const value = data[key]
        if (typeof value === 'string' && value.trim()) return value.trim()
      }
      return null
    }
    let code = pick('code', 'ErrorCode', 'errorCode', 'Code')
    let detail = pick('detail', 'Message', 'message', 'ErrorMessage', 'errorMessage', 'title')
    if (data.errors && typeof data.errors === 'object') {
      const messages = Object.values(data.errors as Record<string, unknown>).flat().filter((m): m is string => typeof m === 'string')
      if (messages.length && !detail) detail = messages.join(' ')
      code = code ?? messages.map((m) => m.match(/\b[A-Z][A-Za-z]+\b/g)?.find((word) => KNOWN.has(word))).find(Boolean) ?? null
    }
    if (!code && detail) code = detail.match(/\b[A-Z][A-Za-z]+\b/g)?.find((word) => KNOWN.has(word) || word === DUPLICATE_REQUEST) ?? null
    return { code, detail }
  } catch {
    const code = trimmed.match(/\b[A-Z][A-Za-z]+\b/g)?.find((word) => KNOWN.has(word) || word === DUPLICATE_REQUEST) ?? null
    return { code, detail: trimmed.slice(0, 500) }
  }
}

const DUPLICATE_REQUEST = 'UBLUploadRequestIdDuplicate'

export function sefErrorView(result: Exclude<SefCallResult, { ok: true }>, ctx: SefErrorContext): SefErrorView {
  const base = { code: null, fix: null, detail: null, outcomeUnknown: false, alreadySent: false }
  if (result.kind === 'network') {
    return {
      ...base,
      message: 'SEF nije odgovorio. Pokušajte ponovo za minut; faktura se neće poslati dvaput.',
      outcomeUnknown: true,
    }
  }
  if (result.status === 401 || result.status === 403) {
    return {
      ...base,
      code: result.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
      message: 'SEF nije prihvatio API ključ. Unesite važeći ključ sa SEF portala u Podešavanjima.',
      fix: SETTINGS,
    }
  }
  if (result.status === 429 || result.status >= 500) {
    return {
      ...base,
      code: `HTTP_${result.status}`,
      message: 'SEF je trenutno nedostupan. Pokušajte ponovo malo kasnije; faktura se neće poslati dvaput.',
      outcomeUnknown: true,
    }
  }
  const { code, detail } = parseSefErrorBody(result.body)
  if (code === DUPLICATE_REQUEST) {
    return { ...base, code, message: 'SEF već ima ovu fakturu iz ranijeg slanja.', alreadySent: true }
  }
  const rule = code ? KNOWN.get(code) : undefined
  if (rule) return { ...base, code, message: rule.message, fix: rule.fix(ctx), detail }
  return {
    ...base,
    code,
    message: `SEF je odbio fakturu: ${detail ?? `greška ${result.status}`}. Ako ne znate šta da ispravite, pišite nam na ${ctx.supportEmail}.`,
    detail,
  }
}
