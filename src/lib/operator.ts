/**
 * Marketing-site operator (T&G Nest). Not used on tenant invoices or catalogs.
 * Real tax data is never committed: PIB, matični broj and address come from the environment
 * (OPERATOR_PIB, OPERATOR_MB, OPERATOR_ADDRESS, server only). Legal pages read them through operatorLegal().
 */
export const operator = {
  name: 'T&G Nest',
  email: 'uros.negovanovic35@gmail.com',
  phone: '+381628372900',
  logoSrc: '/landing/tg-nest-logo.jpg',
  logoWidth: 1280,
  logoHeight: 720,
} as const

export type OperatorLegal = { pib: string | null; mb: string | null; address: string | null }

const clean = (value: string | undefined) => value?.trim() || null

/** Seller's PIB, matični broj and address from the environment; null for what is not set yet. */
export function operatorLegal(env: NodeJS.ProcessEnv = process.env): OperatorLegal {
  return { pib: clean(env.OPERATOR_PIB), mb: clean(env.OPERATOR_MB), address: clean(env.OPERATOR_ADDRESS) }
}

/** One sentence for /uslovi and /privatnost, honest about data that is not published yet. */
export function operatorLegalLine(legal: OperatorLegal): string {
  const parts = [
    legal.pib ? `PIB ${legal.pib}` : null,
    legal.mb ? `matični broj ${legal.mb}` : null,
    legal.address ? `adresa: ${legal.address}` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : 'poreski podaci i adresa biće objavljeni pre početka naplate'
}
