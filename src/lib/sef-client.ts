/**
 * Thin client for the SEF public API (ROADMAP A3). Route names, the ApiKey header and the
 * response shapes come from the official Swagger "Public API V1"
 * (https://demoefaktura.mfin.gov.rs/swagger/public_v1/swagger.json, read 2026-10-08):
 * - POST /api/publicApi/sales-invoice/ubl?requestId=&sendToCir=   body: UBL XML → MiniInvoiceDto
 * - GET  /api/publicApi/sales-invoice?invoiceId=                  → SimpleSalesInvoiceDto (status, comment…)
 * - POST /api/publicApi/Company/CheckIfCompanyRegisteredOnEfaktura body: {vatNumber, registrationNumber}
 *                                                                  → {eFakturaRegisteredCompany}
 * - GET  /api/publicApi/getEfakturaVersion                        → {version} ("Proveri vezu")
 * Server-only. The API key is sent only in the ApiKey header and never logged.
 */

export const SEF_DEMO_BASE_URL = 'https://demoefaktura.mfin.gov.rs'
export const SEF_PRODUCTION_HOST = 'efaktura.mfin.gov.rs'
const SEF_DEMO_HOST = 'demoefaktura.mfin.gov.rs'
const TIMEOUT_MS = 20_000

export type SefConfig = { baseUrl: string }

/**
 * SEF_API_BASE_URL, demo by default. Production is refused unless SEF_ALLOW_PRODUCTION=on
 * (the owner switches it on after A1.1 and a demo send pass). Any other host is refused.
 */
export function sefConfig(env: NodeJS.ProcessEnv = process.env): SefConfig | null {
  const raw = env.SEF_API_BASE_URL?.trim() || SEF_DEMO_BASE_URL
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  if (url.hostname === SEF_DEMO_HOST) return { baseUrl: url.origin }
  if (url.hostname === SEF_PRODUCTION_HOST && env.SEF_ALLOW_PRODUCTION === 'on') return { baseUrl: url.origin }
  return null
}

export function isSefDemo(config: SefConfig): boolean {
  return new URL(config.baseUrl).hostname === SEF_DEMO_HOST
}

export type SefCallResult =
  | { ok: true; status: number; body: string }
  /** SEF answered with an error status; body is its error payload. */
  | { ok: false; kind: 'http'; status: number; body: string }
  /** No answer (timeout, DNS, connection reset): the request may or may not have reached SEF. */
  | { ok: false; kind: 'network' }

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>

async function call(fetchImpl: FetchLike, url: string, init: RequestInit): Promise<SefCallResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal, cache: 'no-store' })
    const body = await response.text()
    return response.ok ? { ok: true, status: response.status, body } : { ok: false, kind: 'http', status: response.status, body }
  } catch {
    return { ok: false, kind: 'network' }
  } finally {
    clearTimeout(timer)
  }
}

function headers(apiKey: string, contentType?: string): Record<string, string> {
  return { ApiKey: apiKey, Accept: 'application/json', ...(contentType ? { 'Content-Type': contentType } : {}) }
}

export function sendSalesInvoiceUbl(
  config: SefConfig,
  apiKey: string,
  input: { xml: string; requestId: string },
  fetchImpl: FetchLike = fetch
): Promise<SefCallResult> {
  const query = new URLSearchParams({ requestId: input.requestId, sendToCir: 'No' })
  return call(fetchImpl, `${config.baseUrl}/api/publicApi/sales-invoice/ubl?${query}`, {
    method: 'POST',
    headers: headers(apiKey, 'application/xml'),
    body: input.xml,
  })
}

export function getSalesInvoice(
  config: SefConfig,
  apiKey: string,
  sefInvoiceId: string,
  fetchImpl: FetchLike = fetch
): Promise<SefCallResult> {
  const query = new URLSearchParams({ invoiceId: sefInvoiceId })
  return call(fetchImpl, `${config.baseUrl}/api/publicApi/sales-invoice?${query}`, {
    method: 'GET',
    headers: headers(apiKey),
  })
}

export function checkCompanyRegistered(
  config: SefConfig,
  apiKey: string,
  company: { vatNumber: string | null; registrationNumber: string | null },
  fetchImpl: FetchLike = fetch
): Promise<SefCallResult> {
  return call(fetchImpl, `${config.baseUrl}/api/publicApi/Company/CheckIfCompanyRegisteredOnEfaktura`, {
    method: 'POST',
    headers: headers(apiKey, 'application/json'),
    body: JSON.stringify({ vatNumber: company.vatNumber, registrationNumber: company.registrationNumber }),
  })
}

export function getEfakturaVersion(config: SefConfig, apiKey: string, fetchImpl: FetchLike = fetch): Promise<SefCallResult> {
  return call(fetchImpl, `${config.baseUrl}/api/publicApi/getEfakturaVersion`, {
    method: 'GET',
    headers: headers(apiKey),
  })
}

/**
 * salesInvoiceId from MiniInvoiceDto, read from the raw text so an int64 never loses precision.
 * Falls back to invoiceId (both are in the DTO).
 */
export function parseSalesInvoiceId(body: string): string | null {
  const match = /"salesInvoiceId"\s*:\s*(\d+)/i.exec(body) ?? /"invoiceId"\s*:\s*(\d+)/i.exec(body)
  return match && match[1] !== '0' ? match[1] : null
}

export type SefInvoiceSnapshot = { status: string | null; comment: string | null }

/** SimpleSalesInvoiceDto: status plus the comment that explains it (buyer, cancel or storno). */
export function parseSalesInvoice(body: string): SefInvoiceSnapshot {
  try {
    const data = JSON.parse(body) as Record<string, unknown>
    const text = (key: string) => (typeof data[key] === 'string' && (data[key] as string).trim() ? (data[key] as string).trim() : null)
    const status = text('status') ?? text('Status')
    const comment =
      status === 'Cancelled' ? text('cancelComment') : status === 'Storno' ? text('stornoComment') : text('comment')
    return { status, comment }
  } catch {
    return { status: null, comment: null }
  }
}

/** CompanyAccountOnEfAkturaDto → true / false; null when the answer cannot be read. */
export function parseCompanyRegistered(body: string): boolean | null {
  try {
    const value = (JSON.parse(body) as Record<string, unknown>).eFakturaRegisteredCompany
    return typeof value === 'boolean' ? value : null
  } catch {
    return null
  }
}
