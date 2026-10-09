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
