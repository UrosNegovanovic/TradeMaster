/**
 * NBS middle EUR rate for the predračun amount (uslovi: "u dinarima po kursu NBS na dan izdavanja predračuna").
 * Source: kurs.resenje.org, a public JSON mirror of the official NBS exchange list (the NBS web service needs
 * a registered SOAP account). Fixed URL, never user input. A missing or implausible rate throws, so no
 * predračun is ever issued with a wrong amount.
 */

export const NBS_RATE_URL = 'https://kurs.resenje.org/api/v1/currencies/eur/rates/today'

export type EurRate = {
  /** Middle rate, RSD for 1 EUR. */
  middle: number
  /** Day of the exchange list, YYYY-MM-DD. */
  date: string
  /** NBS exchange list number. */
  listNumber: number | null
}

/** EUR/RSD has stayed around 117 for years; anything far outside means a broken answer, not a real rate. */
const PLAUSIBLE = { min: 100, max: 150 }

export function parseEurRate(body: unknown): EurRate {
  const data = (body ?? {}) as Record<string, unknown>
  const middle = Number(data.exchange_middle)
  const date = typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? data.date : null
  if (data.code !== 'EUR' || !date || !Number.isFinite(middle) || middle < PLAUSIBLE.min || middle > PLAUSIBLE.max) {
    throw new Error('Kurs NBS nije dostupan ili nije ispravan.')
  }
  const listNumber = Number.isInteger(data.number) ? (data.number as number) : null
  return { middle, date, listNumber }
}

export async function fetchEurRate(fetchImpl: typeof fetch = fetch): Promise<EurRate> {
  const response = await fetchImpl(NBS_RATE_URL, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Kurs NBS nije dostupan (HTTP ${response.status}).`)
  return parseEurRate(await response.json())
}
