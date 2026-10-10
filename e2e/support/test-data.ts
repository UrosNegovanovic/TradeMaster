import { pibProblem } from '../../src/lib/company-fields'
import { normalizeGiroAccount } from '../../src/lib/giro-account'

/**
 * Obviously fake company data that still passes the app's own checks (PIB control digit, žiro-račun
 * control number). Generated with the app's validators, never copied from a real company.
 */
export function fakePib(prefix = '10000000'): string {
  for (let digit = 0; digit <= 9; digit++) {
    const pib = `${prefix}${digit}`
    if (!pibProblem(pib)) return pib
  }
  throw new Error(`no valid PIB for prefix ${prefix}`)
}

export function fakeGiroAccount(): string {
  for (let control = 0; control <= 99; control++) {
    const account = `160-0000000000001-${String(control).padStart(2, '0')}`
    if (normalizeGiroAccount(account)) return account
  }
  throw new Error('no valid žiro-račun')
}

export const testCompany = () => ({
  companyName: 'E2E Test Veleprodaja DOO',
  address: 'Testna 1, 11000 Beograd',
  pib: fakePib(),
  registrationNumber: '99999999',
  giroAccount: fakeGiroAccount(),
  contactEmail: 'e2e@example.com',
  inVatSystem: true,
})

/** Unique per run and worker, so parallel runs never touch each other's rows. */
export function uniqueSku(label: string): string {
  return `E2E-${label}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase()
}

type Api = import('@playwright/test').APIRequestContext

/**
 * Makes sure the signed-in company can issue an invoice, without overwriting real company data:
 * the fake company is written only when PIB, MB, address or žiro-račun is missing.
 */
export async function ensureCompanyProfile(api: Api): Promise<void> {
  const response = await api.get('/api/profile')
  if (!response.ok()) throw new Error(`GET /api/profile ${response.status()}`)
  const profile = (await response.json()) as Record<string, unknown>
  const complete = ['companyName', 'pib', 'registrationNumber', 'address', 'giroAccount'].every(
    (field) => typeof profile[field] === 'string' && (profile[field] as string).trim() !== ''
  )
  if (complete) return
  const put = await api.put('/api/profile', { data: testCompany() })
  if (!put.ok()) throw new Error(`PUT /api/profile ${put.status()} ${await put.text()}`)
}
