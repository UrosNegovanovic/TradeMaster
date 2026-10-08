import { describe, expect, it } from 'vitest'
import { addressHasCity, digitsOnly, pibProblem, registrationNumberProblem } from './company-fields'
import { clientWriteSchema, profileSchema } from './validations'

const company = {
  companyName: 'T&G Nest',
  pib: '123124128',
  registrationNumber: '12345678',
  address: 'Kralja Petra I 10, 11000 Beograd',
  giroAccount: '160-0000045454878-79',
}

function fieldErrors(result: { success: boolean; error?: { issues: Array<{ path: (string | number)[]; message: string }> } }) {
  return Object.fromEntries((result.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]))
}

describe('field rules', () => {
  it('tells how many digits were typed and which digit is wrong', () => {
    expect(pibProblem('12312412')).toBe('PIB mora imati tačno 9 cifara (uneto: 8).')
    expect(pibProblem('123124129')).toMatch(/kontrolna/)
    expect(pibProblem('12a124128')).toBe('PIB sme da sadrži samo cifre.')
    expect(pibProblem('123124128')).toBeNull()
    expect(registrationNumberProblem('1234567')).toBe('Matični broj mora imati tačno 8 cifara (uneto: 7).')
    expect(registrationNumberProblem('12345678')).toBeNull()
  })

  it('needs the city after a comma', () => {
    expect(addressHasCity('Kralja Petra I')).toBe(false)
    expect(addressHasCity('Kralja Petra I 10,')).toBe(false)
    expect(addressHasCity('Kralja Petra I 10, 11000 Beograd')).toBe(true)
  })

  it('keeps only digits', () => {
    expect(digitsOnly('123 124-128')).toBe('123124128')
  })
})

describe('Podešavanja (profileSchema) use the SEF rules', () => {
  it('accepts a complete company', () => {
    expect(profileSchema.safeParse(company).success).toBe(true)
  })

  it('names every wrong field', () => {
    const result = profileSchema.safeParse({
      companyName: ' ',
      pib: '123124129',
      registrationNumber: '1234567',
      address: 'Kralja Petra I',
      giroAccount: '1600045454878',
    })
    expect(result.success).toBe(false)
    expect(fieldErrors(result)).toEqual({
      companyName: 'Naziv firme je obavezan.',
      pib: 'PIB nije ispravan: poslednja (kontrolna) cifra ne odgovara. Proverite PIB.',
      registrationNumber: 'Matični broj mora imati tačno 8 cifara (uneto: 7).',
      address: 'Unesite ulicu i broj, zarez, pa poštanski broj i mesto, npr. "Kralja Petra I 10, 11000 Beograd".',
      giroAccount: 'Žiro-račun nije ispravan. Unesite 18 cifara, npr. 160-0000000123456-54.',
    })
  })

  it('requires matični broj, address and žiro-račun', () => {
    const result = profileSchema.safeParse({ ...company, registrationNumber: '', address: '', giroAccount: '' })
    expect(fieldErrors(result)).toEqual({
      registrationNumber: 'Matični broj je obavezan.',
      address: 'Adresa firme je obavezna.',
      giroAccount: 'Žiro-račun je obavezan.',
    })
  })
})

describe('Kupci (clientWriteSchema) use the SEF rules', () => {
  it('allows a buyer without PIB, and a complete buyer', () => {
    expect(clientWriteSchema.safeParse({ name: 'Petar Petrović' }).success).toBe(true)
    expect(
      clientWriteSchema.safeParse({ name: 'Kupac', pib: '123456770', registrationNumber: '12345677', address: 'Zarka Koraca 1, 11000 Beograd' })
        .success
    ).toBe(true)
  })

  it('names every wrong field', () => {
    const result = clientWriteSchema.safeParse({ name: 'Kupac', pib: '123456777', registrationNumber: '123', address: 'Zarka Koraca I' })
    expect(fieldErrors(result)).toEqual({
      pib: 'PIB nije ispravan: poslednja (kontrolna) cifra ne odgovara. Proverite PIB.',
      registrationNumber: 'Matični broj mora imati tačno 8 cifara (uneto: 3).',
      address: 'Unesite ulicu i broj, zarez, pa poštanski broj i mesto, npr. "Kralja Petra I 10, 11000 Beograd".',
    })
  })

  it('a buyer with a PIB needs a matični broj, and the other way around', () => {
    expect(fieldErrors(clientWriteSchema.safeParse({ name: 'Kupac', pib: '123456770' }))).toEqual({
      registrationNumber: 'Unesite i matični broj kupca (8 cifara). Bez njega faktura ne može u SEF.',
    })
    expect(fieldErrors(clientWriteSchema.safeParse({ name: 'Kupac', registrationNumber: '12345677' }))).toEqual({
      pib: 'Unesite i PIB kupca (9 cifara).',
    })
  })
})
